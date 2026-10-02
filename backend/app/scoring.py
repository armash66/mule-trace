"""Risk scoring: IsolationForest anomaly + detector-strength blend.

risk_score = round(100 × (w_ml × anomaly + (1 − w_ml) × detector_score))
detector_score = 1 − ∏(1 − w_pattern × strength)

All weights come from config.yaml.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any

import numpy as np
from sklearn.ensemble import IsolationForest

from .features import FEATURE_NAMES
from .schemas import Finding, ScoredAccount


def score_accounts(
    findings: list[Finding],
    features: dict[str, dict[str, float]],
    config: dict[str, Any],
) -> dict[str, ScoredAccount]:
    """Score every account, returning a dict keyed by account_id.

    Args:
        findings: All detector findings.
        features: Per-account feature dicts from features.py.
        config: Full config dict.

    Returns:
        {account_id: ScoredAccount}
    """
    cfg = config.get("scoring", {})
    w_ml: float = cfg.get("ml_weight", 0.30)
    pattern_weights: dict[str, float] = cfg.get("pattern_weights", {
        "fan": 0.9, "cycle": 0.7, "chain": 0.8, "cluster": 0.6,
    })

    # Group findings by account
    acct_findings: dict[str, list[Finding]] = defaultdict(list)
    for f in findings:
        acct_findings[f.account_id].append(f)

    # ── ML anomaly scores ──
    account_ids = sorted(features.keys())
    X = np.array([
        [features[aid].get(fn, 0.0) for fn in FEATURE_NAMES]
        for aid in account_ids
    ])

    iso_cfg = cfg.get("isolation_forest", {})
    clf = IsolationForest(
        n_estimators=iso_cfg.get("n_estimators", 200),
        contamination=iso_cfg.get("contamination", 0.05),
        random_state=iso_cfg.get("random_state", 42),
    )
    clf.fit(X)

    # decision_function: lower = more anomalous
    raw = clf.decision_function(X)
    lo, hi = float(raw.min()), float(raw.max())
    if hi > lo:
        anomaly = 1.0 - (raw - lo) / (hi - lo)  # flip: 1 = most anomalous
    else:
        anomaly = np.zeros(len(raw))

    anomaly_map: dict[str, float] = dict(zip(account_ids, anomaly.tolist()))

    # ── Blend scores ──
    scored: dict[str, ScoredAccount] = {}

    for aid in account_ids:
        af = acct_findings.get(aid, [])

        # Detector score
        if af:
            prod = 1.0
            for f in af:
                w = pattern_weights.get(f.pattern, 0.5)
                prod *= (1.0 - w * f.strength)
            detector_score = 1.0 - prod
        else:
            detector_score = 0.0

        anom = anomaly_map.get(aid, 0.0)
        risk_raw = w_ml * anom + (1.0 - w_ml) * detector_score
        risk_score = int(round(100 * min(risk_raw, 1.0)))

        patterns = sorted({f.pattern for f in af})

        scored[aid] = ScoredAccount(
            account_id=aid,
            risk_score=risk_score,
            patterns=patterns,
            reasons=[],   # filled by reasons.py
            findings=af,
        )

    return scored
