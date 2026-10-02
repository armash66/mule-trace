"""Feedback loop: learns signal weights from analyst decisions.

Bounded Bayesian-style delta (±20% of default). Transparent, reversible,
requires Lead approval via maker-checker.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import DetectorThresholds
from app.models.models import Decision, LearnedWeight

logger = logging.getLogger(__name__)

# Default weights by signal type
DEFAULT_WEIGHTS: dict[str, float] = {
    "FAN_IN_OUT": 0.25,
    "PASS_THROUGH": 0.25,
    "CYCLE": 0.20,
    "NEW_CLUSTER": 0.20,
    "BEHAVIORAL": 0.10,
}

MAX_DELTA_PCT = 0.20  # ±20% of default


def update_feedback(
    db: Session,
    account_id: str,
    signal_types: list[str],
    action: str,  # CONFIRM or CLEAR
) -> None:
    """Update hit/miss counts for each signal type based on analyst decision."""
    for sig_type in signal_types:
        if sig_type == "WATCHLIST":
            continue

        entry = db.query(LearnedWeight).filter(
            LearnedWeight.signal_type == sig_type
        ).first()

        if entry is None:
            default_w = DEFAULT_WEIGHTS.get(sig_type, 0.1)
            entry = LearnedWeight(
                signal_type=sig_type,
                default_weight=default_w,
                learned_weight=default_w,
                confirmed_hits=0,
                cleared_hits=0,
                is_applied=False,
            )
            db.add(entry)

        if action == "CONFIRM":
            entry.confirmed_hits = (entry.confirmed_hits or 0) + 1
        elif action == "CLEAR":
            entry.cleared_hits = (entry.cleared_hits or 0) + 1

        # Recompute learned weight
        entry.learned_weight = _compute_learned_weight(
            entry.default_weight,
            entry.confirmed_hits or 0,
            entry.cleared_hits or 0,
        )

    db.commit()


def _compute_learned_weight(
    default: float,
    confirmed: int,
    cleared: int,
) -> float:
    """Compute bounded Bayesian-style weight adjustment.

    If confirmed >> cleared, weight increases (signal is useful).
    If cleared >> confirmed, weight decreases (signal causes FPs).
    Bounded to ±20% of default.
    """
    total = confirmed + cleared
    if total == 0:
        return default

    # Precision-like metric
    precision = confirmed / total

    # Delta: positive if precision > 0.5 (signal is useful), negative otherwise
    # Scaled by confidence (more data = larger adjustment)
    confidence = min(total / 50.0, 1.0)  # Full confidence at 50+ decisions
    delta = (precision - 0.5) * 2.0 * confidence * MAX_DELTA_PCT * default

    new_weight = default + delta
    # Bound to ±20%
    min_weight = default * (1 - MAX_DELTA_PCT)
    max_weight = default * (1 + MAX_DELTA_PCT)

    return round(max(min_weight, min(max_weight, new_weight)), 4)


def get_learned_weights(db: Session) -> dict[str, dict[str, Any]]:
    """Get current learned weights with before/after comparison."""
    entries = db.query(LearnedWeight).all()
    result: dict[str, dict[str, Any]] = {}

    for entry in entries:
        result[entry.signal_type] = {
            "signal_type": entry.signal_type,
            "default_weight": entry.default_weight,
            "learned_weight": entry.learned_weight,
            "delta": round(entry.learned_weight - entry.default_weight, 4),
            "delta_pct": round(
                (entry.learned_weight - entry.default_weight) / max(entry.default_weight, 0.001) * 100, 1
            ),
            "confirmed_hits": entry.confirmed_hits or 0,
            "cleared_hits": entry.cleared_hits or 0,
            "is_applied": entry.is_applied,
        }

    # Fill in defaults for missing signal types
    for sig_type, default_w in DEFAULT_WEIGHTS.items():
        if sig_type not in result:
            result[sig_type] = {
                "signal_type": sig_type,
                "default_weight": default_w,
                "learned_weight": default_w,
                "delta": 0.0,
                "delta_pct": 0.0,
                "confirmed_hits": 0,
                "cleared_hits": 0,
                "is_applied": False,
            }

    return result


def apply_learned_weights(db: Session, approved_by: str) -> dict[str, float]:
    """Apply learned weights for future runs. Returns the new weight map."""
    entries = db.query(LearnedWeight).all()
    weight_map: dict[str, float] = {}

    for entry in entries:
        entry.is_applied = True
        entry.approved_by = approved_by
        weight_map[entry.signal_type] = entry.learned_weight

    db.commit()
    return weight_map


def reset_learned_weights(db: Session) -> None:
    """Reset all learned weights to defaults."""
    entries = db.query(LearnedWeight).all()
    for entry in entries:
        entry.learned_weight = entry.default_weight
        entry.confirmed_hits = 0
        entry.cleared_hits = 0
        entry.is_applied = False
    db.commit()


def get_active_weights(db: Session) -> dict[str, float] | None:
    """Get applied learned weights, or None if none are applied."""
    entries = db.query(LearnedWeight).filter(LearnedWeight.is_applied == True).all()
    if not entries:
        return None
    return {e.signal_type: e.learned_weight for e in entries}
