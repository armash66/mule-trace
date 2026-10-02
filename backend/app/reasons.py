"""Deterministic reason-text generator.

Each pattern has a template filled from the Finding's evidence dict.
Reasons are plain-language with INR formatting.  Never LLM-generated.
"""

from __future__ import annotations

from typing import Any

from .schemas import Finding


def _fmt_inr(amount: float) -> str:
    """Format an INR amount with lakhs/crores shorthand."""
    if amount >= 1_00_00_000:
        return f"Rs {amount / 1_00_00_000:.1f}Cr"
    if amount >= 1_00_000:
        return f"Rs {amount / 1_00_000:.1f}L"
    if amount >= 1_000:
        return f"Rs {amount / 1_000:.1f}K"
    return f"Rs {amount:,.0f}"


# ── Per-pattern templates ───────────────────────────────────────────────────────


def _reason_fan(ev: dict[str, Any]) -> str:
    return (
        f"Received {_fmt_inr(ev.get('inflow', 0))} from "
        f"{ev.get('n_senders', '?')} accounts, forwarded "
        f"{ev.get('forward_ratio', 0) * 100:.0f}% within "
        f"{ev.get('minutes_elapsed', '?'):.0f} min to "
        f"{ev.get('n_receivers', '?')} accounts."
    )


def _reason_cycle(ev: dict[str, Any]) -> str:
    n = ev.get("cycle_length", "?")
    mins = ev.get("total_minutes", "?")
    path = ev.get("path", [])
    path_str = " → ".join(path[:6])
    return (
        f"Part of circular transfer ring of {n} accounts "
        f"({path_str}), completing in {mins:.0f} min."
    )


def _reason_chain(ev: dict[str, Any]) -> str:
    fwd = ev.get("forward_ratio", 0) * 100
    amt = ev.get("amount_received", 0)
    gap = ev.get("hop_gap_min", "?")
    bal = ev.get("balance_after", "?")
    length = ev.get("chain_length", "?")
    return (
        f"Pass-through account in a chain of {length}: "
        f"forwarded {fwd:.0f}% of {_fmt_inr(amt)} within "
        f"{gap:.0f} min, balance after Rs {bal:,.0f}."
    )


def _reason_cluster(ev: dict[str, Any]) -> str:
    age = ev.get("age_days", "?")
    attr = ev.get("shared_attr", "attributes")
    size = ev.get("group_size", "?")
    return (
        f"New account (opened {age} days ago) sharing "
        f"{attr} with {size} other new accounts."
    )


_TEMPLATE_MAP = {
    "fan": _reason_fan,
    "cycle": _reason_cycle,
    "chain": _reason_chain,
    "cluster": _reason_cluster,
}


# ── Public API ──────────────────────────────────────────────────────────────────


def generate_reasons(findings: list[Finding]) -> list[str]:
    """Produce deterministic reason strings for a list of findings.

    Findings are sorted strongest-first; each gets one reason line.

    Args:
        findings: Findings for a single account.

    Returns:
        List of plain-language reason strings.
    """
    sorted_f = sorted(findings, key=lambda f: f.strength, reverse=True)
    reasons: list[str] = []
    for f in sorted_f:
        fn = _TEMPLATE_MAP.get(f.pattern)
        if fn:
            reasons.append(fn(f.evidence))
        else:
            reasons.append(
                f"Flagged for {f.pattern} pattern (strength {f.strength:.2f})."
            )
    return reasons
