"""FastAPI REST routes for MuleTrace."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AccountResult, AuditLog, Decision, Run
from ..pipeline import get_neighbourhood, pipeline_state, run_pipeline
from ..schemas import (
    AccountDetail,
    AccountListItem,
    AccountListResponse,
    DecisionIn,
    DecisionOut,
    Finding,
    IngestResponse,
    LegacyNetworkResponse,
    StatsResponse,
)

router = APIRouter(prefix="/api", tags=["muletrace"])

# Project root for loading demo dataset
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"


@router.post("/upload", response_model=IngestResponse)
async def upload_dataset(
    transactions: UploadFile = File(...),
    accounts: UploadFile | None = File(None),
    db: Session = Depends(get_db),
) -> IngestResponse:
    """Upload transactions.csv and optional accounts.csv to trigger pipeline."""
    try:
        txn_bytes = await transactions.read()
        acct_bytes = await accounts.read() if accounts is not None else None
        return run_pipeline(txn_bytes, acct_bytes, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/demo/load", response_model=IngestResponse)
def load_demo_data(db: Session = Depends(get_db)) -> IngestResponse:
    """Load the pre-generated synthetic dataset from data/ directory."""
    txn_file = DATA_DIR / "transactions.csv"
    acct_file = DATA_DIR / "accounts.csv"

    if not txn_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Sample data not found in data/ directory. Run python scripts/generate_data.py first.",
        )

    try:
        with open(txn_file, "rb") as f:
            txn_bytes = f.read()

        acct_bytes = None
        if acct_file.exists():
            with open(acct_file, "rb") as f:
                acct_bytes = f.read()

        return run_pipeline(txn_bytes, acct_bytes, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load demo data: {e}") from e


@router.get("/accounts", response_model=AccountListResponse)
def list_accounts(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    min_score: int = Query(0, ge=0, le=100),
    pattern: Literal["all", "fan", "cycle", "chain", "cluster"] = Query("all"),
    status: Literal["all", "confirmed", "cleared", "unreviewed"] = Query("all"),
    search: str | None = Query(None),
    sort_by: Literal["score_desc", "score_asc", "account_id"] = Query("score_desc"),
    db: Session = Depends(get_db),
) -> AccountListResponse:
    """Query scored accounts with filtering, search, pagination, and decision status."""
    # Find latest run if none active
    run_id = pipeline_state.active_run_id
    if not run_id:
        latest_run = db.query(Run).order_by(Run.created_at.desc()).first()
        if latest_run:
            run_id = str(latest_run.id)

    query = db.query(AccountResult)
    if run_id:
        query = query.filter(AccountResult.run_id == run_id)

    if min_score > 0:
        query = query.filter(AccountResult.risk_score >= min_score)

    if search:
        query = query.filter(AccountResult.account_id.ilike(f"%{search.strip()}%"))

    results = query.all()

    # Fetch decisions for accounts
    decisions = (
        db.query(Decision)
        .filter(Decision.run_id == run_id if run_id else True)
        .order_by(Decision.created_at.desc())
        .all()
    )
    latest_decision_map: dict[str, str] = {}
    for d in decisions:
        if d.account_id not in latest_decision_map:
            latest_decision_map[d.account_id] = d.status

    # Filter in-memory for JSON pattern & review status
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

    # Sorting
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
            status=latest_decision_map.get(r.account_id),
        )
        for r in page_items
    ]

    return AccountListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/accounts/{account_id}", response_model=AccountDetail)
def get_account_detail(account_id: str, db: Session = Depends(get_db)) -> AccountDetail:
    """Retrieve full details, explainable reasons, ML features, and decision history."""
    run_id = pipeline_state.active_run_id
    query = db.query(AccountResult).filter(AccountResult.account_id == account_id)
    if run_id:
        query = query.filter(AccountResult.run_id == run_id)
    res = query.order_by(AccountResult.id.desc()).first()

    # Look up in pipeline state if not in DB
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

    # Fetch decisions
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

    # Calculate account age
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
    )


@router.post("/accounts/{account_id}/decisions", response_model=DecisionOut)
def record_decision(
    account_id: str,
    body: DecisionIn,
    db: Session = Depends(get_db),
) -> DecisionOut:
    """Submit analyst review decision (confirmed mule or cleared benign) with notes."""
    run_id = pipeline_state.active_run_id or "default"
    decision = Decision(
        run_id=run_id,
        account_id=account_id,
        status=body.status,
        note=body.note,
        analyst=body.analyst,
    )
    db.add(decision)
    db.flush()

    audit = AuditLog(
        action=f"DECISION_{body.status.upper()}",
        entity_type="ACCOUNT",
        entity_id=account_id,
        details={"note": body.note, "analyst": body.analyst, "run_id": run_id},
    )
    db.add(audit)
    db.commit()

    return DecisionOut(
        status=decision.status,
        note=decision.note,
        analyst=decision.analyst,
        timestamp=decision.created_at.isoformat() if hasattr(decision.created_at, "isoformat") else str(decision.created_at),
    )


@router.get("/graph/{account_id}", response_model=LegacyNetworkResponse)
def get_graph_neighbourhood(
    account_id: str,
    hops: int = Query(1, ge=1, le=3),
    max_nodes: int = Query(50, ge=5, le=150),
) -> NetworkResponse:
    """Extract ego-network around account_id for interactive Cytoscape.js rendering."""
    return get_neighbourhood(account_id=account_id, hops=hops, max_nodes=max_nodes)


@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)) -> StatsResponse:
    """Return dashboard analytics: total accounts, flagged count, confirmed, cleared, and precision."""
    run_id = pipeline_state.active_run_id
    if not run_id:
        latest_run = db.query(Run).order_by(Run.created_at.desc()).first()
        if latest_run:
            run_id = str(latest_run.id)

    run = db.query(Run).filter(Run.id == run_id).first() if run_id else None

    total_accts = run.acct_count if run else (len(pipeline_state.scored_accounts) if pipeline_state.scored_accounts else 0)
    flagged_cnt = run.flagged_count if run else 0

    confirmed_cnt = (
        db.query(Decision.account_id)
        .filter(Decision.status == "confirmed")
        .distinct()
        .count()
    )
    cleared_cnt = (
        db.query(Decision.account_id)
        .filter(Decision.status == "cleared")
        .distinct()
        .count()
    )

    reviewed = confirmed_cnt + cleared_cnt
    precision = (confirmed_cnt / reviewed) if reviewed > 0 else None

    # If ground_truth.json exists in data/, compute precision against ground truth
    gt_file = DATA_DIR / "ground_truth.json"
    if precision is None and gt_file.exists() and run_id:
        try:
            with open(gt_file, "r", encoding="utf-8") as f:
                gt = json.load(f)
            planted_accts = set()
            for ring in gt.get("planted_rings", []):
                planted_accts.update(ring.get("accounts", []))

            flagged_accts = {
                r.account_id
                for r in db.query(AccountResult.account_id)
                .filter(AccountResult.run_id == run_id)
                .all()
            }
            if flagged_accts:
                true_positives = len(flagged_accts.intersection(planted_accts))
                precision = round(true_positives / len(flagged_accts), 4)
        except Exception:
            pass

    return StatsResponse(
        total_accounts=total_accts,
        flagged_count=flagged_cnt,
        confirmed_count=confirmed_cnt,
        cleared_count=cleared_cnt,
        precision=precision,
        run_id=run_id,
    )


@router.get("/export/sar/{account_id}")
def export_sar(account_id: str, db: Session = Depends(get_db)) -> JSONResponse:
    """Generate regulatory Suspicious Activity Report (SAR) payload for compliance filing."""
    detail = get_account_detail(account_id, db)
    network = get_neighbourhood(account_id, hops=2, max_nodes=30)

    sar_payload = {
        "report_type": "SUSPICIOUS_ACTIVITY_REPORT_EVIDENCE",
        "entity_type": "ACCOUNT",
        "subject_account_id": account_id,
        "risk_score": detail.risk_score,
        "classification": "CONFIRMED_MONEY_MULE" if any(d.status == "confirmed" for d in detail.decisions) else "SUSPECTED_MONEY_MULE",
        "detected_patterns": detail.patterns,
        "explainable_reasons": detail.reasons,
        "findings": [f.model_dump() for f in detail.findings],
        "feature_metrics": detail.features,
        "analyst_history": [d.model_dump() for d in detail.decisions],
        "subgraph_entities": [n.model_dump() for n in network.nodes],
        "subgraph_transfers": [e.model_dump() for e in network.edges],
        "compliance_notes": "Automated behavioral graph anomaly detection report compiled by MuleTrace AML engine.",
    }
    return JSONResponse(content=sar_payload)


@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db)) -> Response:
    """Export all flagged accounts and findings as CSV."""
    run_id = pipeline_state.active_run_id
    query = db.query(AccountResult)
    if run_id:
        query = query.filter(AccountResult.run_id == run_id)
    records = query.order_by(AccountResult.risk_score.desc()).all()

    rows = []
    for r in records:
        rows.append({
            "account_id": r.account_id,
            "risk_score": r.risk_score,
            "patterns": "; ".join(r.patterns or []),
            "primary_reason": r.reasons[0] if r.reasons else "",
            "all_reasons": " | ".join(r.reasons or []),
        })

    df = pd.DataFrame(rows)
    csv_str = df.to_csv(index=False)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=muletrace_flagged_accounts.csv"},
    )
