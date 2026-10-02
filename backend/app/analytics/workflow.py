"""Small maker-checker workflow primitives used by the demo freeze flow."""

from __future__ import annotations

import csv
import hashlib
import io
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

Role = Literal["analyst", "maker", "checker"]
RequestStatus = Literal["draft", "submitted", "approved", "rejected"]


@dataclass
class FreezeRequestState:
    request_id: str
    accounts: list[str]
    amounts_at_risk: dict[str, float]
    evidence_links: list[str]
    rule: str
    maker: str
    status: RequestStatus = "draft"
    checker: str | None = None


@dataclass
class AuditEntry:
    actor: str
    action: str
    timestamp: str
    request_id: str | None
    payload_hash: str
    payload: dict[str, Any] = field(default_factory=dict)


class DemoWorkflow:
    """In-memory demo workflow; production persistence belongs in the API database."""

    def __init__(self) -> None:
        self.requests: dict[str, FreezeRequestState] = {}
        self.audit: list[AuditEntry] = []

    def _audit(self, actor: str, action: str, request_id: str | None, payload: dict[str, Any]) -> AuditEntry:
        encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
        entry = AuditEntry(actor, action, datetime.now(timezone.utc).isoformat(), request_id, hashlib.sha256(encoded).hexdigest(), payload)
        self.audit.append(entry)
        return entry

    def create_request(self, request_id: str, accounts: list[str], amounts_at_risk: dict[str, float], evidence_links: list[str], rule: str, maker: str, role: Role) -> FreezeRequestState:
        if role != "maker":
            raise PermissionError("Only the Maker role can generate a freeze request")
        request = FreezeRequestState(request_id, accounts, amounts_at_risk, evidence_links, rule, maker)
        self.requests[request_id] = request
        self._audit(maker, "FREEZE_DRAFT", request_id, {"accounts": accounts, "rule": rule})
        return request

    def submit(self, request_id: str, actor: str, role: Role) -> FreezeRequestState:
        request = self.requests[request_id]
        if role != "maker" or actor != request.maker or request.status != "draft":
            raise PermissionError("Only the request Maker can submit a draft")
        request.status = "submitted"
        self._audit(actor, "FREEZE_SUBMITTED", request_id, {"rule": request.rule})
        return request

    def decide(self, request_id: str, actor: str, role: Role, approved: bool) -> FreezeRequestState:
        request = self.requests[request_id]
        if role != "checker" or actor == request.maker or request.status != "submitted":
            raise PermissionError("A different Checker must decide a submitted request")
        request.checker = actor
        request.status = "approved" if approved else "rejected"
        self._audit(actor, "FREEZE_APPROVED" if approved else "FREEZE_REJECTED", request_id, {"approved": approved})
        return request

    def record_decision(self, actor: str, account_id: str, decision: Literal["confirmed", "cleared"], reason: str) -> AuditEntry:
        if not reason.strip():
            raise ValueError("A decision reason is required")
        return self._audit(actor, "ACCOUNT_CONFIRMED" if decision == "confirmed" else "ACCOUNT_CLEARED", None, {"account_id": account_id, "reason": reason})

    def export_csv(self) -> str:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["actor", "action", "timestamp", "request_id", "payload_hash"])
        writer.writeheader()
        for entry in self.audit:
            writer.writerow({field: getattr(entry, field) or "" for field in writer.fieldnames})
        return output.getvalue()
