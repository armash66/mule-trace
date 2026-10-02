"""Fan-in → Fan-out detector.

Pattern: account receives from ≥ N_in distinct senders within a burst window,
then sends to ≥ N_out distinct receivers within T_window of the inflow burst.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import timedelta
from typing import Any

from app.core.config import DetectorThresholds
from app.engine.graph import GraphStore

logger = logging.getLogger(__name__)

SIGNAL_TYPE = "FAN_IN_OUT"


def detect_fan_in_out(
    store: GraphStore,
    thresholds: DetectorThresholds,
) -> list[dict[str, Any]]:
    """Detect fan-in → fan-out patterns.

    Algorithm:
    1. For each account, collect incoming edges sorted by time.
    2. Sliding window over inflows to find burst (≥ N_in senders within burst_window).
    3. For each burst, check outflows in [burst_end, burst_end + T_window].
    4. If ≥ N_out distinct receivers and outflow ≥ outflow_ratio × inflow → flag.
    """
    results: list[dict[str, Any]] = []
    n_in = thresholds.fan_in_min_senders
    n_out = thresholds.fan_out_min_receivers
    burst_window = timedelta(minutes=thresholds.fan_burst_window_min)
    outflow_window = timedelta(minutes=thresholds.fan_outflow_window_min)
    min_outflow_ratio = thresholds.fan_outflow_ratio

    for account_id, in_edges in store.sorted_in_edges.items():
        if len(in_edges) < n_in:
            continue

        out_edges = store.sorted_edges.get(account_id, [])
        if len(out_edges) < n_out:
            continue

        # Sliding window over inflows to find bursts
        best_burst = _find_best_burst(in_edges, n_in, burst_window)
        if best_burst is None:
            continue

        burst_start, burst_end, burst_senders, burst_amount = best_burst

        # Check outflows after burst
        outflow_start = burst_end
        outflow_deadline = burst_end + outflow_window
        outflow_receivers: set[str] = set()
        outflow_amount = 0.0
        outflow_edges: list[dict] = []
        first_out = None
        last_out = None

        for edge in out_edges:
            ts = edge["timestamp"]
            if ts < outflow_start:
                continue
            if ts > outflow_deadline:
                break
            outflow_receivers.add(edge["target"])
            outflow_amount += edge["amount"]
            outflow_edges.append(edge)
            if first_out is None:
                first_out = ts
            last_out = ts

        if len(outflow_receivers) < n_out:
            continue

        outflow_ratio = outflow_amount / burst_amount if burst_amount > 0 else 0
        if outflow_ratio < min_outflow_ratio:
            continue

        # Calculate hold time
        hold_time_min = 0.0
        if first_out and burst_end:
            hold_time_min = (first_out - burst_end).total_seconds() / 60.0

        # Calculate score contribution (0-1 scale, will be weighted later)
        # Score grows with: distinct senders, speed, outflow ratio
        sender_factor = min(len(burst_senders) / 10.0, 1.0)  # Cap at 10
        speed_factor = max(0, 1.0 - hold_time_min / 60.0)  # Faster = higher
        ratio_factor = outflow_ratio
        raw_score = (sender_factor * 0.4 + speed_factor * 0.3 + ratio_factor * 0.3)

        evidence = {
            "burst_senders": len(burst_senders),
            "burst_amount": round(burst_amount, 2),
            "burst_start": str(burst_start),
            "burst_end": str(burst_end),
            "outflow_receivers": len(outflow_receivers),
            "outflow_amount": round(outflow_amount, 2),
            "outflow_ratio": round(outflow_ratio, 3),
            "hold_time_minutes": round(hold_time_min, 1),
            "first_inflow": str(burst_start),
            "last_outflow": str(last_out) if last_out else None,
            "transfer_ids": [e["txn_id"] for e in outflow_edges[:20]],  # Cap evidence
        }

        # Build human-readable reason
        acct_info = store.accounts.get(account_id, {})
        reason = (
            f"{account_id} received ₹{burst_amount:,.0f} from {len(burst_senders)} accounts "
            f"between {burst_start:%H:%M} and {burst_end:%H:%M}, "
            f"forwarded {outflow_ratio:.0%} to {len(outflow_receivers)} accounts "
            f"within {hold_time_min:.0f} minutes"
        )
        if acct_info.get("age_days") is not None and acct_info["age_days"] < 30:
            reason += f". The account is {acct_info['age_days']} days old"

        results.append({
            "account_id": account_id,
            "signal_type": SIGNAL_TYPE,
            "raw_value": raw_score,
            "evidence": evidence,
            "reason": reason,
        })

    logger.info(f"Fan-in/Fan-out detector: {len(results)} alerts")
    return results


def _find_best_burst(
    in_edges: list[dict],
    min_senders: int,
    window: timedelta,
) -> tuple | None:
    """Find the densest inflow burst using a two-pointer sliding window.
    
    Returns (burst_start, burst_end, sender_set, total_amount) or None.
    """
    if not in_edges:
        return None

    best = None
    best_amount = 0.0

    left = 0
    sender_counts: dict[str, int] = defaultdict(int)
    window_amount = 0.0

    for right in range(len(in_edges)):
        # Expand window
        sender = in_edges[right]["source"]
        sender_counts[sender] += 1
        window_amount += in_edges[right]["amount"]

        # Shrink window if too wide
        while in_edges[right]["timestamp"] - in_edges[left]["timestamp"] > window:
            old_sender = in_edges[left]["source"]
            sender_counts[old_sender] -= 1
            if sender_counts[old_sender] == 0:
                del sender_counts[old_sender]
            window_amount -= in_edges[left]["amount"]
            left += 1

        # Check if we have enough distinct senders
        if len(sender_counts) >= min_senders and window_amount > best_amount:
            best_amount = window_amount
            best = (
                in_edges[left]["timestamp"],
                in_edges[right]["timestamp"],
                set(sender_counts.keys()),
                window_amount,
            )

    return best
