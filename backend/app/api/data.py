"""Alerts, accounts, network, rings, and trace routes."""
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.audit import append_audit_entry
from app.core.database import get_db
from app.core.middleware import envelope
from app.core.pii import mask_account_id
from app.core.security import TokenData, get_current_user, require_role, Role
from app.engine.graph import GraphStore, _graph_cache
from app.engine.trace import trace_funds
from app.models.models import (
    Account, Alert, Ring, Signal, Transfer, TraceResult, gen_id,
)
from app.schemas.schemas import (
    AccountProfile, AlertFilter, AlertSummary, NetworkResponse,
    RevealRequest, RingSummary, SignalDetail, TraceRequest, TraceResponse,
)

router = APIRouter(tags=["data"])


# ─── Alerts ─────────────────────────────────────────────
@router.get("/alerts")
def list_alerts(
    band: str | None = None,
    status: str | None = None,
    ring_id: str | None = None,
    signal: str | None = None,
    min_score: float | None = None,
    max_score: float | None = None,
    q: str | None = None,
    sort: str = "-risk_score",
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    run_id: str | None = None,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """List alerts with filtering and pagination."""
    query = db.query(Alert)

    if run_id:
        query = query.filter(Alert.run_id == run_id)
    if band:
        query = query.filter(Alert.risk_band == band.upper())
    if status:
        query = query.filter(Alert.status == status.upper())
    if ring_id:
        query = query.filter(Alert.ring_id == ring_id)
    if min_score is not None:
        query = query.filter(Alert.risk_score >= min_score)
    if max_score is not None:
        query = query.filter(Alert.risk_score <= max_score)
    if q:
        query = query.filter(Alert.account_id.contains(q.upper()))

    # Sorting
    if sort.startswith("-"):
        sort_col = getattr(Alert, sort[1:], Alert.risk_score)
        query = query.order_by(sort_col.desc())
    else:
        sort_col = getattr(Alert, sort, Alert.risk_score)
        query = query.order_by(sort_col.asc())

    # Cursor pagination
    if cursor:
        query = query.filter(Alert.id > cursor)

    total = query.count()
    alerts = query.limit(limit).all()

    results = []
    for alert in alerts:
        signals = db.query(Signal).filter(Signal.alert_id == alert.id).all()
        signal_details = [
            SignalDetail(
                signal_type=s.signal_type,
                weight=s.weight or 0,
                raw_value=s.raw_value or 0,
                weighted_score=s.weighted_score or 0,
                evidence=json.loads(s.evidence_json) if s.evidence_json else None,
                reason=s.reason,
                guard_penalty=s.guard_penalty or 0,
                guard_reason=s.guard_reason,
            ).model_dump()
            for s in signals
        ]

        results.append({
            "id": alert.id,
            "account_id": mask_account_id(alert.account_id),
            "account_id_raw": alert.account_id,
            "risk_score": alert.risk_score,
            "risk_band": alert.risk_band,
            "confidence": alert.confidence,
            "reason": alert.reason,
            "reason_simple": alert.reason_simple,
            "next_action": alert.next_action,
            "innocent_reason": alert.innocent_reason,
            "status": alert.status,
            "ring_id": alert.ring_id,
            "total_flow": alert.total_flow or 0,
            "signal_types": [s.signal_type for s in signals],
            "signals": signal_details,
            "case_id": alert.case_id,
            "created_at": alert.created_at.isoformat() if alert.created_at else None,
        })

    return envelope(
        data=results,
        meta={"total": total, "limit": limit, "has_more": len(alerts) == limit,
              "cursor": alerts[-1].id if alerts else None},
    )


# ─── Accounts ──────────────────────────────────────────
@router.get("/accounts/{account_id}")
def get_account(
    account_id: str,
    run_id: str | None = None,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Get account profile with signals and features."""
    query = db.query(Account).filter(Account.account_id == account_id.upper())
    if run_id:
        query = query.filter(Account.run_id == run_id)
    account = query.order_by(Account.run_id.desc()).first()

    if not account:
        raise HTTPException(404, "Account not found")

    # Get signals via alert
    alert = db.query(Alert).filter(
        Alert.account_id == account_id.upper(),
        Alert.run_id == account.run_id,
    ).first()

    signals = []
    if alert:
        signal_objs = db.query(Signal).filter(Signal.alert_id == alert.id).all()
        signals = [
            SignalDetail(
                signal_type=s.signal_type,
                weight=s.weight or 0,
                raw_value=s.raw_value or 0,
                weighted_score=s.weighted_score or 0,
                evidence=json.loads(s.evidence_json) if s.evidence_json else None,
                reason=s.reason,
                guard_penalty=s.guard_penalty or 0,
                guard_reason=s.guard_reason,
            ).model_dump()
            for s in signal_objs
        ]

    return envelope(data={
        "id": account.id,
        "account_id": mask_account_id(account.account_id),
        "account_id_raw": account.account_id,
        "open_date": account.open_date.isoformat() if account.open_date else None,
        "age_days": account.age_days,
        "segment": account.segment,
        "in_degree": account.in_degree,
        "out_degree": account.out_degree,
        "total_in": account.total_in,
        "total_out": account.total_out,
        "net_flow": account.net_flow,
        "risk_score": account.risk_score,
        "risk_band": account.risk_band,
        "ring_id": account.ring_id,
        "status": account.status,
        "is_flagged": account.is_flagged,
        "signals": signals,
        "reason": alert.reason if alert else None,
        "reason_simple": alert.reason_simple if alert else None,
        "innocent_reason": alert.innocent_reason if alert else None,
        "next_action": alert.next_action if alert else None,
        "confidence": alert.confidence if alert else None,
    })


@router.post("/accounts/{account_id}/reveal")
def reveal_pii(
    account_id: str,
    body: RevealRequest,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Reveal masked PII with reason (audited)."""
    account = db.query(Account).filter(
        Account.account_id == account_id.upper()
    ).first()
    if not account:
        raise HTTPException(404, "Account not found")

    append_audit_entry(
        db, "PII_REVEAL", user.user_id, user.username,
        {"account_id": account_id, "reason": body.reason},
        entity_type="account",
        entity_id=account_id,
    )

    return envelope(data={
        "account_id": account.account_id,
        "revealed": True,
    })


# ─── Network ──────────────────────────────────────────
@router.get("/accounts/{account_id}/network")
def get_network(
    account_id: str,
    hops: int = Query(default=2, ge=1, le=3),
    min_amount: float = Query(default=0.0, ge=0),
    max_nodes: int = Query(default=300, ge=10, le=2000),
    run_id: str | None = None,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Get account neighborhood subgraph for visualization."""
    # Find the right graph store
    store = None
    if run_id and run_id in _graph_cache:
        # Reconstruct store from cached graph
        store = GraphStore()
        store.graph = _graph_cache[run_id]
    else:
        # Try any cached graph
        for rid, g in _graph_cache.items():
            if account_id.upper() in g.nodes:
                store = GraphStore()
                store.graph = g
                break

    if store is None:
        raise HTTPException(404, "No graph data available. Run an analysis first.")

    # Rebuild sorted edges from graph (needed for subgraph extraction)
    from collections import defaultdict
    store.sorted_edges = defaultdict(list)
    store.sorted_in_edges = defaultdict(list)
    store.accounts = {}

    for n, data in store.graph.nodes(data=True):
        store.accounts[n] = dict(data)

    for u, v, data in store.graph.edges(data=True):
        for t in data.get("transfers", []):
            store.sorted_edges[u].append({**t, "target": v})
            store.sorted_in_edges[v].append({**t, "source": u})

    result = store.get_subgraph(
        center=account_id.upper(),
        hops=hops,
        min_amount=min_amount,
        max_nodes=max_nodes,
    )

    return envelope(
        data=result,
        meta={
            "hops": hops,
            "node_count": len(result["nodes"]),
            "edge_count": len(result["edges"]),
        },
    )


# ─── Rings ──────────────────────────────────────────────
@router.get("/rings")
def list_rings(
    run_id: str | None = None,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """List detected rings."""
    query = db.query(Ring)
    if run_id:
        query = query.filter(Ring.run_id == run_id)
    rings = query.order_by(Ring.risk_score.desc()).all()

    results = []
    for ring in rings:
        results.append({
            "id": ring.id,
            "ring_label": ring.ring_label,
            "member_count": ring.member_count,
            "total_flow": ring.total_flow,
            "time_span_minutes": ring.time_span_minutes,
            "risk_score": ring.risk_score,
            "entry_accounts": json.loads(ring.entry_accounts_json) if ring.entry_accounts_json else [],
            "exit_accounts": json.loads(ring.exit_accounts_json) if ring.exit_accounts_json else [],
            "member_accounts": json.loads(ring.member_accounts_json) if ring.member_accounts_json else [],
        })

    return envelope(data=results)


@router.get("/rings/{ring_id}")
def get_ring(
    ring_id: str,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Get ring details."""
    ring = db.query(Ring).filter(Ring.id == ring_id).first()
    if not ring:
        raise HTTPException(404, "Ring not found")

    return envelope(data={
        "id": ring.id,
        "ring_label": ring.ring_label,
        "member_count": ring.member_count,
        "total_flow": ring.total_flow,
        "time_span_minutes": ring.time_span_minutes,
        "risk_score": ring.risk_score,
        "entry_accounts": json.loads(ring.entry_accounts_json) if ring.entry_accounts_json else [],
        "exit_accounts": json.loads(ring.exit_accounts_json) if ring.exit_accounts_json else [],
        "member_accounts": json.loads(ring.member_accounts_json) if ring.member_accounts_json else [],
        "layout": json.loads(ring.layout_json) if ring.layout_json else {},
    })


# ─── Trace ──────────────────────────────────────────────
@router.post("/trace")
def run_trace(
    body: TraceRequest,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Run victim-to-cash-out trace."""
    # Find graph store
    store = None
    run_id = body.run_id
    if run_id and run_id in _graph_cache:
        store = GraphStore()
        store.graph = _graph_cache[run_id]
    else:
        for rid, g in _graph_cache.items():
            if body.victim_account.upper() in g.nodes:
                store = GraphStore()
                store.graph = g
                run_id = rid
                break

    if store is None:
        raise HTTPException(404, "No graph data. Run an analysis first.")

    # Rebuild edges
    from collections import defaultdict
    store.sorted_edges = defaultdict(list)
    store.sorted_in_edges = defaultdict(list)
    store.accounts = {}
    for n, data in store.graph.nodes(data=True):
        store.accounts[n] = dict(data)
    for u, v, data in store.graph.edges(data=True):
        for t in data.get("transfers", []):
            store.sorted_edges[u].append({**t, "target": v})
            store.sorted_in_edges[v].append({**t, "source": u})

    # Determine start time
    start_ts = body.start_ts
    if start_ts is None:
        # Find first victim transfer
        victim_out = store.sorted_edges.get(body.victim_account.upper(), [])
        victim_txns = [e for e in victim_out if e.get("is_victim_report")]
        if victim_txns:
            start_ts = victim_txns[0]["timestamp"]
        elif victim_out:
            start_ts = victim_out[0]["timestamp"]
        else:
            raise HTTPException(400, "No transfers found for victim account")

    result = trace_funds(
        store=store,
        victim_account=body.victim_account.upper(),
        start_ts=start_ts,
        stolen_amount=body.stolen_amount,
        window_min=body.window_min,
        max_depth=body.max_depth,
    )

    # Save trace result
    trace_result = TraceResult(
        id=gen_id(),
        run_id=run_id or "",
        victim_account=body.victim_account.upper(),
        start_ts=start_ts,
        stolen_amount=result["stolen_amount"],
        total_recovered=result["total_recovered"],
        recovery_pct=result["recovery_pct"],
        hops_json=json.dumps(result["hops"], default=str),
        terminals_json=json.dumps(result["terminals"], default=str),
        freeze_priority_json=json.dumps(result["freeze_priority"], default=str),
        frames_json=json.dumps(result["frames"], default=str),
    )
    db.add(trace_result)
    db.commit()

    return envelope(data={
        "id": trace_result.id,
        **result,
        "frame_count": len(result.get("frames", [])),
    })


@router.get("/trace/{trace_id}/frames")
def get_frames(
    trace_id: str,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Get replay frames for a trace."""
    trace = db.query(TraceResult).filter(TraceResult.id == trace_id).first()
    if not trace:
        raise HTTPException(404, "Trace not found")

    frames = json.loads(trace.frames_json) if trace.frames_json else []
    return envelope(data=frames)
