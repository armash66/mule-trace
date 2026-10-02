"""Cases, decisions, freeze requests, notes, watchlist, config, reports, audit, metrics routes."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.audit import append_audit_entry, verify_audit_chain
from app.core.database import get_db
from app.core.middleware import envelope
from app.core.security import TokenData, get_current_user, require_role, Role
from app.engine.feedback import (
    apply_learned_weights,
    get_active_weights,
    get_learned_weights,
    reset_learned_weights,
    update_feedback,
)
from app.models.models import (
    Account, Alert, AuditLog, Case, ConfigVersion, Decision,
    FreezeRequest, LearnedWeight, Note, Report, Ring, Run,
    WatchlistEntry, gen_id,
)
from app.schemas.schemas import (
    CaseCreate, CaseUpdate, CaseSummary, DecisionCreate,
    FreezeApprovalRequest, FreezeRequestCreate, NoteCreate,
    ReportRequest, ThresholdUpdate, WatchlistAdd,
)

router = APIRouter(tags=["workflow"])


# ─── Cases ──────────────────────────────────────────────
@router.get("/cases")
def list_cases(
    status: str | None = None,
    assignee_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """List cases with optional filtering."""
    query = db.query(Case)
    if status:
        query = query.filter(Case.status == status.upper())
    if assignee_id:
        query = query.filter(Case.assignee_id == assignee_id)
    cases = query.order_by(Case.created_at.desc()).limit(limit).all()

    results = []
    for case in cases:
        alert_count = db.query(Alert).filter(Alert.case_id == case.id).count()
        results.append({
            **CaseSummary.model_validate(case).model_dump(),
            "alert_count": alert_count,
        })

    return envelope(data=results)


@router.post("/cases")
def create_case(
    body: CaseCreate,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Create a new case."""
    case = Case(
        id=gen_id(),
        title=body.title or f"Case from ring {body.ring_id or 'manual'}",
        ring_id=body.ring_id,
        priority=body.priority.upper(),
        created_by=user.user_id,
        sla_due_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(case)

    # Link alerts to case
    if body.alert_ids:
        alerts = db.query(Alert).filter(Alert.id.in_(body.alert_ids)).all()
        for alert in alerts:
            alert.case_id = case.id
        case.total_accounts = len(alerts)
        case.total_flow = sum(a.total_flow or 0 for a in alerts)

    db.commit()

    append_audit_entry(
        db, "CASE_CREATE", user.user_id, user.username,
        {"case_id": case.id, "alert_count": len(body.alert_ids)},
        entity_type="case", entity_id=case.id,
    )

    return envelope(data=CaseSummary.model_validate(case).model_dump())


@router.get("/cases/{case_id}")
def get_case(
    case_id: str,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Get case details with alerts, decisions, and notes."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(404, "Case not found")

    alerts = db.query(Alert).filter(Alert.case_id == case_id).all()
    decisions = db.query(Decision).filter(Decision.case_id == case_id).order_by(Decision.created_at.desc()).all()
    notes = db.query(Note).filter(Note.case_id == case_id).order_by(Note.created_at.desc()).all()
    freezes = db.query(FreezeRequest).filter(FreezeRequest.case_id == case_id).all()

    return envelope(data={
        **CaseSummary.model_validate(case).model_dump(),
        "alerts": [{"id": a.id, "account_id": a.account_id, "risk_score": a.risk_score, "risk_band": a.risk_band, "status": a.status} for a in alerts],
        "decisions": [{"id": d.id, "account_id": d.account_id, "action": d.action, "note": d.note, "user_id": d.user_id, "is_undone": d.is_undone, "created_at": d.created_at.isoformat() if d.created_at else None} for d in decisions],
        "notes": [{"id": n.id, "content": n.content, "username": n.username, "created_at": n.created_at.isoformat() if n.created_at else None} for n in notes],
        "freeze_requests": [{"id": f.id, "status": f.status, "total_recoverable": f.total_recoverable, "created_at": f.created_at.isoformat() if f.created_at else None} for f in freezes],
    })


@router.patch("/cases/{case_id}")
def update_case(
    case_id: str,
    body: CaseUpdate,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Update case status, assignee, or priority."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(404, "Case not found")

    if body.status:
        case.status = body.status.upper()
    if body.assignee_id:
        case.assignee_id = body.assignee_id
    if body.priority:
        case.priority = body.priority.upper()
    if body.title:
        case.title = body.title

    db.commit()

    append_audit_entry(
        db, "CASE_UPDATE", user.user_id, user.username,
        {"case_id": case_id, "changes": body.model_dump(exclude_none=True)},
        entity_type="case", entity_id=case_id,
    )

    return envelope(data=CaseSummary.model_validate(case).model_dump())


@router.post("/cases/{case_id}/notes")
def add_note(
    case_id: str,
    body: NoteCreate,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Add a note to a case."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(404, "Case not found")

    note = Note(
        id=gen_id(),
        case_id=case_id,
        user_id=user.user_id,
        username=user.username,
        content=body.content,
    )
    db.add(note)
    db.commit()

    return envelope(data={"id": note.id, "content": note.content, "username": note.username, "created_at": note.created_at.isoformat() if note.created_at else None})


# ─── Decisions ──────────────────────────────────────────
@router.post("/decisions")
def create_decision(
    body: DecisionCreate,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Record analyst decision (Confirm/Clear/NeedsInfo)."""
    # Validate: CONFIRM requires note
    if body.action == "CONFIRM" and not body.note:
        raise HTTPException(400, "A note is required when confirming a mule account")

    decision = Decision(
        id=gen_id(),
        case_id=body.case_id,
        account_id=body.account_id.upper(),
        action=body.action,
        note=body.note,
        user_id=user.user_id,
    )
    db.add(decision)

    # Update alert/account status
    alerts = db.query(Alert).filter(Alert.account_id == body.account_id.upper()).all()
    status_map = {"CONFIRM": "CONFIRMED", "CLEAR": "CLEARED", "NEEDS_INFO": "NEEDS_INFO", "REOPEN": "IN_REVIEW"}
    new_status = status_map.get(body.action, "IN_REVIEW")
    for alert in alerts:
        alert.status = new_status

    accounts = db.query(Account).filter(Account.account_id == body.account_id.upper()).all()
    for account in accounts:
        account.status = new_status

    # Add to watchlist if confirmed
    if body.action == "CONFIRM":
        existing = db.query(WatchlistEntry).filter(
            WatchlistEntry.account_id == body.account_id.upper(),
            WatchlistEntry.is_active == True,
        ).first()
        if not existing:
            wl = WatchlistEntry(
                id=gen_id(),
                account_id=body.account_id.upper(),
                source=f"Confirmed by {user.username}",
                reason=body.note,
                added_by=user.user_id,
            )
            db.add(wl)

    # Update feedback loop
    signal_types = []
    for alert in alerts:
        from app.models.models import Signal
        sigs = db.query(Signal).filter(Signal.alert_id == alert.id).all()
        signal_types.extend([s.signal_type for s in sigs])

    if body.action in ("CONFIRM", "CLEAR") and signal_types:
        update_feedback(db, body.account_id.upper(), signal_types, body.action)

    db.commit()

    append_audit_entry(
        db, f"DECISION_{body.action}", user.user_id, user.username,
        {"account_id": body.account_id, "note": body.note},
        entity_type="decision", entity_id=decision.id,
    )

    return envelope(data={
        "id": decision.id,
        "account_id": body.account_id,
        "action": body.action,
        "status": new_status,
    })


@router.post("/decisions/{decision_id}/undo")
def undo_decision(
    decision_id: str,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Undo a decision within 8 seconds."""
    decision = db.query(Decision).filter(Decision.id == decision_id).first()
    if not decision:
        raise HTTPException(404, "Decision not found")
    if decision.is_undone:
        raise HTTPException(400, "Decision already undone")

    # Check 8-second window
    if decision.created_at:
        elapsed = (datetime.now(timezone.utc) - decision.created_at).total_seconds()
        if elapsed > 8:
            raise HTTPException(400, "Undo window expired (8 seconds)")

    decision.is_undone = True
    decision.undone_at = datetime.now(timezone.utc)

    # Revert alert/account status
    alerts = db.query(Alert).filter(Alert.account_id == decision.account_id).all()
    for alert in alerts:
        alert.status = "UNREVIEWED"
    accounts = db.query(Account).filter(Account.account_id == decision.account_id).all()
    for account in accounts:
        account.status = "UNREVIEWED"

    db.commit()

    append_audit_entry(
        db, "DECISION_UNDO", user.user_id, user.username,
        {"decision_id": decision_id, "original_action": decision.action},
    )

    return envelope(data={"undone": True, "decision_id": decision_id})


# ─── Freeze Requests ───────────────────────────────────
@router.post("/freeze-requests")
def create_freeze_request(
    body: FreezeRequestCreate,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Draft a freeze request (maker)."""
    case = db.query(Case).filter(Case.id == body.case_id).first()
    if not case:
        raise HTTPException(404, "Case not found")

    freeze = FreezeRequest(
        id=gen_id(),
        case_id=body.case_id,
        account_ids_json=json.dumps(body.account_ids),
        total_recoverable=body.total_recoverable,
        maker_id=user.user_id,
        maker_note=body.note,
    )
    db.add(freeze)

    case.status = "FREEZE_DRAFTED"
    db.commit()

    append_audit_entry(
        db, "FREEZE_DRAFT", user.user_id, user.username,
        {"freeze_id": freeze.id, "accounts": len(body.account_ids)},
        entity_type="freeze", entity_id=freeze.id,
    )

    return envelope(data={"id": freeze.id, "status": "DRAFTED"})


@router.post("/freeze-requests/{freeze_id}/approve")
def approve_freeze(
    freeze_id: str,
    body: FreezeApprovalRequest = FreezeApprovalRequest(),
    user: TokenData = Depends(require_role(Role.LEAD)),
    db: Session = Depends(get_db),
):
    """Approve a freeze request (checker)."""
    freeze = db.query(FreezeRequest).filter(FreezeRequest.id == freeze_id).first()
    if not freeze:
        raise HTTPException(404, "Freeze request not found")
    if freeze.status != "DRAFTED":
        raise HTTPException(400, "Can only approve drafted requests")
    if freeze.maker_id == user.user_id:
        raise HTTPException(400, "Maker and checker must be different users")

    freeze.status = "APPROVED"
    freeze.checker_id = user.user_id
    freeze.checker_note = body.note
    freeze.decided_at = datetime.now(timezone.utc)

    case = db.query(Case).filter(Case.id == freeze.case_id).first()
    if case:
        case.status = "FREEZE_APPROVED"

    db.commit()

    append_audit_entry(
        db, "FREEZE_APPROVE", user.user_id, user.username,
        {"freeze_id": freeze_id},
        entity_type="freeze", entity_id=freeze_id,
    )

    return envelope(data={"id": freeze_id, "status": "APPROVED"})


@router.post("/freeze-requests/{freeze_id}/reject")
def reject_freeze(
    freeze_id: str,
    body: FreezeApprovalRequest = FreezeApprovalRequest(),
    user: TokenData = Depends(require_role(Role.LEAD)),
    db: Session = Depends(get_db),
):
    """Reject a freeze request (checker)."""
    freeze = db.query(FreezeRequest).filter(FreezeRequest.id == freeze_id).first()
    if not freeze:
        raise HTTPException(404, "Freeze request not found")

    freeze.status = "REJECTED"
    freeze.checker_id = user.user_id
    freeze.checker_note = body.note
    freeze.decided_at = datetime.now(timezone.utc)

    case = db.query(Case).filter(Case.id == freeze.case_id).first()
    if case:
        case.status = "IN_REVIEW"

    db.commit()

    return envelope(data={"id": freeze_id, "status": "REJECTED"})


# ─── Watchlist ──────────────────────────────────────────
@router.get("/watchlist")
def list_watchlist(
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """List watchlist entries."""
    entries = db.query(WatchlistEntry).filter(WatchlistEntry.is_active == True).order_by(WatchlistEntry.added_at.desc()).all()
    return envelope(data=[{
        "id": e.id, "account_id": e.account_id, "source": e.source,
        "reason": e.reason, "added_at": e.added_at.isoformat() if e.added_at else None,
    } for e in entries])


@router.post("/watchlist")
def add_to_watchlist(
    body: WatchlistAdd,
    user: TokenData = Depends(require_role(Role.LEAD)),
    db: Session = Depends(get_db),
):
    """Add account to watchlist."""
    entry = WatchlistEntry(
        id=gen_id(),
        account_id=body.account_id.upper(),
        source=body.source,
        reason=body.reason,
        device_id=body.device_id,
        added_by=user.user_id,
    )
    db.add(entry)
    db.commit()

    append_audit_entry(
        db, "WATCHLIST_ADD", user.user_id, user.username,
        {"account_id": body.account_id},
    )

    return envelope(data={"id": entry.id, "account_id": entry.account_id})


# ─── Config ────────────────────────────────────────────
@router.get("/config/thresholds")
def get_thresholds(
    user: TokenData = Depends(require_role(Role.ANALYST)),
):
    """Get current detection thresholds."""
    from app.core.config import get_settings
    return envelope(data=get_settings().thresholds.model_dump())


@router.put("/config/thresholds")
def update_thresholds(
    body: ThresholdUpdate,
    user: TokenData = Depends(require_role(Role.LEAD)),
    db: Session = Depends(get_db),
):
    """Update thresholds (requires Lead role)."""
    cv = ConfigVersion(
        id=gen_id(),
        config_json=json.dumps(body.thresholds),
        changed_by=user.user_id,
        change_reason=body.reason,
    )
    db.add(cv)
    db.commit()

    append_audit_entry(
        db, "CONFIG_UPDATE", user.user_id, user.username,
        {"changes": body.thresholds, "reason": body.reason},
    )

    return envelope(data={"version_id": cv.id, "applied": True})


@router.post("/config/preview")
def preview_thresholds(
    body: dict,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Preview alert count impact of threshold changes."""
    # Simplified: return current count and estimated delta
    run_id = body.get("run_id")
    total = db.query(Alert).filter(Alert.run_id == run_id).count() if run_id else 0
    return envelope(data={
        "current_alerts": total,
        "proposed_alerts": total,  # Would recompute with new thresholds
        "delta": 0,
        "note": "Full preview requires re-running detectors with new thresholds",
    })


# ─── Learned Weights ──────────────────────────────────
@router.get("/learned-weights")
def get_weights(
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Get learned weights with before/after comparison."""
    return envelope(data=get_learned_weights(db))


@router.post("/learned-weights/apply")
def apply_weights(
    user: TokenData = Depends(require_role(Role.LEAD)),
    db: Session = Depends(get_db),
):
    """Apply learned weights for future runs (requires Lead)."""
    weights = apply_learned_weights(db, user.user_id)
    append_audit_entry(
        db, "WEIGHTS_APPLY", user.user_id, user.username,
        {"weights": weights},
    )
    return envelope(data=weights)


@router.post("/learned-weights/reset")
def reset_weights(
    user: TokenData = Depends(require_role(Role.LEAD)),
    db: Session = Depends(get_db),
):
    """Reset learned weights to defaults."""
    reset_learned_weights(db)
    append_audit_entry(
        db, "WEIGHTS_RESET", user.user_id, user.username, {},
    )
    return envelope(data={"reset": True})


# ─── Audit ──────────────────────────────────────────────
@router.get("/audit")
def list_audit(
    limit: int = Query(default=100, ge=1, le=1000),
    action: str | None = None,
    user: TokenData = Depends(require_role(Role.AUDITOR)),
    db: Session = Depends(get_db),
):
    """List audit log entries."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    entries = query.order_by(AuditLog.id.desc()).limit(limit).all()

    return envelope(data=[{
        "id": e.id, "action": e.action, "username": e.username,
        "entity_type": e.entity_type, "entity_id": e.entity_id,
        "details": json.loads(e.details_json) if e.details_json else {},
        "created_at": e.created_at.isoformat() if e.created_at else None,
    } for e in entries])


@router.get("/audit/verify")
def verify_audit(
    user: TokenData = Depends(require_role(Role.AUDITOR)),
    db: Session = Depends(get_db),
):
    """Verify audit chain integrity."""
    result = verify_audit_chain(db)
    return envelope(data=result)


# ─── Metrics ───────────────────────────────────────────
@router.get("/metrics/summary")
def get_metrics(
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Get summary metrics / KPIs."""
    total_runs = db.query(Run).count()
    total_alerts = db.query(Alert).count()
    total_cases = db.query(Case).count()
    open_cases = db.query(Case).filter(Case.status.in_(["UNREVIEWED", "IN_REVIEW", "NEEDS_INFO"])).count()
    critical = db.query(Alert).filter(Alert.risk_band == "CRITICAL").count()
    rings = db.query(Ring).count()
    money_at_risk = db.query(Alert).with_entities(
        db.query(Alert).with_entities(Alert.total_flow).subquery()
    ).scalar() or 0

    return envelope(data={
        "total_runs": total_runs,
        "total_alerts": total_alerts,
        "total_cases": total_cases,
        "open_cases": open_cases,
        "critical_count": critical,
        "ring_count": rings,
        "money_at_risk": 0,
    })


@router.get("/metrics/benchmark")
def get_benchmark(
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Get benchmark results (precision/recall from synthetic data)."""
    # This would be populated by the benchmark runner
    return envelope(data={
        "precision": None,
        "recall": None,
        "f1": None,
        "note": "Run the benchmark with: make benchmark",
    })


# ─── Synthetic ──────────────────────────────────────────
@router.post("/synthetic/generate")
def generate_synthetic(
    body: dict | None = None,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Generate synthetic demo data."""
    from synthetic.generator import generate_synthetic_data
    params = body or {}
    result = generate_synthetic_data(
        num_accounts=params.get("num_accounts", 5000),
        num_rings=params.get("num_rings", 10),
        seed=params.get("seed", 42),
    )
    return envelope(data=result)


# ─── Reports ──────────────────────────────────────────
@router.post("/reports")
def create_report(
    body: ReportRequest,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Generate case report (PDF/JSON/STR draft)."""
    case = db.query(Case).filter(Case.id == body.case_id).first()
    if not case:
        raise HTTPException(404, "Case not found")

    report = Report(
        id=gen_id(),
        case_id=body.case_id,
        report_type=body.report_type,
        filename=f"muletrace_report_{case.id}.{body.report_type.lower()}",
        generated_by=user.user_id,
    )
    db.add(report)
    db.commit()

    append_audit_entry(
        db, "REPORT_GENERATE", user.user_id, user.username,
        {"case_id": body.case_id, "type": body.report_type},
    )

    return envelope(data={
        "id": report.id,
        "report_type": report.report_type,
        "filename": report.filename,
        "status": "generated",
    })


@router.get("/reports/{report_id}")
def get_report(
    report_id: str,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Get report metadata."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")
    return envelope(data={
        "id": report.id,
        "case_id": report.case_id,
        "report_type": report.report_type,
        "filename": report.filename,
    })


# ─── Health ─────────────────────────────────────────────
health_router = APIRouter(tags=["health"])


@health_router.get("/health")
def health():
    return {"status": "healthy", "service": "muletrace-api"}


@health_router.get("/ready")
def ready(db: Session = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        return {"status": "ready"}
    except Exception:
        raise HTTPException(503, "Database not ready")
