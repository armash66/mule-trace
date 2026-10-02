"""Pydantic v2 schemas for MuleTrace API and detectors.

Every request/response model lives here — the single source of truth
for the data contract between backend modules and the frontend.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


# ── Detector output ─────────────────────────────────────────────────────────────


class Finding(BaseModel):
    """Single detector finding for one account."""

    account_id: str
    pattern: Literal["fan", "cycle", "chain", "cluster", "dormancy", "community"]
    strength: float = Field(ge=0, le=1)
    evidence: dict[str, Any]
    related_accounts: list[str]


# ── Scored account ──────────────────────────────────────────────────────────────


class ScoredAccount(BaseModel):
    """Final scored account with all patterns and reasons."""

    account_id: str
    risk_score: int = Field(ge=0, le=100)
    patterns: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    tainted_balance: float = Field(default=0.0)
    status: str | None = Field(default=None)


# ── API request / response models ───────────────────────────────────────────────


class IngestResponse(BaseModel):
    run_id: str
    txn_count: int
    acct_count: int
    flagged_count: int
    dropped_duplicates: int
    dropped_self_transfers: int
    dropped_bad_rows: int


class DecisionIn(BaseModel):
    status: Literal["confirmed", "cleared"]
    note: str = Field(min_length=1)
    analyst: str = Field(min_length=1)


class DecisionOut(BaseModel):
    status: str
    note: str
    analyst: str
    timestamp: str


class AccountListItem(BaseModel):
    account_id: str
    risk_score: int
    patterns: list[str]
    reason: str
    status: str | None = None


class AccountListResponse(BaseModel):
    items: list[AccountListItem]
    total: int
    page: int
    page_size: int


class AccountDetail(BaseModel):
    account_id: str
    risk_score: int
    patterns: list[str]
    reasons: list[str]
    findings: list[Finding]
    features: dict[str, float]
    decisions: list[DecisionOut]
    age_days: int | None = None


class NetworkNode(BaseModel):
    id: str
    score: int = 0
    patterns: list[str] = Field(default_factory=list)
    age_days: int = 0


class NetworkEdge(BaseModel):
    src: str
    dst: str
    total_amount: float
    count: int
    first_time: str


class NetworkResponse(BaseModel):
    nodes: list[NetworkNode]
    edges: list[NetworkEdge]


class StatsResponse(BaseModel):
    total_accounts: int = 0
    flagged_count: int = 0
    confirmed_count: int = 0
    cleared_count: int = 0
    precision: float | None = None
    run_id: str | None = None


# ── Analytics & Explainability Schemas ─────────────────────────────────────────


class TaintAccountResult(BaseModel):
    account_id: str
    tainted_in: float
    tainted_out: float
    tainted_balance_remaining: float
    cashed_out: float


class FreezeAlternative(BaseModel):
    account_ids: list[str]
    rupees_stopped: float
    rupees_lost: float
    efficiency: float


class FreezePlanResponse(BaseModel):
    ring_id: str
    recommended_freeze_accounts: list[str]
    rupees_stopped: float
    rupees_lost: float
    total_tainted: float
    alternatives: list[FreezeAlternative] = Field(default_factory=list)


class ReplayEvent(BaseModel):
    timestamp: str
    src: str
    dst: str
    amount: float
    tainted_amount: float
    status: str = "transferred"
    is_freeze_point: bool = False


class ReplayResponse(BaseModel):
    ring_id: str
    events: list[ReplayEvent]
    total_amount: float
    total_tainted: float
    stoppable_rupees: float
    accounts: list[str]


class DiscoveredRing(BaseModel):
    ring_id: str
    pattern: str
    accounts: list[str]
    mean_risk: float
    internal_flow_ratio: float
    density: float
    estimated_at_risk: float
    explanation: str


class ExplainResponse(BaseModel):
    account_id: str
    risk_score: int
    top_features: list[dict[str, Any]]
    counterfactual: str
    shap_values: dict[str, float]


class DataHealthReport(BaseModel):
    run_id: str
    duplicates_removed: int
    out_of_order_fixed: int
    missing_device_pct: float
    missing_ip_pct: float
    self_transfers_dropped: int
    total_transactions: int
    total_accounts: int


class FreezeRequestCreate(BaseModel):
    ring_id: str
    account_ids: list[str]
    amount: float
    note: str | None = None


class FreezeRequestUpdate(BaseModel):
    status: Literal["drafted", "sent", "held", "recovered", "missed"]
    note: str | None = None


class FreezeRequestOut(BaseModel):
    id: int
    ring_id: str
    account_ids: list[str]
    amount: float
    status: str
    note: str | None = None
    created_at: str
    updated_at: str


class CaseReport(BaseModel):
    ring_id: str
    pattern: str
    summary_sentence: str
    accounts: list[dict[str, Any]]
    transfer_timeline: list[dict[str, Any]]
    freeze_plan: FreezePlanResponse | None = None
    draft_str: str
    analyst_notes: list[str] = Field(default_factory=list)


# ── Phase 8b Data Hub schemas ───────────────────────────────────────────────────


class FileInfo(BaseModel):
    filename: str
    size_bytes: int
    detected_type: Literal["transactions", "accounts", "ambiguous"]
    row_count: int
    columns: list[str]


class ColumnMappingItem(BaseModel):
    source_column: str | None
    confidence: Literal["Matched", "Check", "Unmapped"]
    sample_values: list[Any] = Field(default_factory=list)


class UploadResponse(BaseModel):
    upload_id: str
    files: list[FileInfo]
    detected_file_types: dict[str, str]
    suggested_mapping: dict[str, dict[str, ColumnMappingItem]]
    preview: dict[str, list[dict[str, Any]]]
    has_accounts: bool
    reduced_mode_note: str | None = None


class SaveMappingRequest(BaseModel):
    transactions_mapping: dict[str, Any] | None = None
    transactions: dict[str, Any] | None = None
    accounts_mapping: dict[str, Any] | None = None
    accounts: dict[str, Any] | None = None
    timezone: str = "Asia/Kolkata"
    date_format: str | None = None



class ValidationIssue(BaseModel):
    severity: Literal["info", "warn", "error"]
    field: str | None = None
    message: str
    effect: str
    row_index: int | None = None


class ValidationReport(BaseModel):
    upload_id: str
    total_rows: int
    date_range: dict[str, str]
    unique_accounts: int
    duplicates_removed: int
    out_of_order_fixed: int
    self_transfers_dropped: int
    missing_device_pct: float
    missing_ip_pct: float
    amount_stats: dict[str, float]
    rejected_rows_count: int
    issues: list[ValidationIssue]
    preview_rows: list[dict[str, Any]]
    cell_issues: list[dict[str, Any]] = Field(default_factory=list)
    can_proceed: bool


class CreateRunRequest(BaseModel):
    upload_id: str
    name: str | None = None
    config_preset: Literal["default", "strict", "sensitive"] = "default"


class RunStatusResponse(BaseModel):
    run_id: str
    status: Literal["running", "completed", "failed", "cancelled"]
    stage: Literal["validate", "build_graph", "detect", "score", "trace_money", "completed", "failed"]
    percent: int
    elapsed_seconds: float
    stage_timings: dict[str, float] = Field(default_factory=dict)
    error: str | None = None
    summary: dict[str, Any] | None = None


class PatchRunRequest(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class GenerateDatasetRequest(BaseModel):
    seed: int = 42
    size: Literal["small", "medium", "large"] = "small"
    evasion: float | None = None
    evasion_level: float | None = None
    decoys: bool | None = None
    include_decoys: bool | None = None


