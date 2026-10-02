"""Per-account feature extraction for ML scoring.

Features:
  - in/out degree, distinct counterparties
  - total in/out, forward ratio
  - mean retained balance, velocity per hour
  - account age in days, amount entropy
  - share of counterparties that are new accounts
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

import numpy as np
import networkx as nx
import pandas as pd


def extract_features(
    graph: nx.MultiDiGraph,
    acct_df: pd.DataFrame,
) -> dict[str, dict[str, float]]:
    """Compute feature vectors for every account in the graph.

    Args:
        graph: Transaction multigraph.
        acct_df: Accounts DataFrame.

    Returns:
        {account_id: {feature_name: value, …}}
    """
    # Pre-compute account age lookup
    ref_date = acct_df["opened_date"].max()
    age_lookup: dict[str, int] = {}
    bal_lookup: dict[str, float] = {}

    for _, row in acct_df.iterrows():
        aid = row["account_id"]
        age_lookup[aid] = (ref_date - row["opened_date"]).days
        bal = row.get("balance_after")
        if pd.notna(bal):
            bal_lookup[aid] = float(bal)

    new_accounts: set[str] = {
        aid for aid, age in age_lookup.items() if age <= 30
    }

    features: dict[str, dict[str, float]] = {}

    for node in graph.nodes():
        in_edges = list(graph.in_edges(node, data=True))
        out_edges = list(graph.out_edges(node, data=True))

        in_degree = len(in_edges)
        out_degree = len(out_edges)

        in_cps = {e[0] for e in in_edges}
        out_cps = {e[1] for e in out_edges}

        total_in = sum(e[2]["amount"] for e in in_edges)
        total_out = sum(e[2]["amount"] for e in out_edges)

        fwd_ratio = total_out / max(total_in, 1.0)

        # Balance
        balance = bal_lookup.get(node, 0.0)

        # Velocity (transactions per hour)
        all_times = [e[2]["timestamp"] for e in in_edges + out_edges]
        if len(all_times) >= 2:
            span_h = (max(all_times) - min(all_times)).total_seconds() / 3600
            velocity = (in_degree + out_degree) / max(span_h, 0.01)
        else:
            velocity = 0.0

        # Account age
        age_days = age_lookup.get(node, 0)

        # Amount entropy (binned into 10 buckets)
        amounts = [e[2]["amount"] for e in in_edges + out_edges]
        if len(amounts) >= 2:
            bins = np.histogram(amounts, bins=10)[0]
            bins = bins[bins > 0].astype(float)
            probs = bins / bins.sum()
            entropy = float(-np.sum(probs * np.log2(probs + 1e-10)))
        else:
            entropy = 0.0

        # Share of counterparties that are new accounts
        all_cps = in_cps | out_cps
        if all_cps:
            new_cp_count = sum(1 for cp in all_cps if cp in new_accounts)
            share_new = new_cp_count / len(all_cps)
        else:
            share_new = 0.0

        features[node] = {
            "in_degree": float(in_degree),
            "out_degree": float(out_degree),
            "in_counterparties": float(len(in_cps)),
            "out_counterparties": float(len(out_cps)),
            "total_in": round(total_in, 2),
            "total_out": round(total_out, 2),
            "forward_ratio": round(fwd_ratio, 4),
            "balance_after": round(balance, 2),
            "velocity_per_hour": round(velocity, 4),
            "account_age_days": float(age_days),
            "amount_entropy": round(entropy, 4),
            "share_new_counterparties": round(share_new, 4),
        }

    return features


# Feature names in the order used by the ML model
FEATURE_NAMES: list[str] = [
    "in_degree",
    "out_degree",
    "in_counterparties",
    "out_counterparties",
    "total_in",
    "total_out",
    "forward_ratio",
    "balance_after",
    "velocity_per_hour",
    "account_age_days",
    "amount_entropy",
    "share_new_counterparties",
]
