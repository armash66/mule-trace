"""Deterministic reason-text generator for MuleTrace.

Each pattern has a deterministic template filled from the Finding's evidence dict.
Reasons are plain-language with Indian rupee (₹) lakh/crore formatting. Never LLM-generated.
"""

from __future__ import annotations

from typing import Any

from .schemas import Finding


def format_inr(amount: float) -> str:
    """Format an INR amount with standard Indian lakh/crore notation and ₹ symbol."""
    if amount >= 1_00_00_000:
        return f"₹{amount / 1_00_00_000:.1f}Cr"
    if amount >= 1_00_000:
        return f"₹{amount / 1_00_000:.1f}L"
    if amount >= 1_000:
        return f"₹{amount / 1_000:.1f}K"
    return f"₹{amount:,.0f}"


# ── Per-pattern templates ───────────────────────────────────────────────────────


def _reason_fan(ev: dict[str, Any]) -> str:
    inflow = ev.get("inflow", 0)
    n_senders = ev.get("n_senders", "?")
    n_receivers = ev.get("n_receivers", "?")
    forward_pct = ev.get("forward_ratio", 0) * 100
    mins = ev.get("minutes_elapsed", "?")
    mins_str = f"{mins:.0f}" if isinstance(mins, (int, float)) else str(mins)
    return (
        f"Received {format_inr(inflow)} from {n_senders} accounts, "
        f"forwarded {forward_pct:.0f}% within {mins_str} min to {n_receivers} accounts."
    )


def _reason_cycle(ev: dict[str, Any]) -> str:
    n = ev.get("cycle_length", "?")
    mins = ev.get("total_minutes", "?")
    mins_str = f"{mins:.0f}" if isinstance(mins, (int, float)) else str(mins)
    path = ev.get("path", [])
    path_str = " → ".join(path[:6])
    return (
        f"Part of circular transfer ring of {n} accounts ({path_str}), "
        f"completing in {mins_str} min."
    )


def _reason_chain(ev: dict[str, Any]) -> str:
    fwd = ev.get("forward_ratio", 0) * 100
    amt = ev.get("amount_received", 0)
    gap = ev.get("hop_gap_min", "?")
    gap_str = f"{gap:.0f}" if isinstance(gap, (int, float)) else str(gap)
    bal = ev.get("balance_after", 0)
    bal_str = format_inr(bal) if isinstance(bal, (int, float)) else str(bal)
    length = ev.get("chain_length", "?")
    return (
        f"Pass-through account in a chain of {length}: forwarded {fwd:.0f}% "
        f"of {format_inr(amt)} within {gap_str} min, balance retained {bal_str}."
    )


def _reason_cluster(ev: dict[str, Any]) -> str:
    age = ev.get("age_days", "?")
    attr = ev.get("shared_attr", "attributes")
    size = ev.get("group_size", "?")
    return (
        f"New account (opened {age} days ago) sharing {attr} with {size} other new accounts."
    )


def _reason_dormancy(ev: dict[str, Any]) -> str:
    dormant_days = ev.get("dormant_days", 90)
    inflow = ev.get("inflow", ev.get("awakening_volume", 0))
    forward_pct = ev.get("forward_ratio", 0) * 100
    hours = ev.get("time_span_hours", 24)
    return (
        f"Dormant for {dormant_days:.0f} days, then suddenly received {format_inr(inflow)} "
        f"and forwarded {forward_pct:.0f}% within {hours:.1f} hours."
    )


def _reason_community(ev: dict[str, Any]) -> str:
    flow_ratio = ev.get("internal_flow_ratio", 0) * 100
    density = ev.get("density", 0)
    size = ev.get("cluster_size", "?")
    return (
        f"Discovered in dense suspicious network community ({size} accounts, "
        f"internal flow {flow_ratio:.0f}%, graph density {density:.2f})."
    )


_TEMPLATE_MAP = {
    "fan": _reason_fan,
    "cycle": _reason_cycle,
    "chain": _reason_chain,
    "cluster": _reason_cluster,
    "dormancy": _reason_dormancy,
    "community": _reason_community,
}


# ── Public API ──────────────────────────────────────────────────────────────────


def generate_reasons(findings: list[Finding]) -> list[str]:
    """Produce deterministic reason strings for a list of findings.

    Findings are sorted strongest-first; each gets one reason line.
    """
    sorted_f = sorted(findings, key=lambda f: f.strength, reverse=True)
    reasons: list[str] = []
    for f in sorted_f:
        fn = _TEMPLATE_MAP.get(f.pattern)
        if fn:
            reasons.append(fn(f.evidence))
        else:
            reasons.append(f"Flagged for {f.pattern} pattern (strength {f.strength:.2f}).")
    return reasons
