"""SQLAlchemy ORM models for MuleTrace persistence."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.orm import DeclarativeBase


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


class Run(Base):
    """A single pipeline run (one CSV upload or demo dataset)."""

    __tablename__ = "runs"

    id: str = Column(String, primary_key=True, default=_uuid)  # type: ignore[assignment]
    created_at: datetime = Column(DateTime, default=_utcnow)  # type: ignore[assignment]
    txn_count: int = Column(Integer, default=0)  # type: ignore[assignment]
    acct_count: int = Column(Integer, default=0)  # type: ignore[assignment]
    flagged_count: int = Column(Integer, default=0)  # type: ignore[assignment]
    duplicates_removed: int = Column(Integer, default=0)  # type: ignore[assignment]
    out_of_order_fixed: int = Column(Integer, default=0)  # type: ignore[assignment]
    missing_device_pct: float = Column(Float, default=0.0)  # type: ignore[assignment]
    missing_ip_pct: float = Column(Float, default=0.0)  # type: ignore[assignment]
    self_transfers_dropped: int = Column(Integer, default=0)  # type: ignore[assignment]
    health_summary = Column(JSON, default=dict)


class AccountResult(Base):
    """Scored account produced by a pipeline run."""

    __tablename__ = "account_results"

    id: int = Column(Integer, primary_key=True, autoincrement=True)  # type: ignore[assignment]
    run_id: str = Column(String, index=True)  # type: ignore[assignment]
    account_id: str = Column(String, index=True)  # type: ignore[assignment]
    risk_score: int = Column(Integer, default=0)  # type: ignore[assignment]
    patterns = Column(JSON, default=list)
    reasons = Column(JSON, default=list)
    findings = Column(JSON, default=list)
    features = Column(JSON, default=dict)
    tainted_balance: float = Column(Float, default=0.0)  # type: ignore[assignment]
    status: str = Column(String, default="unreviewed")  # "unreviewed" | "confirmed" | "cleared" # type: ignore[assignment]


# Alias for convenience matching PRD naming
Account = AccountResult


class Decision(Base):
    """Analyst decision on a flagged account."""

    __tablename__ = "decisions"

    id: int = Column(Integer, primary_key=True, autoincrement=True)  # type: ignore[assignment]
    run_id: str = Column(String, index=True)  # type: ignore[assignment]
    account_id: str = Column(String, index=True)  # type: ignore[assignment]
    status: str = Column(String)  # "confirmed" | "cleared"  # type: ignore[assignment]
    note: str = Column(Text)  # type: ignore[assignment]
    analyst: str = Column(String)  # type: ignore[assignment]
    created_at: datetime = Column(DateTime, default=_utcnow)  # type: ignore[assignment]


class FreezeRequest(Base):
    """Actionable freeze request tracked through regulatory workflow."""

    __tablename__ = "freeze_requests"

    id: int = Column(Integer, primary_key=True, autoincrement=True)  # type: ignore[assignment]
    run_id: str = Column(String, index=True)  # type: ignore[assignment]
    ring_id: str = Column(String, index=True)  # type: ignore[assignment]
    account_ids = Column(JSON, default=list)
    amount: float = Column(Float, default=0.0)  # type: ignore[assignment]
    status: str = Column(String, default="drafted")  # drafted | sent | held | recovered | missed # type: ignore[assignment]
    note: str | None = Column(Text, nullable=True)  # type: ignore[assignment]
    created_at: datetime = Column(DateTime, default=_utcnow)  # type: ignore[assignment]
    updated_at: datetime = Column(DateTime, default=_utcnow, onupdate=_utcnow)  # type: ignore[assignment]


class AuditLog(Base):
    """Append-only audit trail."""

    __tablename__ = "audit_log"

    id: int = Column(Integer, primary_key=True, autoincrement=True)  # type: ignore[assignment]
    action: str = Column(String)  # type: ignore[assignment]
    entity_type: str = Column(String)  # type: ignore[assignment]
    entity_id: str = Column(String)  # type: ignore[assignment]
    details = Column(JSON)
    created_at: datetime = Column(DateTime, default=_utcnow)  # type: ignore[assignment]
