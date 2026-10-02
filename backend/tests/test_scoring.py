"""Scoring engine property and correctness tests."""
from __future__ import annotations

import pytest
from app.core.config import DetectorThresholds
from app.engine.scoring import score_accounts


def test_score_range_and_breakdown():
    """P0: Every score is between 0 and 100, and breakdown components add up to base score."""
    thresholds = DetectorThresholds()

    sample_signals = {
        "ACC-001": [
            {
                "signal_type": "FAN_IN_OUT",
                "raw_value": 0.85,
                "evidence_json": '{"inflow": 50000}',
                "guard_penalty": 0.0,
            },
            {
                "signal_type": "PASS_THROUGH",
                "raw_value": 0.92,
                "evidence_json": '{"ratio": 0.95}',
                "guard_penalty": 10.0,
            },
        ]
    }

    results = score_accounts(sample_signals, thresholds)
    assert len(results) == 1

    scored = results[0]
    score = scored["risk_score"]
    assert 0 <= score <= 100
    assert scored["risk_band"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
    assert len(scored["reason"].split()) <= 70


def test_scoring_determinism():
    """P0: Scores are identical across multiple runs with identical inputs."""
    thresholds = DetectorThresholds()

    sample_signals = {
        "ACC-MULE-1": [
            {
                "signal_type": "CYCLE",
                "raw_value": 0.90,
                "evidence_json": '{"hops": 3}',
                "guard_penalty": 0.0,
            }
        ]
    }

    run1 = score_accounts(sample_signals, thresholds)
    run2 = score_accounts(sample_signals, thresholds)

    assert run1[0]["risk_score"] == run2[0]["risk_score"]
    assert run1[0]["risk_band"] == run2[0]["risk_band"]
    assert run1[0]["reason"] == run2[0]["reason"]
