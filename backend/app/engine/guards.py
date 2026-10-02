"""False-positive guard.

Detects and annotates legitimate patterns that may look suspicious:
- Merchants/gateways (stable high fan-in over weeks)
- Payroll (monthly fan-out from one sender)
- Landlords/societies (fixed recurring amounts)
- Family pairs (long-history, small amounts)
- Shared office/household devices
"""
from __future__ import annotations

import logging
from collections import Counter, defaultdict
from datetime import timedelta
from typing import Any

from app.engine.graph import GraphStore

logger = logging.getLogger(__name__)


def apply_guards(
    store: GraphStore,
    signals: dict[str, list[dict[str, Any]]],
) -> dict[str, list[dict[str, Any]]]:
    """Apply false-positive guards to detected signals.

    For each flagged account, check if it matches known innocent patterns.
    Add guard_penalty and guard_reason to each signal.
    Returns modified signals dict.
    """
    for account_id, account_signals in signals.items():
        penalties = _check_guards(store, account_id)
        if not penalties:
            continue

        for signal in account_signals:
            total_penalty = sum(p["penalty"] for p in penalties)
            reasons = [p["reason"] for p in penalties]
            signal["guard_penalty"] = total_penalty
            signal["guard_reason"] = "; ".join(reasons)
            signal["guard_details"] = penalties

    return signals


def _check_guards(store: GraphStore, account_id: str) -> list[dict[str, Any]]:
    """Check all guard rules for an account."""
    penalties: list[dict[str, Any]] = []
    data = store.accounts.get(account_id, {})
    in_edges = store.sorted_in_edges.get(account_id, [])
    out_edges = store.sorted_edges.get(account_id, [])

    # ─── Merchant/Gateway pattern ────────────────────────
    # High fan-in that is STABLE over time (not a burst)
    if data.get("in_degree", 0) >= 10:
        if in_edges:
            first = in_edges[0]["timestamp"]
            last = in_edges[-1]["timestamp"]
            span_days = max((last - first).total_seconds() / 86400, 1)
            if span_days >= 14:  # At least 2 weeks of history
                txns_per_day = len(in_edges) / span_days
                # Stable if relatively even distribution
                daily_counts: dict[str, int] = defaultdict(int)
                for e in in_edges:
                    day_key = e["timestamp"].strftime("%Y-%m-%d")
                    daily_counts[day_key] = daily_counts.get(day_key, 0) + 1
                if daily_counts:
                    values = list(daily_counts.values())
                    mean_daily = sum(values) / len(values)
                    if mean_daily >= 3:  # Regular activity
                        penalties.append({
                            "guard": "MERCHANT_GATEWAY",
                            "penalty": 15,
                            "reason": f"Looks like a merchant/gateway: stable fan-in of ~{mean_daily:.0f} txns/day over {span_days:.0f} days",
                            "innocent_explanation": "Merchants naturally receive from many accounts regularly",
                        })

    # ─── Payroll pattern ──────────────────────────────────
    # Monthly fan-out from same sender, similar amounts
    if data.get("out_degree", 0) >= 5:
        # Check if outflows are clustered around month-end/start
        if out_edges:
            amounts = [e["amount"] for e in out_edges]
            unique_amounts = set(round(a, -2) for a in amounts)  # Round to nearest 100
            # Payroll: same approximate amounts to many recipients
            amount_counter = Counter(round(a, -2) for a in amounts)
            most_common_amount, most_common_count = amount_counter.most_common(1)[0]
            if most_common_count >= 3 and most_common_count / len(amounts) > 0.6:
                # Check if from one or few senders
                senders = set(e["source"] for e in in_edges)
                if len(senders) <= 2:
                    penalties.append({
                        "guard": "PAYROLL",
                        "penalty": 12,
                        "reason": f"Looks like payroll: {most_common_count} transfers of ~₹{most_common_amount:,.0f} from {len(senders)} source(s)",
                        "innocent_explanation": "Salary/payroll accounts regularly send similar amounts to multiple recipients",
                    })

    # ─── Landlord/Society pattern ─────────────────────────
    # Fixed recurring amounts from same senders
    if in_edges and len(in_edges) >= 3:
        sender_amounts: dict[str, list[float]] = defaultdict(list)
        for e in in_edges:
            sender_amounts[e["source"]].append(e["amount"])

        recurring_senders = 0
        for sender, amounts in sender_amounts.items():
            if len(amounts) >= 2:
                # Check if amounts are consistent (within 5%)
                avg_amt = sum(amounts) / len(amounts)
                if avg_amt > 0:
                    variation = max(abs(a - avg_amt) / avg_amt for a in amounts)
                    if variation < 0.05:
                        recurring_senders += 1

        if recurring_senders >= 3:
            penalties.append({
                "guard": "LANDLORD_SOCIETY",
                "penalty": 10,
                "reason": f"Looks like a landlord/society: {recurring_senders} senders with fixed recurring amounts",
                "innocent_explanation": "Rent or society maintenance payments are fixed recurring transfers from the same senders",
            })

    # ─── Family pair pattern ──────────────────────────────
    # Long history of transfers between just 2 accounts, small amounts
    if data.get("tx_count", 0) >= 5:
        all_counterparties = set()
        for e in in_edges:
            all_counterparties.add(e["source"])
        for e in out_edges:
            all_counterparties.add(e["target"])

        if len(all_counterparties) <= 3:
            first = min(
                (e["timestamp"] for e in in_edges + out_edges),
                default=None,
            )
            last = max(
                (e["timestamp"] for e in in_edges + out_edges),
                default=None,
            )
            if first and last:
                history_days = (last - first).total_seconds() / 86400
                if history_days >= 90:  # 3+ months of history
                    avg_amount = (data.get("total_in", 0) + data.get("total_out", 0)) / max(data.get("tx_count", 1), 1)
                    if avg_amount < 10000:  # Small amounts
                        penalties.append({
                            "guard": "FAMILY_PAIR",
                            "penalty": 8,
                            "reason": f"Looks like family/friends: {history_days:.0f} days of history with {len(all_counterparties)} counterparts, avg ₹{avg_amount:,.0f}",
                            "innocent_explanation": "Long-standing transfer relationships between few counterparties suggest family or close connections",
                        })

    # ─── Shared office device ─────────────────────────────
    devices = data.get("devices", [])
    if devices:
        for device in devices:
            # Count how many accounts share this device
            shared_count = sum(
                1 for a in store.accounts.values()
                if device in a.get("devices", [])
            )
            if shared_count > 10:
                penalties.append({
                    "guard": "SHARED_DEVICE",
                    "penalty": 5,
                    "reason": f"Device shared by {shared_count} accounts — likely corporate/shared terminal",
                    "innocent_explanation": "Shared office devices (POS terminals, corporate machines) are used by many accounts",
                })
                break  # Only apply once

    return penalties


def build_innocent_explanation(penalties: Any) -> str:
    """Build a 'Why this might be innocent' explanation from guard results."""
    if not penalties:
        return ""

    # Flatten if nested list
    flat: list[dict[str, Any]] = []
    if isinstance(penalties, list):
        for item in penalties:
            if isinstance(item, list):
                flat.extend([x for x in item if isinstance(x, dict)])
            elif isinstance(item, dict):
                flat.append(item)
    elif isinstance(penalties, dict):
        flat.append(penalties)

    explanations = [p["innocent_explanation"] for p in flat if p.get("innocent_explanation")]
    if not explanations:
        return ""

    return "Why this might be innocent: " + ". ".join(explanations) + "."
