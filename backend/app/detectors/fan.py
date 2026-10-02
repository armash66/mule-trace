"""Fan-in / fan-out pattern detector for MuleTrace.

Identifies hubs that receive funds from at least N distinct senders within
a tight time window (T_in), then forward at least R (e.g. 80%) of that inflow
to at least M distinct receivers within T_out.

Excludes payroll accounts (many receivers, no preceding sudden fan-in)
and merchants (continuous daily inflow, no matching rapid fan-out).
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

import networkx as nx
import pandas as pd

from ..schemas import Finding
from .scales import scale_config, smooth_window_score


def detect_fan(
    graph: nx.MultiDiGraph,
    accounts_df: pd.DataFrame,
    config: dict[str, Any],
) -> list[Finding]:
    """Detect fan-in / fan-out hub and receiver patterns.

    Args:
        graph: Transaction multigraph.
        accounts_df: Accounts DataFrame.
        config: Full config dict.

    Returns:
        List of Findings for hub and associated receivers.
    """
    cfg = config.get("detectors", {}).get("fan", {})
    min_senders: int = cfg.get("min_senders", 6)
    min_receivers: int = cfg.get("min_receivers", 3)
    min_fwd: float = cfg.get("min_forward_ratio", 0.80)
    scale_settings = scale_config(config, "fan")
    max_window = timedelta(minutes=max(scale_settings["windows_minutes"]))


    findings: list[Finding] = []

    for hub in graph.nodes():
        # Quick filter: enough distinct senders & receivers overall
        in_edges = [
            (u, d["timestamp"] if isinstance(d["timestamp"], datetime) else pd.to_datetime(d["timestamp"], utc=True).to_pydatetime(), float(d["amount"]))
            for u, _, d in graph.in_edges(hub, data=True)
        ]
        distinct_senders = {e[0] for e in in_edges}
        if len(distinct_senders) < min_senders:
            continue

        out_edges = [
            (v, d["timestamp"] if isinstance(d["timestamp"], datetime) else pd.to_datetime(d["timestamp"], utc=True).to_pydatetime(), float(d["amount"]))
            for _, v, d in graph.out_edges(hub, data=True)
        ]
        distinct_receivers = {e[0] for e in out_edges}
        if len(distinct_receivers) < min_receivers:
            continue

        in_edges.sort(key=lambda e: e[1])
        best: dict[str, Any] | None = None

        for i in range(len(in_edges)):
            t_start = in_edges[i][1]
            t_end_in = t_start + max_window

            # Collect senders within [t_start, t_end_in]
            window_senders: dict[str, float] = defaultdict(float)
            for sender, ts, amt in in_edges[i:]:
                if ts > t_end_in:
                    break
                window_senders[sender] += amt

            if len(window_senders) < min_senders:
                continue

            inflow = sum(window_senders.values())
            # Check fan-out over the same multi-scale horizon.
            t_start_out = t_start
            t_end_out = t_start + max_window
            window_receivers: dict[str, float] = defaultdict(float)
            for recv, ts, amt in out_edges:
                if t_start_out <= ts <= t_end_out and amt >= (inflow * 0.05):
                    window_receivers[recv] += amt

            if len(window_receivers) < min_receivers:
                continue


            outflow = sum(window_receivers.values())
            fwd_ratio = outflow / max(inflow, 1.0)

            if fwd_ratio < min_fwd:
                continue

            # Keep the best window for this hub
            if best is None or inflow > best["inflow"]:
                last_out_ts = max(
                    (ts for _, ts, _ in out_edges if t_start_out <= ts <= t_end_out),
                    default=t_start_out,
                )
                best = {
                    "senders": sorted(window_senders.keys()),
                    "receivers": sorted(window_receivers.keys()),
                    "inflow": round(inflow, 2),
                    "outflow": round(outflow, 2),
                    "forward_ratio": round(fwd_ratio, 4),
                    "n_senders": len(window_senders),
                    "n_receivers": len(window_receivers),
                    "minutes_elapsed": round(
                        (last_out_ts - t_start).total_seconds() / 60, 2
                    ),
                    "scale_score": smooth_window_score((last_out_ts - t_start).total_seconds() / 60, scale_settings),
                }

        if best is None:
            continue

        strength = min(
            1.0,
            (best["n_senders"] / min_senders)
            * min(1.0, best["forward_ratio"] / min_fwd)
            * best["scale_score"],
        )

        findings.append(
            Finding(
                account_id=hub,
                pattern="fan",
                strength=round(strength, 4),
                evidence=best,
                related_accounts=sorted(
                    set(best["senders"]) | set(best["receivers"])
                ),
            )
        )

        # Also flag the immediate fan-out receivers
        for recv in best["receivers"]:
            findings.append(
                Finding(
                    account_id=recv,
                    pattern="fan",
                    strength=round(strength * 0.85, 4),
                    evidence={
                        "role": "fan_out_receiver",
                        "hub": hub,
                        "forward_ratio": best["forward_ratio"],
                        "n_senders": best["n_senders"],
                        "n_receivers": best["n_receivers"],
                    },
                    related_accounts=[hub] + [r for r in best["receivers"] if r != recv],
                )
            )

    return findings
