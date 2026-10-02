"""SQLAlchemy ORM models for MuleTrace.

Tables: users, runs, accounts, transfers, signals, alerts, cases, rings,
decisions, notes, freeze_requests, watchlist, config_versions,
learned_weights, audit_log, jobs, reports.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


def gen_id() -> str:
    """Generate a short unique ID."""
    return uuid.uuid4().hex[:12]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ─── Users ──────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(String(32), primary_key=True, default=gen_id)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="analyst")  # analyst, lead, compliance, admin, auditor
    display_name = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    decisions = relationship("Decision", back_populates="user")


# ─── Runs ───────────────────────────────────────────────
class Run(Base):
    __tablename__ = "runs"

    id = Column(String(32), primary_key=True, default=gen_id)
    status = Column(String(20), default="pending")  # pending, running, completed, failed, cancelled
    created_by = Column(String(32), ForeignKey("users.id"), nullable=True)
    filename = Column(String(500), nullable=True)
    total_rows = Column(Integer, default=0)
    valid_rows = Column(Integer, default=0)
    duplicate_rows = Column(Integer, default=0)
    invalid_rows = Column(Integer, default=0)
    total_accounts = Column(Integer, default=0)
    total_transfers = Column(Integer, default=0)
    total_alerts = Column(Integer, default=0)
    total_rings = Column(Integer, default=0)
    config_snapshot_json = Column(Text, nullable=True)  # Versioned config used for this run
    data_quality_json = Column(Text, nullable=True)
    timing_json = Column(Text, nullable=True)  # Stage timings
    seed = Column(Integer, default=42)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    alerts = relationship("Alert", back_populates="run", cascade="all, delete-orphan")
    accounts = relationship("Account", back_populates="run", cascade="all, delete-orphan")
    transfers = relationship("Transfer", back_populates="run", cascade="all, delete-orphan")
    rings = relationship("Ring", back_populates="run", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_runs_status", "status"),)


# ─── Accounts ───────────────────────────────────────────
class Account(Base):
    __tablename__ = "accounts"

    id = Column(String(32), primary_key=True, default=gen_id)
    run_id = Column(String(32), ForeignKey("runs.id"), nullable=False, index=True)
    account_id = Column(String(100), nullable=False, index=True)  # Original account ID
    open_date = Column(DateTime, nullable=True)
    age_days = Column(Integer, nullable=True)
    segment = Column(String(50), nullable=True)  # retail, merchant, payroll, corporate
    branch = Column(String(100), nullable=True)
    kyc_phone_hash = Column(String(64), nullable=True)
    kyc_address_hash = Column(String(64), nullable=True)
    kyc_pan_hash = Column(String(64), nullable=True)
    device_ids_json = Column(Text, nullable=True)  # JSON array
    ip_addresses_json = Column(Text, nullable=True)  # JSON array
    in_degree = Column(Integer, default=0)
    out_degree = Column(Integer, default=0)
    total_in = Column(Float, default=0.0)
    total_out = Column(Float, default=0.0)
    net_flow = Column(Float, default=0.0)
    risk_score = Column(Float, default=0.0)
    risk_band = Column(String(10), default="LOW")
    ring_id = Column(String(32), nullable=True, index=True)
    status = Column(String(20), default="UNREVIEWED")  # UNREVIEWED, IN_REVIEW, CONFIRMED, CLEARED, NEEDS_INFO
    is_flagged = Column(Boolean, default=False)

    run = relationship("Run", back_populates="accounts")
    signals = relationship("Signal", back_populates="account", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_accounts_run_account", "run_id", "account_id", unique=True),
        Index("ix_accounts_risk", "risk_score"),
    )


# ─── Transfers ──────────────────────────────────────────
class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(String(32), primary_key=True, default=gen_id)
    run_id = Column(String(32), ForeignKey("runs.id"), nullable=False, index=True)
    txn_id = Column(String(200), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    sender_account = Column(String(100), nullable=False, index=True)
    receiver_account = Column(String(100), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    channel = Column(String(20), nullable=True)
    sender_balance_after = Column(Float, nullable=True)
    receiver_balance_after = Column(Float, nullable=True)
    device_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    is_victim_report = Column(Boolean, default=False)

    run = relationship("Run", back_populates="transfers")

    __table_args__ = (
        Index("ix_transfers_run_txn", "run_id", "txn_id", unique=True),
        Index("ix_transfers_sender", "sender_account", "timestamp"),
        Index("ix_transfers_receiver", "receiver_account", "timestamp"),
    )


# ─── Signals ────────────────────────────────────────────
class Signal(Base):
    __tablename__ = "signals"

    id = Column(String(32), primary_key=True, default=gen_id)
    account_db_id = Column(String(32), ForeignKey("accounts.id"), nullable=True, index=True)
    alert_id = Column(String(32), ForeignKey("alerts.id"), nullable=True, index=True)
    signal_type = Column(String(30), nullable=False)  # FAN_IN_OUT, CYCLE, PASS_THROUGH, NEW_CLUSTER, BEHAVIORAL, ML, WATCHLIST
    weight = Column(Float, default=0.0)
    raw_value = Column(Float, default=0.0)
    weighted_score = Column(Float, default=0.0)
    evidence_json = Column(Text, nullable=True)  # Structured evidence
    reason = Column(Text, nullable=True)  # Human-readable reason
    guard_penalty = Column(Float, default=0.0)  # Reduction from false-positive guard
    guard_reason = Column(Text, nullable=True)

    account = relationship("Account", back_populates="signals")
    alert = relationship("Alert", back_populates="signals")


# ─── Alerts ─────────────────────────────────────────────
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(32), primary_key=True, default=gen_id)
    run_id = Column(String(32), ForeignKey("runs.id"), nullable=False, index=True)
    account_id = Column(String(100), nullable=False, index=True)
    risk_score = Column(Float, default=0.0, index=True)
    risk_band = Column(String(10), default="LOW")
    confidence = Column(String(10), default="LOW")  # LOW, MEDIUM, HIGH
    reason = Column(Text, nullable=True)  # Plain-language summary
    reason_simple = Column(Text, nullable=True)  # Simplified "explain like I'm new" version
    next_action = Column(Text, nullable=True)  # Suggested next step
    innocent_reason = Column(Text, nullable=True)  # "Why this might be innocent"
    status = Column(String(20), default="UNREVIEWED")
    case_id = Column(String(32), ForeignKey("cases.id"), nullable=True, index=True)
    ring_id = Column(String(32), nullable=True, index=True)
    total_flow = Column(Float, default=0.0)
    config_version = Column(String(32), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    run = relationship("Run", back_populates="alerts")
    signals = relationship("Signal", back_populates="alert", cascade="all, delete-orphan")
    case = relationship("Case", back_populates="alerts")

    __table_args__ = (Index("ix_alerts_score_status", "risk_score", "status"),)


# ─── Cases ──────────────────────────────────────────────
class Case(Base):
    __tablename__ = "cases"

    id = Column(String(32), primary_key=True, default=gen_id)
    title = Column(String(500), nullable=True)
    ring_id = Column(String(32), nullable=True)
    status = Column(String(20), default="UNREVIEWED")  # UNREVIEWED, IN_REVIEW, NEEDS_INFO, CONFIRMED, FREEZE_DRAFTED, FREEZE_APPROVED, REPORT_FILED, CLEARED
    priority = Column(String(10), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    assignee_id = Column(String(32), ForeignKey("users.id"), nullable=True)
    sla_due_at = Column(DateTime, nullable=True)
    total_accounts = Column(Integer, default=0)
    total_flow = Column(Float, default=0.0)
    created_by = Column(String(32), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    alerts = relationship("Alert", back_populates="case")
    decisions = relationship("Decision", back_populates="case", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="case", cascade="all, delete-orphan")
    freeze_requests = relationship("FreezeRequest", back_populates="case", cascade="all, delete-orphan")


# ─── Rings ──────────────────────────────────────────────
class Ring(Base):
    __tablename__ = "rings"

    id = Column(String(32), primary_key=True, default=gen_id)
    run_id = Column(String(32), ForeignKey("runs.id"), nullable=False, index=True)
    ring_label = Column(String(20), nullable=True)  # R-01, R-02, etc.
    member_count = Column(Integer, default=0)
    total_flow = Column(Float, default=0.0)
    time_span_minutes = Column(Float, default=0.0)
    risk_score = Column(Float, default=0.0)
    entry_accounts_json = Column(Text, nullable=True)  # JSON array - victim-facing
    exit_accounts_json = Column(Text, nullable=True)  # JSON array - cash-out
    member_accounts_json = Column(Text, nullable=True)  # JSON array
    layout_json = Column(Text, nullable=True)  # Precomputed node positions
    created_at = Column(DateTime, default=utcnow)

    run = relationship("Run", back_populates="rings")


# ─── Decisions ──────────────────────────────────────────
class Decision(Base):
    __tablename__ = "decisions"

    id = Column(String(32), primary_key=True, default=gen_id)
    case_id = Column(String(32), ForeignKey("cases.id"), nullable=True, index=True)
    account_id = Column(String(100), nullable=False, index=True)
    action = Column(String(20), nullable=False)  # CONFIRM, CLEAR, NEEDS_INFO, REOPEN
    note = Column(Text, nullable=True)
    user_id = Column(String(32), ForeignKey("users.id"), nullable=False)
    is_undone = Column(Boolean, default=False)
    undone_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    case = relationship("Case", back_populates="decisions")
    user = relationship("User", back_populates="decisions")


# ─── Notes ──────────────────────────────────────────────
class Note(Base):
    __tablename__ = "notes"

    id = Column(String(32), primary_key=True, default=gen_id)
    case_id = Column(String(32), ForeignKey("cases.id"), nullable=False, index=True)
    user_id = Column(String(32), ForeignKey("users.id"), nullable=False)
    username = Column(String(100), nullable=True)
    content = Column(Text, nullable=False)
    mentions_json = Column(Text, nullable=True)  # JSON array of @mentioned usernames
    created_at = Column(DateTime, default=utcnow)

    case = relationship("Case", back_populates="notes")


# ─── Freeze Requests ───────────────────────────────────
class FreezeRequest(Base):
    __tablename__ = "freeze_requests"

    id = Column(String(32), primary_key=True, default=gen_id)
    case_id = Column(String(32), ForeignKey("cases.id"), nullable=False, index=True)
    account_ids_json = Column(Text, nullable=False)  # JSON array
    total_recoverable = Column(Float, default=0.0)
    status = Column(String(20), default="DRAFTED")  # DRAFTED, APPROVED, REJECTED
    maker_id = Column(String(32), ForeignKey("users.id"), nullable=False)
    maker_note = Column(Text, nullable=True)
    checker_id = Column(String(32), ForeignKey("users.id"), nullable=True)
    checker_note = Column(Text, nullable=True)
    decided_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    case = relationship("Case", back_populates="freeze_requests")


# ─── Watchlist ──────────────────────────────────────────
class WatchlistEntry(Base):
    __tablename__ = "watchlist"

    id = Column(String(32), primary_key=True, default=gen_id)
    account_id = Column(String(100), nullable=False, index=True)
    source = Column(String(100), nullable=True)  # e.g., "Run R-12", "Imported 2024-01-15"
    reason = Column(Text, nullable=True)
    device_id = Column(String(100), nullable=True)
    kyc_hash = Column(String(64), nullable=True)
    added_by = Column(String(32), nullable=True)
    added_at = Column(DateTime, default=utcnow)
    is_active = Column(Boolean, default=True)


# ─── Config Versions ───────────────────────────────────
class ConfigVersion(Base):
    __tablename__ = "config_versions"

    id = Column(String(32), primary_key=True, default=gen_id)
    version_label = Column(String(50), nullable=True)
    config_json = Column(Text, nullable=False)
    changed_by = Column(String(32), nullable=True)
    change_reason = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)


# ─── Learned Weights ───────────────────────────────────
class LearnedWeight(Base):
    __tablename__ = "learned_weights"

    id = Column(String(32), primary_key=True, default=gen_id)
    signal_type = Column(String(30), nullable=False, unique=True)
    default_weight = Column(Float, nullable=False)
    learned_weight = Column(Float, nullable=False)
    confirmed_hits = Column(Integer, default=0)
    cleared_hits = Column(Integer, default=0)
    is_applied = Column(Boolean, default=False)
    approved_by = Column(String(32), nullable=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


# ─── Audit Log ──────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(100), nullable=False, index=True)
    user_id = Column(String(32), nullable=False, index=True)
    username = Column(String(100), nullable=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(String(100), nullable=True)
    details_json = Column(Text, nullable=True)
    prev_hash = Column(String(64), nullable=False)
    hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=utcnow, index=True)


# ─── Jobs ───────────────────────────────────────────────
class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(32), primary_key=True, default=gen_id)
    run_id = Column(String(32), ForeignKey("runs.id"), nullable=True, index=True)
    job_type = Column(String(30), nullable=False)  # INGEST, TRACE, REPORT, BENCHMARK
    status = Column(String(20), default="PENDING")  # PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    progress = Column(Float, default=0.0)  # 0.0 to 1.0
    current_stage = Column(String(50), nullable=True)
    result_json = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_by = Column(String(32), nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)


# ─── Reports ───────────────────────────────────────────
class Report(Base):
    __tablename__ = "reports"

    id = Column(String(32), primary_key=True, default=gen_id)
    case_id = Column(String(32), ForeignKey("cases.id"), nullable=True)
    report_type = Column(String(20), nullable=False)  # PDF, JSON, STR_DRAFT
    filename = Column(String(500), nullable=True)
    file_path = Column(String(1000), nullable=True)
    generated_by = Column(String(32), nullable=True)
    created_at = Column(DateTime, default=utcnow)


# ─── Trace Results ──────────────────────────────────────
class TraceResult(Base):
    __tablename__ = "trace_results"

    id = Column(String(32), primary_key=True, default=gen_id)
    run_id = Column(String(32), ForeignKey("runs.id"), nullable=False)
    victim_account = Column(String(100), nullable=False)
    start_ts = Column(DateTime, nullable=False)
    stolen_amount = Column(Float, nullable=False)
    total_recovered = Column(Float, default=0.0)
    recovery_pct = Column(Float, default=0.0)
    hops_json = Column(Text, nullable=True)  # JSON array of hop objects
    terminals_json = Column(Text, nullable=True)  # JSON array
    freeze_priority_json = Column(Text, nullable=True)  # JSON array
    frames_json = Column(Text, nullable=True)  # JSON array of replay frames
    created_at = Column(DateTime, default=utcnow)
