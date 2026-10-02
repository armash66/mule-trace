"""Immutable hash-chained audit log."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session


def compute_hash(prev_hash: str, data: dict[str, Any]) -> str:
    """Compute SHA-256 hash for audit chain entry."""
    payload = f"{prev_hash}|{json.dumps(data, sort_keys=True, default=str)}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def append_audit_entry(
    db: Session,
    action: str,
    user_id: str,
    username: str,
    details: dict[str, Any],
    entity_type: str | None = None,
    entity_id: str | None = None,
) -> Any:
    """Append an entry to the hash-chained audit log."""
    from app.models.models import AuditLog

    # Get the last entry's hash (or genesis hash)
    last_entry = (
        db.query(AuditLog)
        .order_by(AuditLog.id.desc())
        .first()
    )
    prev_hash = last_entry.hash if last_entry else "0" * 64

    # Build the data payload (no raw PII)
    data = {
        "action": action,
        "user_id": user_id,
        "username": username,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    entry_hash = compute_hash(prev_hash, data)

    entry = AuditLog(
        action=action,
        user_id=user_id,
        username=username,
        entity_type=entity_type,
        entity_id=entity_id,
        details_json=json.dumps(details, default=str),
        prev_hash=prev_hash,
        hash=entry_hash,
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def verify_audit_chain(db: Session) -> dict[str, Any]:
    """Verify the entire audit chain integrity. Returns verification result."""
    from app.models.models import AuditLog

    entries = db.query(AuditLog).order_by(AuditLog.id.asc()).all()

    if not entries:
        return {"valid": True, "total_entries": 0, "message": "Empty audit log"}

    expected_prev = "0" * 64
    broken_at: list[int] = []

    for entry in entries:
        # Check prev_hash links
        if entry.prev_hash != expected_prev:
            broken_at.append(entry.id)

        # Recompute hash
        data = {
            "action": entry.action,
            "user_id": entry.user_id,
            "username": entry.username,
            "entity_type": entry.entity_type,
            "entity_id": entry.entity_id,
            "details": json.loads(entry.details_json) if entry.details_json else {},
            "timestamp": entry.created_at.isoformat() if entry.created_at else "",
        }
        recomputed = compute_hash(entry.prev_hash, data)
        if recomputed != entry.hash:
            broken_at.append(entry.id)

        expected_prev = entry.hash

    return {
        "valid": len(broken_at) == 0,
        "total_entries": len(entries),
        "broken_entries": broken_at,
        "message": "Chain intact ✓" if not broken_at else f"Chain broken at entries: {broken_at}",
    }
