"""Behavioral anomaly detector + Isolation Forest ML signal.

Secondary signals: velocity anomalies, round-amount structuring,
dormant-to-burst, cash-out proximity, and an Isolation Forest
over graph features.
"""
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

import numpy as np
from sklearn.ensemble import IsolationForest

from app.core.config import DetectorThresholds
from app.engine.graph import GraphStore

logger = logging.getLogger(__name__)

SIGNAL_TYPE = "BEHAVIORAL"


def detect_behavioral(
    store: GraphStore,
    thresholds: DetectorThresholds,
) -> list[dict[str, Any]]:
    """Detect behavioral anomalies and ML outliers.

    Combines rule-based behavioral signals with Isolation Forest
    over graph features for each account.
    """
    results: list[dict[str, Any]] = []

    # Step 1: compute feature matrix for all accounts
    accounts = list(store.accounts.keys())
    if len(accounts) < 10:
        logger.info("Behavioral detector: too few accounts for ML, skipping")
        return []

    features: list[dict[str, float]] = []
    feature_names = [
        "in_degree", "out_degree", "total_in", "total_out",
        "net_flow", "tx_count", "retention_ratio",
        "avg_in_amount", "avg_out_amount", "in_out_ratio",
    ]

    for acct_id in accounts:
        data = store.accounts[acct_id]
        total_in = data.get("total_in", 0)
        total_out = data.get("total_out", 0)

        in_edges = store.sorted_in_edges.get(acct_id, [])
        out_edges = store.sorted_edges.get(acct_id, [])

        avg_in = total_in / max(len(in_edges), 1)
        avg_out = total_out / max(len(out_edges), 1)

        retention = (total_in - total_out) / max(total_in, 1)
        in_out_ratio = data.get("in_degree", 0) / max(data.get("out_degree", 1), 1)

        features.append({
            "in_degree": float(data.get("in_degree", 0)),
            "out_degree": float(data.get("out_degree", 0)),
            "total_in": total_in,
            "total_out": total_out,
            "net_flow": data.get("net_flow", 0),
            "tx_count": float(data.get("tx_count", 0)),
            "retention_ratio": retention,
            "avg_in_amount": avg_in,
            "avg_out_amount": avg_out,
            "in_out_ratio": in_out_ratio,
        })

    # Build feature matrix
    X = np.array([[f[name] for name in feature_names] for f in features])

    # Handle NaN/Inf
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    # Step 2: Isolation Forest
    iso_forest = IsolationForest(
        contamination=thresholds.ml_contamination,
        random_state=42,
        n_estimators=100,
    )

    try:
        iso_forest.fit(X)
        anomaly_scores = iso_forest.decision_function(X)  # More negative = more anomalous
        predictions = iso_forest.predict(X)  # -1 = anomaly, 1 = normal
    except Exception as e:
        logger.warning(f"Isolation Forest failed: {e}")
        anomaly_scores = np.zeros(len(accounts))
        predictions = np.ones(len(accounts))

    # Normalize anomaly scores to 0-1 (inverted: higher = more anomalous)
    if anomaly_scores.std() > 0:
        norm_scores = 1 - (anomaly_scores - anomaly_scores.min()) / (anomaly_scores.max() - anomaly_scores.min())
    else:
        norm_scores = np.zeros(len(accounts))

    # Step 3: behavioral rule signals
    for i, acct_id in enumerate(accounts):
        signals: list[str] = []
        signal_details: dict[str, Any] = {}
        rule_score = 0.0

        data = store.accounts[acct_id]
        in_edges = store.sorted_in_edges.get(acct_id, [])
        out_edges = store.sorted_edges.get(acct_id, [])

        # Round-amount structuring
        all_amounts = [e["amount"] for e in in_edges + out_edges]
        if all_amounts:
            round_count = sum(1 for a in all_amounts if a % 1000 == 0 and a >= 5000)
            round_pct = round_count / len(all_amounts)
            if round_pct > 0.7 and len(all_amounts) >= 3:
                signals.append("round_amounts")
                signal_details["round_amount_pct"] = round(round_pct, 2)
                rule_score += 0.15

        # Dormant-to-burst
        if data.get("first_seen") and data.get("last_seen"):
            first = data["first_seen"]
            last = data["last_seen"]
            span = (last - first).total_seconds() / 86400  # days
            if span > 0:
                tx_per_day = data.get("tx_count", 0) / span
                # Check for burst in recent period
                recent_cutoff = last - timedelta(days=2)
                recent_txs = sum(
                    1 for e in in_edges + out_edges
                    if e["timestamp"] >= recent_cutoff
                )
                if recent_txs > data.get("tx_count", 0) * 0.8 and span > thresholds.behavioral_dormant_days:
                    signals.append("dormant_burst")
                    signal_details["dormant_days"] = round(span - 2, 0)
                    signal_details["recent_tx_pct"] = round(recent_txs / max(data.get("tx_count", 1), 1), 2)
                    rule_score += 0.2

        # Cash-out proximity (ATM, merchant, crypto exit)
        cashout_channels = {"ATM", "MERCHANT", "WALLET"}
        cashout_edges = [e for e in out_edges if e.get("channel") in cashout_channels]
        if cashout_edges and data.get("total_in", 0) > 0:
            cashout_amount = sum(e["amount"] for e in cashout_edges)
            cashout_pct = cashout_amount / data["total_in"]
            if cashout_pct > 0.5:
                signals.append("cash_out_proximity")
                signal_details["cashout_pct"] = round(cashout_pct, 2)
                signal_details["cashout_channels"] = list(set(e.get("channel", "") for e in cashout_edges))
                rule_score += 0.15

        # ML anomaly
        ml_score = float(norm_scores[i])
        is_ml_anomaly = predictions[i] == -1

        # Combine: only flag if ML OR rules trigger
        combined_score = max(rule_score, ml_score * 0.5) if is_ml_anomaly else rule_score

        if combined_score < 0.1:
            continue

        evidence = {
            "behavioral_signals": signals,
            "signal_details": signal_details,
            "ml_anomaly_score": round(ml_score, 3),
            "is_ml_anomaly": is_ml_anomaly,
            "features": {name: round(float(features[i][name]), 2) for name in feature_names},
        }

        reason_parts = []
        if "dormant_burst" in signals:
            reason_parts.append(
                f"account was dormant for {signal_details.get('dormant_days', 0):.0f} days then burst with activity"
            )
        if "round_amounts" in signals:
            reason_parts.append(
                f"{signal_details.get('round_amount_pct', 0):.0%} of transfers are round amounts"
            )
        if "cash_out_proximity" in signals:
            reason_parts.append(
                f"{signal_details.get('cashout_pct', 0):.0%} of outflows go to cash-out channels"
            )
        if is_ml_anomaly:
            reason_parts.append(f"ML anomaly score {ml_score:.2f}")

        reason = f"{acct_id}: " + "; ".join(reason_parts) if reason_parts else f"{acct_id}: behavioral anomaly detected"

        results.append({
            "account_id": acct_id,
            "signal_type": SIGNAL_TYPE,
            "raw_value": combined_score,
            "evidence": evidence,
            "reason": reason,
        })

    logger.info(f"Behavioral detector: {len(results)} alerts")
    return results
