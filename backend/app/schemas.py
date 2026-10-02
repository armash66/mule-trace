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
    pattern: Literal["fan", "cycle", "chain", "cluster"]
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
