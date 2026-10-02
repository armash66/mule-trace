"""Scoring engine + reason generator.

risk = clamp(Σ wᵢ·signalᵢ, 0, 100) - guard_penalties + watchlist_bonus
Each score is fully explainable with per-signal breakdown.
"""
from __future__ import annotations

import logging
from typing import Any

from app.core.config import DetectorThresholds, get_risk_band
from app.engine.guards import build_innocent_explanation

logger = logging.getLogger(__name__)

# Signal type to weight key mapping
SIGNAL_WEIGHT_MAP: dict[str, str] = {
    "FAN_IN_OUT": "weight_fan_in_out",
    "PASS_THROUGH": "weight_pass_through",
    "CYCLE": "weight_cycle",
    "NEW_CLUSTER": "weight_new_cluster",
    "BEHAVIORAL": "weight_behavioral",
}


def score_accounts(
    all_signals: dict[str, list[dict[str, Any]]],
    thresholds: DetectorThresholds,
    learned_weights: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    """Score all flagged accounts and generate reasons.

    Args:
        all_signals: account_id -> list of signal dicts from all detectors
        thresholds: current detector thresholds
        learned_weights: optional overrides from feedback loop

    Returns:
        List of scored account dicts with breakdown.
    """
    results: list[dict[str, Any]] = []

    for account_id, signals in all_signals.items():
        if not signals:
            continue

        # Calculate weighted score
        total_score = 0.0
        signal_breakdown: list[dict[str, Any]] = []
        total_guard_penalty = 0.0
        watchlist_bonus = 0
        signal_types: list[str] = []

        for signal in signals:
            sig_type = signal["signal_type"]
            raw_value = signal.get("raw_value", 0.0)
            guard_penalty = signal.get("guard_penalty", 0.0)
            total_guard_penalty += guard_penalty

            # Get weight (learned or default)
            if sig_type == "WATCHLIST":
                # Watchlist is a bonus, not weighted
                watchlist_bonus = signal.get("evidence", {}).get("bonus", thresholds.watchlist_bonus)
                signal_breakdown.append({
                    "signal_type": sig_type,
                    "weight": 1.0,
                    "raw_value": round(raw_value, 3),
                    "weighted_score": watchlist_bonus,
                    "evidence": signal.get("evidence"),
                    "reason": signal.get("reason", ""),
                    "guard_penalty": guard_penalty,
                    "guard_reason": signal.get("guard_reason", ""),
                })
                signal_types.append(sig_type)
                continue

            weight_key = SIGNAL_WEIGHT_MAP.get(sig_type, "weight_behavioral")
            if learned_weights and sig_type in learned_weights:
                weight = learned_weights[sig_type]
            else:
                weight = getattr(thresholds, weight_key, 0.1)

            weighted = raw_value * weight * 100  # Scale to 0-100

            signal_breakdown.append({
                "signal_type": sig_type,
                "weight": round(weight, 3),
                "raw_value": round(raw_value, 3),
                "weighted_score": round(weighted, 1),
                "evidence": signal.get("evidence"),
                "reason": signal.get("reason", ""),
                "guard_penalty": round(guard_penalty, 1),
                "guard_reason": signal.get("guard_reason", ""),
            })

            total_score += weighted
            signal_types.append(sig_type)

        # Apply watchlist bonus and guard penalties
        final_score = max(0.0, min(100.0, total_score - total_guard_penalty + watchlist_bonus))

        # Determine confidence based on independent signal agreement
        unique_signal_types = set(signal_types) - {"WATCHLIST"}
        if len(unique_signal_types) >= 3:
            confidence = "HIGH"
        elif len(unique_signal_types) >= 2:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        # Generate plain-language reason (top 2-3 signals)
        reason = _generate_reason(account_id, signal_breakdown)
        reason_simple = _generate_simple_reason(account_id, signal_breakdown)
        innocent_reason = build_innocent_explanation(
            [s.get("guard_details", []) for s in signals if s.get("guard_details")]
            if any(s.get("guard_details") for s in signals)
            else []
        )

        # Flatten guard details for innocent reason
        all_guard_details = []
        for s in signals:
            if s.get("guard_details"):
                all_guard_details.extend(s["guard_details"])
        if all_guard_details:
            innocent_reason = build_innocent_explanation(all_guard_details)

        # Determine next best action
        next_action = _suggest_next_action(final_score, signal_types, confidence)

        risk_band = get_risk_band(final_score, thresholds)

        results.append({
            "account_id": account_id,
            "risk_score": round(final_score, 1),
            "risk_band": risk_band,
            "confidence": confidence,
            "reason": reason,
            "reason_simple": reason_simple,
            "next_action": next_action,
            "innocent_reason": innocent_reason,
            "signal_types": signal_types,
            "signals": signal_breakdown,
            "total_guard_penalty": round(total_guard_penalty, 1),
            "watchlist_bonus": watchlist_bonus,
        })

    # Sort by risk score descending
    results.sort(key=lambda x: x["risk_score"], reverse=True)

    logger.info(
        f"Scored {len(results)} accounts: "
        f"{sum(1 for r in results if r['risk_band'] == 'CRITICAL')} critical, "
        f"{sum(1 for r in results if r['risk_band'] == 'HIGH')} high"
    )

    return results


def _generate_reason(account_id: str, breakdown: list[dict]) -> str:
    """Generate deterministic plain-language reason from top signals."""
    # Sort by weighted_score descending, take top 3
    top = sorted(breakdown, key=lambda s: s["weighted_score"], reverse=True)[:3]

    parts: list[str] = []
    for signal in top:
        reason = signal.get("reason", "")
        if reason:
            parts.append(reason)

    if not parts:
        return f"{account_id}: flagged based on transaction patterns"

    full_reason = ". ".join(parts)

    # Add guard info if present
    guard_parts = [s["guard_reason"] for s in breakdown if s.get("guard_reason")]
    if guard_parts:
        full_reason += f". However: {'; '.join(guard_parts)}"

    return full_reason


def _generate_simple_reason(account_id: str, breakdown: list[dict]) -> str:
    """Generate simplified 'explain like I'm new' reason."""
    signal_types = [s["signal_type"] for s in breakdown if s["weighted_score"] > 0]

    explanations = {
        "FAN_IN_OUT": "Money came in from many accounts and quickly went out to others",
        "PASS_THROUGH": "Money passed through this account without staying — it was just a waypoint",
        "CYCLE": "Money went in a circle back to where it started",
        "NEW_CLUSTER": "This is a new account that shares a device or identity with other suspicious new accounts",
        "BEHAVIORAL": "The transaction pattern is unusual compared to normal accounts",
        "WATCHLIST": "This account was previously confirmed as a mule account",
    }

    parts = [explanations.get(st, st) for st in signal_types[:3]]
    return f"{account_id}: " + ". ".join(parts) + "." if parts else ""


def _suggest_next_action(score: float, signal_types: list[str], confidence: str) -> str:
    """Suggest the next best action for the analyst."""
    if "WATCHLIST" in signal_types:
        return "Previously confirmed mule — verify and add to freeze draft"
    if score >= 90:
        return "Critical risk — trace from this account and draft freeze request"
    if score >= 70:
        return "High risk — expand network and review evidence before confirming"
    if score >= 40:
        return "Medium risk — review signals and check counterparty history"
    return "Low risk — monitor, may not require immediate action"
