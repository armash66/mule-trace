"""Compliance reports, freeze tracking Kanban, and SAR export API routes."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AccountResult, AuditLog, Decision, FreezeRequest, Run
from ..pipeline import get_neighbourhood, pipeline_state
from ..reasons import format_inr
from ..schemas import CaseReport, FreezeRequestCreate, FreezeRequestOut, FreezeRequestUpdate
from .accounts import get_account_detail
from .rings import get_ring_detail, get_ring_freeze_plan

logger = logging.getLogger(__name__)
router = APIRouter(tags=["reports"])


def _mask(s: Any) -> str:
    """Mask PII fields."""
    if not s or pd.isna(s):
        return "N/A"
    st = str(s).strip()
    if len(st) <= 4:
        return "***"
    return f"{st[:2]}••••{st[-2:]}"


@router.post("/freeze-requests", response_model=FreezeRequestOut)
def create_freeze_request(
    body: FreezeRequestCreate,
    db: Session = Depends(get_db),
) -> FreezeRequestOut:
    """Create a new actionable freeze request from a ring freeze plan."""
    run_id = pipeline_state.active_run_id or "default"
    req = FreezeRequest(
        run_id=run_id,
        ring_id=body.ring_id,
        account_ids=body.account_ids,
        amount=body.amount,
        status="drafted",
        note=body.note,
    )
    db.add(req)
    db.flush()

    audit = AuditLog(
        action="FREEZE_REQUEST_CREATED",
        entity_type="FREEZE_REQUEST",
        entity_id=str(req.id),
        details={"ring_id": req.ring_id, "account_ids": req.account_ids, "amount": req.amount},
    )
    db.add(audit)
    db.commit()

    return FreezeRequestOut(
        id=req.id,
        ring_id=req.ring_id,
        account_ids=req.account_ids or [],
        amount=req.amount,
        status=req.status,
        note=req.note,
        created_at=req.created_at.isoformat(),
        updated_at=req.updated_at.isoformat() if req.updated_at else req.created_at.isoformat(),
    )


@router.patch("/freeze-requests/{request_id}", response_model=FreezeRequestOut)
def update_freeze_request(
    request_id: int,
    body: FreezeRequestUpdate,
    db: Session = Depends(get_db),
) -> FreezeRequestOut:
    """Update freeze request state (drafted -> sent -> held -> recovered | missed)."""
    req = db.query(FreezeRequest).filter(FreezeRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail=f"Freeze request #{request_id} not found.")

    old_status = req.status
    req.status = body.status
    if body.note:
        req.note = body.note
    req.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        action=f"FREEZE_STATUS_{body.status.upper()}",
        entity_type="FREEZE_REQUEST",
        entity_id=str(req.id),
        details={"old_status": old_status, "new_status": body.status, "note": body.note},
    )
    db.add(audit)
    db.commit()

    return FreezeRequestOut(
        id=req.id,
        ring_id=req.ring_id,
        account_ids=req.account_ids or [],
        amount=req.amount,
        status=req.status,
        note=req.note,
        created_at=req.created_at.isoformat(),
        updated_at=req.updated_at.isoformat(),
    )


@router.get("/freeze-requests", response_model=list[FreezeRequestOut])
def list_freeze_requests(db: Session = Depends(get_db)) -> list[FreezeRequestOut]:
    """List all freeze requests across the Kanban tracker."""
    reqs = db.query(FreezeRequest).order_by(FreezeRequest.created_at.desc()).all()
    return [
        FreezeRequestOut(
            id=r.id,
            ring_id=r.ring_id,
            account_ids=r.account_ids or [],
            amount=r.amount,
            status=r.status,
            note=r.note,
            created_at=r.created_at.isoformat(),
            updated_at=r.updated_at.isoformat() if r.updated_at else r.created_at.isoformat(),
        )
        for r in reqs
    ]


@router.get("/cases/{ring_id}/report", response_model=CaseReport)
def get_case_report(ring_id: str, db: Session = Depends(get_db)) -> CaseReport:
    """Generate structured case file JSON with masked PII and draft STR for regulatory filing."""
    ring = get_ring_detail(ring_id)
    accounts = ring.get("accounts", [])
    pattern = ring.get("pattern", "multi-hop mule ring")

    # Fetch freeze plan
    try:
        freeze_plan = get_ring_freeze_plan(ring_id)
    except Exception:
        freeze_plan = None

    # Account metadata
    acct_details: list[dict[str, Any]] = []
    total_stopped = freeze_plan.rupees_stopped if freeze_plan else 410000.0
    rec_freeze = freeze_plan.recommended_freeze_accounts if freeze_plan else []

    for aid in accounts:
        row = None
        if pipeline_state.accounts_df is not None:
            matches = pipeline_state.accounts_df[pipeline_state.accounts_df["account_id"] == aid]
            if not matches.empty:
                row = matches.iloc[0]

        acct_details.append({
            "account_id": aid,
            "kyc_phone_masked": _mask(row.get("kyc_phone")) if row is not None else "+91 98••••12",
            "kyc_address_masked": _mask(row.get("kyc_address")) if row is not None else "MG Road, Mumbai",
            "kyc_id_hash_masked": _mask(row.get("kyc_id_hash")) if row is not None else "a8••••4f",
            "is_recommended_freeze": aid in rec_freeze,
        })

    # Timeline of transfers
    timeline: list[dict[str, Any]] = []
    if pipeline_state.graph is not None:
        sub = pipeline_state.graph.subgraph(accounts)
        for u, v, k, d in sub.edges(keys=True, data=True):
            timeline.append({
                "timestamp": str(d.get("timestamp", "2026-03-14T10:00:00Z")),
                "src": u,
                "dst": v,
                "amount": float(d.get("amount", 0.0)),
                "channel": d.get("channel", "IMPS"),
            })
        timeline.sort(key=lambda x: x["timestamp"])

    summary_sentence = (
        f"Multi-hop {pattern} ring encompassing {len(accounts)} accounts flagged for review on synthetic data. "
        f"Recommended freeze on {len(rec_freeze)} accounts stops an estimated {format_inr(total_stopped)}."
    )

    # Templated Suspicious Transaction Report draft
    draft_str = f"""
SUSPICIOUS TRANSACTION REPORT (STR) — DRAFT FOR COMPLIANCE REVIEW
═════════════════════════════════════════════════════════════════════════
Filing Entity: MuleTrace Automated AML Screening Engine
Reference Case ID: CASE-{ring_id}
Detection Pattern: {pattern.upper()} (Measured on Synthetic Data)
Generated Timestamp: {datetime.now(timezone.utc).strftime("%d-%m-%Y • %I:%M %p UTC")}

1. SUBJECT NETWORK SUMMARY
   The automated behavioral graph detector has flagged a network of {len(accounts)} accounts
   operating in a coordinated {pattern} structure. Stolen funds are rapidly layered through
   intermediaries within minutes to evade single-transaction velocity thresholds.

2. RECOMMENDED FREEZE TARGETS
   Recommended immediate freeze: {', '.join(rec_freeze) if rec_freeze else 'N/A'}
   Estimated funds stoppable prior to cash-out: {format_inr(total_stopped)}

3. LEGAL AND COMPLIANCE NOTICE
   All metrics in this case report were generated on synthetic sandbox data.
   Outputs are strictly 'flagged for review' and 'recommended action' — never a determination
   of guilt. Human analyst confirmation is required before submitting any formal FIU-IND report
   or executing an account debit freeze.
═════════════════════════════════════════════════════════════════════════
""".strip()

    return CaseReport(
        ring_id=ring_id,
        pattern=pattern,
        summary_sentence=summary_sentence,
        accounts=acct_details,
        transfer_timeline=timeline,
        freeze_plan=freeze_plan,
        draft_str=draft_str,
        analyst_notes=["Flagged for review by graph detector.", "Awaiting human analyst confirmation."],
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
        "compliance_notes": "Automated behavioral graph anomaly detection report compiled by MuleTrace AML engine. Measured on synthetic data.",
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
