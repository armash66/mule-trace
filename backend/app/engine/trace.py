"""Victim-to-cash-out trace with proportional-split propagation and freeze planner."""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.pii import mask_account_id
from app.engine.graph import GraphStore

logger = logging.getLogger(__name__)


def trace_funds(
    store: GraphStore,
    victim_account: str,
    start_ts: datetime,
    stolen_amount: float | None = None,
    window_min: int = 60,
    max_depth: int = 6,
) -> dict[str, Any]:
    """Trace stolen funds from victim through the network.

    Uses proportional-split propagation: at each hop, tracked money splits
    across outgoing transfers in proportion to amount.

    Returns hops, terminals, freeze priority, and replay frames.
    """
    window = timedelta(minutes=window_min)

    # Find victim's outgoing transfers after start_ts
    out_edges = store.sorted_edges.get(victim_account, [])
    victim_transfers = [
        e for e in out_edges
        if e["timestamp"] >= start_ts and e["timestamp"] <= start_ts + window
    ]

    if not victim_transfers:
        return _empty_trace(victim_account, stolen_amount or 0)

    if stolen_amount is None:
        stolen_amount = sum(e["amount"] for e in victim_transfers)

    # BFS propagation with proportional splitting
    hops: list[dict[str, Any]] = []
    terminals: list[dict[str, Any]] = []
    node_tracked: dict[str, float] = {victim_account: stolen_amount}
    visited: set[str] = {victim_account}
    frames: list[dict[str, Any]] = []

    # Initial frame
    frames.append({
        "t": start_ts.isoformat(),
        "active_edges": [],
        "node_states": {victim_account: "victim"},
        "totals": {"in_motion": stolen_amount, "parked": 0.0, "exited": 0.0},
    })

    # Add victim hop
    hops.append({
        "hop": 0,
        "account_id": mask_account_id(victim_account),
        "account_id_raw": victim_account,
        "time": start_ts.isoformat(),
        "amount_tracked": stolen_amount,
        "pct_of_theft": 1.0,
        "risk_score": store.accounts.get(victim_account, {}).get("risk_score", 0),
        "status": "victim",
    })

    # BFS queue: (account, tracked_amount, depth, arrival_time)
    queue: list[tuple[str, float, int, datetime]] = []
    for edge in victim_transfers:
        proportion = edge["amount"] / stolen_amount if stolen_amount > 0 else 0
        tracked = stolen_amount * proportion
        queue.append((edge["target"], tracked, 1, edge["timestamp"]))

        # Frame for this transfer
        frames.append({
            "t": edge["timestamp"].isoformat(),
            "active_edges": [edge["txn_id"]],
            "node_states": {
                victim_account: "victim",
                edge["target"]: "in_motion",
            },
            "totals": {"in_motion": tracked, "parked": 0.0, "exited": 0.0},
        })

    total_parked = 0.0
    total_exited = 0.0
    total_in_motion = stolen_amount

    while queue:
        account, tracked_amount, depth, arrival_time = queue.pop(0)

        if tracked_amount < 1.0:  # Below ₹1 threshold
            continue

        if account in visited and depth > 1:
            # Cycle detected — mark as looped
            hops.append({
                "hop": depth,
                "account_id": mask_account_id(account),
                "account_id_raw": account,
                "time": arrival_time.isoformat(),
                "amount_tracked": round(tracked_amount, 2),
                "pct_of_theft": round(tracked_amount / stolen_amount, 4),
                "risk_score": store.accounts.get(account, {}).get("risk_score", 0),
                "status": "looped",
            })
            continue

        visited.add(account)

        # Find outgoing transfers within window of arrival
        out_edges = store.sorted_edges.get(account, [])
        forward_edges = [
            e for e in out_edges
            if e["timestamp"] >= arrival_time
            and e["timestamp"] <= arrival_time + window
        ]

        forwarded_total = sum(e["amount"] for e in forward_edges)

        if not forward_edges or depth >= max_depth:
            # Terminal: holding or exited
            is_cashout = any(
                e.get("channel") in {"ATM", "MERCHANT", "WALLET"}
                for e in forward_edges
            ) if forward_edges else False

            status = "exited" if is_cashout else "holding"

            hops.append({
                "hop": depth,
                "account_id": mask_account_id(account),
                "account_id_raw": account,
                "time": arrival_time.isoformat(),
                "amount_tracked": round(tracked_amount, 2),
                "pct_of_theft": round(tracked_amount / stolen_amount, 4),
                "risk_score": store.accounts.get(account, {}).get("risk_score", 0),
                "status": status,
            })

            terminals.append({
                "account_id": mask_account_id(account),
                "account_id_raw": account,
                "amount": round(tracked_amount, 2),
                "pct": round(tracked_amount / stolen_amount, 4),
                "status": status,
                "hop": depth,
            })

            if status == "exited":
                total_exited += tracked_amount
            else:
                total_parked += tracked_amount
            total_in_motion -= tracked_amount
            continue

        # Proportional split across outgoing
        amount_forwarded = 0.0
        for edge in forward_edges:
            if forwarded_total > 0:
                proportion = edge["amount"] / forwarded_total
            else:
                proportion = 1.0 / len(forward_edges)

            edge_tracked = tracked_amount * proportion
            amount_forwarded += edge_tracked

            queue.append((edge["target"], edge_tracked, depth + 1, edge["timestamp"]))

            frames.append({
                "t": edge["timestamp"].isoformat(),
                "active_edges": [edge["txn_id"]],
                "node_states": {account: "forwarded", edge["target"]: "in_motion"},
                "totals": {
                    "in_motion": round(total_in_motion, 2),
                    "parked": round(total_parked, 2),
                    "exited": round(total_exited, 2),
                },
            })

        # Record hop
        held = tracked_amount - amount_forwarded
        hops.append({
            "hop": depth,
            "account_id": mask_account_id(account),
            "account_id_raw": account,
            "time": arrival_time.isoformat(),
            "amount_tracked": round(tracked_amount, 2),
            "pct_of_theft": round(tracked_amount / stolen_amount, 4),
            "risk_score": store.accounts.get(account, {}).get("risk_score", 0),
            "status": "forwarded",
        })

    # Build freeze priority
    freeze_priority = _build_freeze_priority(terminals, stolen_amount)

    # Calculate total recovery
    recoverable = sum(t["amount"] for t in terminals if t["status"] == "holding")

    return {
        "victim_account": mask_account_id(victim_account),
        "stolen_amount": stolen_amount,
        "total_recovered": round(recoverable, 2),
        "recovery_pct": round(recoverable / stolen_amount, 4) if stolen_amount > 0 else 0,
        "hops": hops,
        "terminals": terminals,
        "freeze_priority": freeze_priority,
        "frames": frames,
    }


def _build_freeze_priority(
    terminals: list[dict[str, Any]],
    stolen_amount: float,
) -> list[dict[str, Any]]:
    """Rank holding accounts by recoverable amount × recency for freeze recommendation."""
    holding = [t for t in terminals if t["status"] == "holding"]
    # Sort by amount descending
    holding.sort(key=lambda t: t["amount"], reverse=True)

    priority: list[dict[str, Any]] = []
    running_total = 0.0

    for t in holding:
        running_total += t["amount"]
        priority.append({
            "account_id": t["account_id"],
            "account_id_raw": t.get("account_id_raw", ""),
            "recoverable_amount": t["amount"],
            "cumulative_recovery": round(running_total, 2),
            "cumulative_pct": round(running_total / stolen_amount, 4) if stolen_amount > 0 else 0,
            "hop": t["hop"],
            "recommendation": "FREEZE FIRST" if running_total / max(stolen_amount, 1) <= 0.8 else "FREEZE",
        })

    return priority


def _empty_trace(victim_account: str, stolen_amount: float) -> dict[str, Any]:
    """Return empty trace result."""
    return {
        "victim_account": mask_account_id(victim_account),
        "stolen_amount": stolen_amount,
        "total_recovered": 0,
        "recovery_pct": 0,
        "hops": [],
        "terminals": [],
        "freeze_priority": [],
        "frames": [],
    }
