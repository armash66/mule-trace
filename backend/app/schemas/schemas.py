"""Pydantic v2 schemas for API request/response validation."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


# ─── Auth ───────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    username: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ─── Common ─────────────────────────────────────────────
class Pagination(BaseModel):
    cursor: str | None = None
    limit: int = Field(default=50, ge=1, le=200)
    total: int = 0
    has_more: bool = False


class ApiResponse(BaseModel):
    data: Any = None
    error: dict[str, str] | None = None
    meta: dict[str, Any] | None = None


# ─── Runs ───────────────────────────────────────────────
class RunSummary(BaseModel):
    id: str
    status: str
    filename: str | None = None
    total_rows: int = 0
    valid_rows: int = 0
    total_accounts: int = 0
    total_alerts: int = 0
    total_rings: int = 0
    created_at: datetime | None = None
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class DataQuality(BaseModel):
    total_rows: int = 0
    valid_rows: int = 0
    duplicate_rows: int = 0
    invalid_rows: int = 0
    missing_balances: int = 0
    missing_device_ip: int = 0
    bad_timestamps: int = 0
    has_balances: bool = False
    has_device_ip: bool = False
    warnings: list[str] = Field(default_factory=list)


# ─── Alerts ─────────────────────────────────────────────
class SignalDetail(BaseModel):
    signal_type: str
    weight: float = 0.0
    raw_value: float = 0.0
    weighted_score: float = 0.0
    evidence: dict[str, Any] | None = None
    reason: str | None = None
    guard_penalty: float = 0.0
    guard_reason: str | None = None


class AlertSummary(BaseModel):
    id: str
    account_id: str  # Masked
    risk_score: float
    risk_band: str
    confidence: str
    reason: str | None = None
    reason_simple: str | None = None
    next_action: str | None = None
    innocent_reason: str | None = None
    status: str
    ring_id: str | None = None
    ring_label: str | None = None
    total_flow: float = 0.0
    signal_types: list[str] = Field(default_factory=list)
    signals: list[SignalDetail] = Field(default_factory=list)
    case_id: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AlertFilter(BaseModel):
    band: str | None = None
    status: str | None = None
    ring_id: str | None = None
    signal: str | None = None
    min_score: float | None = None
    max_score: float | None = None
    q: str | None = None
    sort: str = "-risk_score"
    cursor: str | None = None
    limit: int = Field(default=50, ge=1, le=200)


# ─── Accounts ──────────────────────────────────────────
class AccountProfile(BaseModel):
    id: str
    account_id: str  # Masked
    account_id_raw: str | None = None  # Only after reveal
    open_date: datetime | None = None
    age_days: int | None = None
    segment: str | None = None
    in_degree: int = 0
    out_degree: int = 0
    total_in: float = 0.0
    total_out: float = 0.0
    net_flow: float = 0.0
    risk_score: float = 0.0
    risk_band: str = "LOW"
    ring_id: str | None = None
    status: str = "UNREVIEWED"
    is_flagged: bool = False
    signals: list[SignalDetail] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class RevealRequest(BaseModel):
    reason: str = Field(min_length=5, description="Reason for revealing PII")


# ─── Network ───────────────────────────────────────────
class GraphNode(BaseModel):
    id: str
    label: str  # Masked
    risk: float = 0.0
    band: str = "LOW"
    age_days: int | None = None
    ring_id: str | None = None
    status: str = "UNREVIEWED"
    signals: list[str] = Field(default_factory=list)
    flow_through: float = 0.0
    x: float = 0.0
    y: float = 0.0


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    amount: float
    ts: datetime
    channel: str | None = None


class NetworkResponse(BaseModel):
    center: str
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    truncated: bool = False


# ─── Cases ──────────────────────────────────────────────
class CaseCreate(BaseModel):
    title: str | None = None
    ring_id: str | None = None
    alert_ids: list[str] = Field(default_factory=list)
    priority: str = "MEDIUM"


class CaseUpdate(BaseModel):
    status: str | None = None
    assignee_id: str | None = None
    priority: str | None = None
    title: str | None = None


class CaseSummary(BaseModel):
    id: str
    title: str | None = None
    ring_id: str | None = None
    status: str
    priority: str
    assignee_id: str | None = None
    assignee_name: str | None = None
    sla_due_at: datetime | None = None
    total_accounts: int = 0
    total_flow: float = 0.0
    alert_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


# ─── Decisions ──────────────────────────────────────────
class DecisionCreate(BaseModel):
    account_id: str
    action: Literal["CONFIRM", "CLEAR", "NEEDS_INFO", "REOPEN"]
    case_id: str | None = None
    note: str | None = None


class DecisionResponse(BaseModel):
    id: str
    account_id: str
    action: str
    note: str | None = None
    user_id: str
    username: str | None = None
    is_undone: bool = False
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ─── Notes ──────────────────────────────────────────────
class NoteCreate(BaseModel):
    content: str = Field(min_length=1)


class NoteResponse(BaseModel):
    id: str
    case_id: str
    user_id: str
    username: str | None = None
    content: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ─── Freeze Requests ───────────────────────────────────
class FreezeRequestCreate(BaseModel):
    case_id: str
    account_ids: list[str]
    total_recoverable: float = 0.0
    note: str | None = None


class FreezeRequestResponse(BaseModel):
    id: str
    case_id: str
    account_ids: list[str] = Field(default_factory=list)
    total_recoverable: float = 0.0
    status: str
    maker_id: str
    maker_note: str | None = None
    checker_id: str | None = None
    checker_note: str | None = None
    decided_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class FreezeApprovalRequest(BaseModel):
    note: str | None = None


# ─── Trace ──────────────────────────────────────────────
class TraceRequest(BaseModel):
    victim_account: str
    start_ts: datetime | None = None
    stolen_amount: float | None = None
    window_min: int = 60
    max_depth: int = 6
    run_id: str | None = None


class TraceHop(BaseModel):
    hop: int
    account_id: str
    time: datetime
    amount_tracked: float
    pct_of_theft: float
    risk_score: float = 0.0
    status: str = "forwarded"  # holding, forwarded, exited


class TraceResponse(BaseModel):
    id: str
    victim_account: str
    stolen_amount: float
    total_recovered: float = 0.0
    recovery_pct: float = 0.0
    hops: list[TraceHop] = Field(default_factory=list)
    terminals: list[dict[str, Any]] = Field(default_factory=list)
    freeze_priority: list[dict[str, Any]] = Field(default_factory=list)
    frame_count: int = 0


class ReplayFrame(BaseModel):
    t: datetime
    active_edges: list[str] = Field(default_factory=list)
    node_states: dict[str, str] = Field(default_factory=dict)
    totals: dict[str, float] = Field(default_factory=dict)


# ─── Watchlist ──────────────────────────────────────────
class WatchlistAdd(BaseModel):
    account_id: str
    source: str | None = None
    reason: str | None = None
    device_id: str | None = None


class WatchlistResponse(BaseModel):
    id: str
    account_id: str
    source: str | None = None
    reason: str | None = None
    is_active: bool = True
    added_at: datetime | None = None

    model_config = {"from_attributes": True}


# ─── Config ────────────────────────────────────────────
class ThresholdUpdate(BaseModel):
    thresholds: dict[str, Any]
    reason: str | None = None


class ConfigPreviewRequest(BaseModel):
    thresholds: dict[str, Any]
    run_id: str


class ConfigPreviewResponse(BaseModel):
    current_alerts: int = 0
    proposed_alerts: int = 0
    delta: int = 0
    by_band: dict[str, int] = Field(default_factory=dict)


# ─── Metrics ───────────────────────────────────────────
class MetricsSummary(BaseModel):
    total_runs: int = 0
    total_alerts: int = 0
    total_cases: int = 0
    open_cases: int = 0
    avg_time_to_decision_min: float | None = None
    money_at_risk: float = 0.0
    critical_count: int = 0
    ring_count: int = 0
    precision: float | None = None
    recall: float | None = None


class BenchmarkResult(BaseModel):
    precision: float
    recall: float
    f1: float
    precision_per_detector: dict[str, float] = Field(default_factory=dict)
    recall_per_detector: dict[str, float] = Field(default_factory=dict)
    time_to_detect_ms: dict[str, float] = Field(default_factory=dict)
    false_positive_rate: float = 0.0
    total_planted: int = 0
    total_detected: int = 0
    total_false_positives: int = 0
    freeze_first_recovery_pct: float = 0.0
    naive_recovery_pct: float = 0.0
    analysis_time_sec: float = 0.0


# ─── Synthetic ──────────────────────────────────────────
class SyntheticRequest(BaseModel):
    num_accounts: int = Field(default=5000, ge=100, le=50000)
    num_rings: int = Field(default=10, ge=1, le=30)
    noise_pct: float = Field(default=0.1, ge=0.0, le=0.5)
    seed: int = 42


# ─── Rings ──────────────────────────────────────────────
class RingSummary(BaseModel):
    id: str
    ring_label: str | None = None
    member_count: int = 0
    total_flow: float = 0.0
    time_span_minutes: float = 0.0
    risk_score: float = 0.0
    entry_accounts: list[str] = Field(default_factory=list)
    exit_accounts: list[str] = Field(default_factory=list)
    member_accounts: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


# ─── Reports ───────────────────────────────────────────
class ReportRequest(BaseModel):
    case_id: str
    report_type: Literal["PDF", "JSON", "STR_DRAFT"] = "PDF"
    sections: list[str] | None = None


class ReportResponse(BaseModel):
    id: str
    case_id: str | None = None
    report_type: str
    filename: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ─── SSE Events ────────────────────────────────────────
class SSEEvent(BaseModel):
    stage: str
    data: dict[str, Any] = Field(default_factory=dict)
    progress: float = 0.0
