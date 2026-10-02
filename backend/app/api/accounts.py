"""Account investigation, network exploration, and triage decision API routes."""

from __future__ import annotations

import logging
from typing import Any, Literal

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..analytics.explain import explain_account
from ..analytics.freeze_optimizer import recommend_time_expanded_freeze
from ..analytics.propagation import compute_risk_propagation
from ..analytics.taint import propagate_taint, trace_taint
from ..core.security import Role, TokenData, require_role
from ..db import get_db
from ..graph import get_ego_network
from ..models import AccountResult, AuditLog, Decision, Run
from ..pipeline import get_neighbourhood, pipeline_state
from ..schemas import (
    AccountDetail,
    AccountListItem,
    AccountListResponse,
    DecisionIn,
    DecisionOut,
    ExplainResponse,
    Finding,
    LegacyNetworkResponse,
    TaintAccountResult,
)
from dataclasses import asdict

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/accounts", tags=["accounts"])


def _mask_pii(text: str | None) -> str:
    """Mask sensitive PII fields (phones, ID hashes, addresses)."""
    if not text:
        return "N/A"
    s = str(text).strip()
    if len(s) <= 4:
        return "***"
    return f"{s[:2]}••••{s[-2:]}"


def _account_evidence(account_id: str, risk_score: int, features: dict[str, Any], patterns: list[str]) -> dict[str, Any]:
    """Build observed transaction facts without changing detector or score logic."""
    frame = pipeline_state.transactions_df
    if frame is None or "src_account" not in frame.columns:
        return {"observed": [], "inferences": [], "availability": {"device": "not available in this dataset", "ip": "not available in this dataset", "kyc": "not available in this dataset"}, "reason": "Transaction evidence is not available in this dataset."}

    account_rows = frame[(frame["src_account"].astype(str) == account_id) | (frame["dst_account"].astype(str) == account_id)].copy()
    timestamps = pd.to_datetime(account_rows["timestamp"], errors="coerce").dropna().sort_values()
    incoming = account_rows[account_rows["dst_account"].astype(str) == account_id]
    outgoing = account_rows[account_rows["src_account"].astype(str) == account_id]
    total_in = float(incoming["amount"].sum())
    total_out = float(outgoing["amount"].sum())
    relay_times = timestamps.diff().dropna().dt.total_seconds().div(60)
    pass_through = (total_out / total_in * 100) if total_in else 0.0
    transaction_ids = account_rows.get("txn_id", pd.Series(dtype=str)).astype(str).tolist()
    observed = [
        {"label": "Fan-in sender count", "value": str(incoming["src_account"].nunique()), "transaction_ids": transaction_ids},
        {"label": "Fan-out recipient count", "value": str(outgoing["dst_account"].nunique()), "transaction_ids": transaction_ids},
        {"label": "Pass-through", "value": f"{pass_through:.1f}% of amount", "transaction_ids": transaction_ids},
        {"label": "Median relay time", "value": f"{relay_times.median():.1f} minutes" if not relay_times.empty else "not available", "transaction_ids": transaction_ids},
        {"label": "First transaction", "value": timestamps.iloc[0].isoformat() if not timestamps.empty else "not available", "transaction_ids": transaction_ids},
        {"label": "Last transaction", "value": timestamps.iloc[-1].isoformat() if not timestamps.empty else "not available", "transaction_ids": transaction_ids},
        {"label": "Total in", "value": f"INR {total_in:,.2f}", "transaction_ids": transaction_ids},
        {"label": "Total out", "value": f"INR {total_out:,.2f}", "transaction_ids": transaction_ids},
    ]
    anomaly = features.get("amount_entropy", features.get("velocity_per_hour", 0.0))
    inferences = [
        {"label": "Risk score", "value": str(risk_score), "note": "Combined detector signals and configured weights."},
        {"label": "Anomaly score", "value": f"{float(anomaly):.2f}", "note": "Derived from the account's observed transaction features."},
        {"label": "Cluster membership", "value": ", ".join(patterns) if patterns else "None", "note": "Named from detector findings linked to this account."},
    ]
    reason = f"Received INR {total_in:,.0f} and sent INR {total_out:,.0f} across {len(transaction_ids)} transactions."
    return {"observed": observed, "inferences": inferences, "availability": {"device": "not available in this dataset", "ip": "not available in this dataset", "kyc": "not available in this dataset"}, "reason": reason}


@router.get("", response_model=AccountListResponse)
def list_accounts(
    run_id: str | None = Query(None),
    min_score: int = Query(0, ge=0, le=100),
    pattern: Literal["all", "fan", "cycle", "chain", "cluster", "dormancy", "community"] = Query("all"),
    status: Literal["all", "confirmed", "cleared", "unreviewed"] = Query("all"),
    q: str | None = Query(None, description="Search query by account ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    sort_by: Literal["score_desc", "score_asc", "account_id"] = Query("score_desc"),
    db: Session = Depends(get_db),
) -> AccountListResponse:
    """Query scored accounts with filtering, search, pagination, and triage review status."""
    active_run = run_id or pipeline_state.active_run_id
    if not active_run:
        latest = db.query(Run).order_by(Run.created_at.desc()).first()
        if latest:
            active_run = str(latest.id)

    query = db.query(AccountResult)
    if active_run:
        query = query.filter(AccountResult.run_id == active_run)

    if min_score > 0:
        query = query.filter(AccountResult.risk_score >= min_score)

    if q:
        query = query.filter(AccountResult.account_id.ilike(f"%{q.strip()}%"))

    results = query.all()

    # Fetch latest decision per account
    decisions = (
        db.query(Decision)
        .filter(Decision.run_id == active_run if active_run else True)
        .order_by(Decision.created_at.desc())
        .all()
    )
    latest_decision_map: dict[str, str] = {}
    for d in decisions:
        if d.account_id not in latest_decision_map:
            latest_decision_map[d.account_id] = d.status

    # Filter in-memory for pattern and status
    filtered: list[AccountResult] = []
    for r in results:
        r_patterns: list[str] = r.patterns or []
        if pattern != "all" and pattern not in r_patterns:
            continue

        acct_status = latest_decision_map.get(r.account_id, "unreviewed")
        if status != "all":
            if status == "unreviewed" and acct_status != "unreviewed":
                continue
            if status in ("confirmed", "cleared") and acct_status != status:
                continue

        filtered.append(r)

    # Sort
    if sort_by == "score_desc":
        filtered.sort(key=lambda x: (x.risk_score, x.account_id), reverse=True)
    elif sort_by == "score_asc":
        filtered.sort(key=lambda x: (x.risk_score, x.account_id))
    elif sort_by == "account_id":
        filtered.sort(key=lambda x: x.account_id)

    total = len(filtered)
    start = (page - 1) * page_size
    page_items = filtered[start : start + page_size]

    items = [
        AccountListItem(
            account_id=r.account_id,
            risk_score=r.risk_score,
            patterns=r.patterns or [],
            reason=r.reasons[0] if r.reasons else "Elevated behavioral graph anomaly score.",
            status=latest_decision_map.get(r.account_id, "unreviewed"),
        )
        for r in page_items
    ]

    return AccountListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{account_id}", response_model=AccountDetail)
def get_account_detail(account_id: str, db: Session = Depends(get_db)) -> AccountDetail:
    """Retrieve full details, evidence, masked PII attributes, and decision history."""
    run_id = pipeline_state.active_run_id
    query = db.query(AccountResult).filter(AccountResult.account_id == account_id)
    if run_id:
        query = query.filter(AccountResult.run_id == run_id)
    res = query.order_by(AccountResult.id.desc()).first()

    if not res and account_id in pipeline_state.scored_accounts:
        sc = pipeline_state.scored_accounts[account_id]
        features = pipeline_state.features.get(account_id, {})
        findings = sc.findings
        patterns = sc.patterns
        reasons = sc.reasons
        risk_score = sc.risk_score
    elif res:
        risk_score = res.risk_score
        patterns = res.patterns or []
        reasons = res.reasons or []
        findings = [Finding(**f) for f in (res.findings or [])]
        features = res.features or {}
    else:
        raise HTTPException(status_code=404, detail=f"Account '{account_id}' not found.")

    dec_records = (
        db.query(Decision)
        .filter(Decision.account_id == account_id)
        .order_by(Decision.created_at.desc())
        .all()
    )
    decisions = [
        DecisionOut(
            status=d.status,
            note=d.note,
            analyst=d.analyst,
            timestamp=d.created_at.isoformat() if hasattr(d.created_at, "isoformat") else str(d.created_at),
        )
        for d in dec_records
    ]

    age_days = None
    if pipeline_state.accounts_df is not None:
        row = pipeline_state.accounts_df[pipeline_state.accounts_df["account_id"] == account_id]
        if not row.empty:
            ref_date = pipeline_state.accounts_df["opened_date"].max()
            opened = row.iloc[0]["opened_date"]
            if pd.notna(opened):
                age_days = max(0, (ref_date - pd.to_datetime(opened)).days)

    return AccountDetail(
        account_id=account_id,
        risk_score=risk_score,
        patterns=patterns,
        reasons=reasons,
        findings=findings,
        features=features,
        decisions=decisions,
        age_days=age_days,
        evidence=_account_evidence(account_id, risk_score, features, patterns),
    )


@router.get("/{account_id}/network", response_model=LegacyNetworkResponse)
def get_account_network(
    account_id: str,
    hops: int = Query(1, ge=1, le=3),
    max_nodes: int = Query(60, ge=5, le=100),
) -> LegacyNetworkResponse:
    """Extract ego-network capping at max_nodes, prioritizing higher-risk neighbors."""
    return get_neighbourhood(account_id=account_id, hops=hops, max_nodes=max_nodes)


@router.get("/{account_id}/taint", response_model=TaintAccountResult)
def get_account_taint(account_id: str) -> TaintAccountResult:
    """Retrieve proportional haircut taint tracking metrics for an account."""
    if pipeline_state.graph is None or not pipeline_state.graph.has_node(account_id):
        return TaintAccountResult(
            account_id=account_id,
            tainted_in=0.0,
            tainted_out=0.0,
            tainted_balance_remaining=0.0,
            cashed_out=0.0,
        )

    # Use in-edges to this node as seed flow
    in_edges = list(pipeline_state.graph.in_edges(account_id, data=True))
    seeds = [
        {"src": u, "dst": account_id, "amount": float(d.get("amount", 1000.0)), "timestamp": d.get("timestamp")}
        for u, _, d in in_edges
    ]
    if not seeds:
        seeds = [{"src": "victim", "dst": account_id, "amount": 10000.0, "timestamp": None}]

    summary = propagate_taint(pipeline_state.graph, seeds)
    if account_id in summary.accounts:
        return summary.accounts[account_id]

    return TaintAccountResult(
        account_id=account_id,
        tainted_in=0.0,
        tainted_out=0.0,
        tainted_balance_remaining=0.0,
        cashed_out=0.0,
    )


@router.get("/{account_id}/trace")
def trace_account(account_id: str, rule: Literal["proportional", "fifo"] = "proportional", max_hops: int = Query(8, ge=1, le=8), decision_time: str | None = None) -> dict[str, Any]:
    """Trace the first victim transfer from an account using a selectable rule."""
    if pipeline_state.graph is None or not pipeline_state.graph.has_node(account_id):
        raise HTTPException(status_code=404, detail="Account graph is not loaded")
    outgoing = list(pipeline_state.graph.out_edges(account_id, data=True, keys=True))
    if not outgoing:
        raise HTTPException(status_code=404, detail="No victim transaction found for this account")
    src, dst, key, data = sorted(outgoing, key=lambda item: str(item[3].get("timestamp", "")))[0]
    trail = trace_taint(pipeline_state.graph, {"src": src, "dst": dst, "amount": float(data.get("amount", 0.0)), "timestamp": data.get("timestamp")}, rule=rule, max_hops=max_hops, decision_time=decision_time)
    return asdict(trail)


@router.get("/{account_id}/freeze-recommendation")
def freeze_recommendation(account_id: str, rule: Literal["proportional", "fifo"] = "proportional", decision_time: str | None = None) -> dict[str, Any]:
    """Compare a time-expanded taint cut with the top-three risk baseline."""
    trace = trace_account(account_id, rule=rule, decision_time=decision_time)
    from types import SimpleNamespace
    trail = SimpleNamespace(**trace)
    trail.edges = [SimpleNamespace(**edge) for edge in trace["edges"]]
    trail.seed_amount = trace["seed_amount"]
    scores = {aid: float(item.risk_score) for aid, item in pipeline_state.scored_accounts.items()}
    return recommend_time_expanded_freeze(trail, scores, decision_time)


@router.get("/{account_id}/explain", response_model=ExplainResponse)
def get_account_explanation(account_id: str, db: Session = Depends(get_db)) -> ExplainResponse:
    """Get SHAP top feature contributions and counterfactual sentence."""
    detail = get_account_detail(account_id, db)
    return explain_account(
        account_id=account_id,
        features_dict=detail.features,
        risk_score=detail.risk_score,
    )


@router.post("/{account_id}/decision", response_model=DecisionOut)
@router.post("/{account_id}/decisions", response_model=DecisionOut)
def record_account_decision(
    account_id: str,
    body: DecisionIn,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
) -> DecisionOut:

    """Record triage decision (confirm mule / clear benign), write audit row, and trigger PageRank re-ranking."""
    run_id = pipeline_state.active_run_id or "default"

    # Save decision
    decision = Decision(
        run_id=run_id,
        account_id=account_id,
        action="CONFIRM" if body.status == "confirmed" else "CLEAR",
        status=body.status,
        note=body.note,
        analyst=body.analyst,
        user_id=user.user_id,
    )
    db.add(decision)

    # Save audit log
    audit = AuditLog(
        action=f"DECISION_{body.status.upper()}",
        entity_type="ACCOUNT",
        entity_id=account_id,
        details={"note": body.note, "analyst": body.analyst, "run_id": run_id},
    )
    db.add(audit)
    db.flush()

    # Trigger PageRank re-ranking across active run
    if pipeline_state.graph is not None:
        confirmed = [
            d.account_id
            for d in db.query(Decision.account_id)
            .filter(Decision.status == "confirmed")
            .distinct()
            .all()
        ]
        cleared = [
            d.account_id
            for d in db.query(Decision.account_id)
            .filter(Decision.status == "cleared")
            .distinct()
            .all()
        ]

        uplifts = compute_risk_propagation(
            G=pipeline_state.graph,
            confirmed_accounts=confirmed,
            cleared_accounts=cleared,
        )

        # Update scores in DB for accounts affected
        for aid, uplift in uplifts.items():
            if uplift > 0:
                record = (
                    db.query(AccountResult)
                    .filter(AccountResult.account_id == aid, AccountResult.run_id == run_id)
                    .first()
                )
                if record:
                    # Guilt-by-association boost capped at 100
                    blended = int(round(record.risk_score * 0.8 + uplift * 0.2))
                    record.risk_score = min(100, blended)

    db.commit()

    return DecisionOut(
        status=decision.status,
        note=decision.note,
        analyst=decision.analyst,
        timestamp=decision.created_at.isoformat() if hasattr(decision.created_at, "isoformat") else str(decision.created_at),
    )
