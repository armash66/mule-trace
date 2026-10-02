"""Audit hash-chain and tamper detection tests."""
from __future__ import annotations

from app.core.audit import append_audit_entry, verify_audit_chain
from app.models.models import AuditLog


def test_audit_chain_valid(db_session):
    """Test that sequential entries form a valid hash chain."""
    append_audit_entry(
        db=db_session,
        action="LOGIN",
        user_id="user-1",
        username="analyst",
        details={"ip": "127.0.0.1"},
    )
    append_audit_entry(
        db=db_session,
        action="DECISION",
        user_id="user-1",
        username="analyst",
        details={"account_id": "ACC-001", "decision": "CONFIRMED_MULE"},
    )

    result = verify_audit_chain(db_session)
    assert result["valid"] is True
    assert result["total_entries"] >= 2


def test_audit_tamper_detected(db_session):
    """Security P0: Tampering with any entry breaks the hash chain."""
    entry1 = append_audit_entry(
        db=db_session,
        action="DECISION",
        user_id="user-1",
        username="analyst",
        details={"account_id": "ACC-002", "decision": "CONFIRMED_MULE"},
    )
    append_audit_entry(
        db=db_session,
        action="FREEZE",
        user_id="user-2",
        username="lead",
        details={"account_id": "ACC-002", "amount": 50000.0},
    )

    # Initial verification should be valid
    assert verify_audit_chain(db_session)["valid"] is True

    # Tamper with entry1 in the database (simulating direct DB tampering)
    entry1.action = "CLEARED"  # Modified action
    db_session.commit()

    # Re-verify -> Must detect tamper!
    tamper_result = verify_audit_chain(db_session)
    assert tamper_result["valid"] is False
    assert len(tamper_result["broken_entries"]) > 0
