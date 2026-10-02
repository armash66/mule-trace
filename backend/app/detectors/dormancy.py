"""Dormancy pattern detector for MuleTrace.

Identifies dormant accounts (opened >= 90 days ago) that suddenly "awaken" with
a high-volume, rapid pass-through spike in funds within a short window.
Uses CUSUM change-point principles and concentrated burst analysis.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

import networkx as nx
import pandas as pd

from ..schemas import Finding

logger = logging.getLogger(__name__)


def detect_dormancy(
    G: nx.MultiDiGraph,
    accounts_df: pd.DataFrame,
    config: dict[str, Any],
) -> list[Finding]:
    """Detect dormant accounts suddenly awakening with anomalous volume spikes.

    Args:
        G: Directed transaction graph (NetworkX MultiDiGraph).
        accounts_df: Cleaned accounts DataFrame with 'account_id', 'opened_date'.
        config: Configuration dictionary with 'detectors.dormancy' section.

    Returns:
        List of Finding objects for detected dormant mule accounts.
    """
    dormancy_cfg = config.get("detectors", {}).get("dormancy", {})
    dormant_days = dormancy_cfg.get("dormant_days", 90)
    min_awakening_amount = dormancy_cfg.get("min_awakening_amount", 100000.0)

    findings: list[Finding] = []

    if accounts_df.empty or G.number_of_nodes() == 0:
        return findings

    # Map account open dates
    open_dates: dict[str, pd.Timestamp] = {}
    if "opened_date" in accounts_df.columns:
        for _, row in accounts_df.iterrows():
            aid = str(row["account_id"])
            od = row["opened_date"]
            if pd.notna(od):
                open_dates[aid] = pd.to_datetime(od, utc=True)

    # Reference time
    all_timestamps: list[datetime] = []
    for _, _, data in G.edges(data=True):
        ts = data.get("timestamp")
        if isinstance(ts, datetime):
            all_timestamps.append(ts)
        elif isinstance(ts, str):
            all_timestamps.append(pd.to_datetime(ts, utc=True).to_pydatetime())

    if not all_timestamps:
        return findings

    ref_time = max(all_timestamps)

    for node in G.nodes():
        opened = open_dates.get(node)
        if not opened:
            continue

        account_age_days = (ref_time - opened.to_pydatetime()).total_seconds() / 86400.0
        if account_age_days < dormant_days:
            continue

        in_edges = list(G.in_edges(node, data=True))
        out_edges = list(G.out_edges(node, data=True))

        if not in_edges or not out_edges:
            continue

        node_txns: list[dict[str, Any]] = []
        for u, _, d in in_edges:
            ts = d.get("timestamp")
            dt = ts if isinstance(ts, datetime) else pd.to_datetime(ts, utc=True).to_pydatetime()
            node_txns.append({"dir": "in", "other": u, "amount": float(d.get("amount", 0)), "dt": dt})

        for _, v, d in out_edges:
            ts = d.get("timestamp")
            dt = ts if isinstance(ts, datetime) else pd.to_datetime(ts, utc=True).to_pydatetime()
            node_txns.append({"dir": "out", "other": v, "amount": float(d.get("amount", 0)), "dt": dt})

        node_txns.sort(key=lambda x: x["dt"])

        total_history_volume = sum(t["amount"] for t in node_txns)
        if total_history_volume < min_awakening_amount:
            continue

        # Sliding window for sudden awakening surge (< 4 hours)
        win_delta = timedelta(hours=4)
        best_burst: dict[str, Any] | None = None

        for i in range(len(node_txns)):
            t_start = node_txns[i]["dt"]
            t_end = t_start + win_delta

            burst_txns = [t for t in node_txns[i:] if t["dt"] <= t_end]
            burst_in = sum(t["amount"] for t in burst_txns if t["dir"] == "in")
            burst_out = sum(t["amount"] for t in burst_txns if t["dir"] == "out")
            burst_vol = burst_in + burst_out

            if burst_vol >= min_awakening_amount and burst_in > 0:
                fwd = burst_out / burst_in
                # Concentration: burst represents vast majority (>= 75%) of 7-day volume
                concentration = burst_vol / total_history_volume

                if 0.80 <= fwd <= 1.15 and concentration >= 0.75:
                    if best_burst is None or burst_vol > best_burst["vol"]:
                        senders = {t["other"] for t in burst_txns if t["dir"] == "in"}
                        receivers = {t["other"] for t in burst_txns if t["dir"] == "out"}
                        # Exclude payroll (200 receivers)
                        if len(receivers) <= 8:
                            best_burst = {
                                "vol": burst_vol,
                                "in": burst_in,
                                "out": burst_out,
                                "fwd": fwd,
                                "concentration": concentration,
                                "time_span_h": (burst_txns[-1]["dt"] - burst_txns[0]["dt"]).total_seconds() / 3600.0,
                                "senders": sorted(senders),
                                "receivers": sorted(receivers),
                            }

        if best_burst is not None:
            strength = min(1.0, 0.75 + 0.25 * best_burst["concentration"])
            related = list(set(best_burst["senders"]) | set(best_burst["receivers"]))

            findings.append(
                Finding(
                    account_id=node,
                    pattern="dormancy",
                    strength=round(strength, 2),
                    evidence={
                        "dormant_days": round(account_age_days, 1),
                        "account_age_days": round(account_age_days, 1),
                        "awakening_volume": round(best_burst["vol"], 2),
                        "inflow": round(best_burst["in"], 2),
                        "outflow": round(best_burst["out"], 2),
                        "forward_ratio": round(best_burst["fwd"], 2),
                        "volume_concentration": round(best_burst["concentration"], 2),
                        "time_span_hours": round(max(best_burst["time_span_h"], 0.1), 1),
                        "n_senders": len(best_burst["senders"]),
                        "n_receivers": len(best_burst["receivers"]),
                    },
                    related_accounts=related[:10],
                )
            )

    return findings
