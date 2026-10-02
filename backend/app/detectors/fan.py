"""Fan-in / fan-out detector.

Flags a hub account when:
  1. >= N distinct senders pay it inside a window T_in, **and**
  2. within T_out afterwards >= M distinct receivers get >= R share of the inflow.

Requiring BOTH fan-in *and* fan-out avoids flagging payroll or merchant accounts.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from typing import Any

import networkx as nx
import pandas as pd

from ..schemas import Finding


def detect_fan(
    graph: nx.MultiDiGraph,
    accounts_df: pd.DataFrame,
    config: dict[str, Any],
) -> list[Finding]:
    """Detect fan-in/fan-out patterns.

    Args:
        graph: Transaction multigraph.
        accounts_df: Accounts DataFrame.
        config: Full config dict.

    Returns:
        List of Findings (one per hub).
    """
    cfg = config.get("detectors", {}).get("fan", {})
    min_senders: int = cfg.get("min_senders", 6)
    min_receivers: int = cfg.get("min_receivers", 3)
    min_fwd: float = cfg.get("min_forward_ratio", 0.80)
    win_in = timedelta(minutes=cfg.get("window_in_minutes", 30))
    win_out = timedelta(minutes=cfg.get("window_out_minutes", 60))

    findings: list[Finding] = []

    for hub in graph.nodes():
        # ── Quick filter: enough distinct senders overall? ──
        in_edges = [
            (u, d["timestamp"], d["amount"])
            for u, _, d in graph.in_edges(hub, data=True)
        ]
        distinct_senders = {e[0] for e in in_edges}
        if len(distinct_senders) < min_senders:
            continue

        out_edges = [
            (v, d["timestamp"], d["amount"])
            for _, v, d in graph.out_edges(hub, data=True)
        ]
        distinct_receivers = {e[0] for e in out_edges}
        if len(distinct_receivers) < min_receivers:
            continue

        # ── Sort in-edges by time, sliding-window search ──
        in_edges.sort(key=lambda e: e[1])

        best: dict[str, Any] | None = None

        for i in range(len(in_edges)):
            t_start = in_edges[i][1]
            t_end_in = t_start + win_in

            # Collect senders within [t_start, t_end_in]
            window_senders: dict[str, float] = defaultdict(float)
            for sender, ts, amt in in_edges[i:]:
                if ts > t_end_in:
                    break
                window_senders[sender] += amt

            if len(window_senders) < min_senders:
                continue

            inflow = sum(window_senders.values())

            # Check fan-out in [t_end_in, t_end_in + win_out]
            t_start_out = t_end_in
            t_end_out = t_start_out + win_out
            window_receivers: dict[str, float] = defaultdict(float)
            for recv, ts, amt in out_edges:
                if t_start_out <= ts <= t_end_out:
                    window_receivers[recv] += amt

            if len(window_receivers) < min_receivers:
                continue

            outflow = sum(window_receivers.values())
            fwd_ratio = outflow / max(inflow, 1.0)

            if fwd_ratio < min_fwd:
                continue

            # Keep the best (highest inflow) window for this hub
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
                }

        if best is None:
            continue

        # Strength: higher with more senders, higher fwd ratio
        strength = min(
            1.0,
            (best["n_senders"] / min_senders)
            * (best["forward_ratio"] / min_fwd)
            * 0.4,
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

    return findings
