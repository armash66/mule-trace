"""Cycle detector — bounded DFS for time-ordered circular transfers.

Finds cycles of length 3–6 whose edges are time-ordered and complete
within a configurable window. Deduplicates by node set and ignores
refund loops (amounts that exactly reverse over long gaps).
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any

import networkx as nx
import pandas as pd

from ..schemas import Finding


def detect_cycles(
    graph: nx.MultiDiGraph,
    accounts_df: pd.DataFrame,
    config: dict[str, Any],
) -> list[Finding]:
    """Detect circular transfer patterns.

    Args:
        graph: Transaction multigraph.
        accounts_df: Accounts DataFrame (unused but kept for uniform API).
        config: Full config dict.

    Returns:
        One Finding per account per unique cycle found.
    """
    cfg = config.get("detectors", {}).get("cycle", {})
    min_len: int = cfg.get("min_length", 3)
    max_len: int = cfg.get("max_length", 6)
    max_window_s: float = cfg.get("max_window_minutes", 60) * 60
    min_amt_ratio: float = cfg.get("min_amount_ratio", 0.5)

    # Pre-index outgoing edges sorted by timestamp
    out_adj: dict[str, list[tuple[str, Any, float]]] = defaultdict(list)
    for u, v, data in graph.edges(data=True):
        out_adj[u].append((v, data["timestamp"], float(data["amount"])))

    for u in out_adj:
        out_adj[u].sort(key=lambda x: x[1])

    # Candidate start nodes must have both in-degree and out-degree > 0
    candidates_start = [n for n in graph.nodes() if graph.in_degree(n) > 0 and graph.out_degree(n) > 0]

    seen_cycles: set[frozenset[str]] = set()
    raw_cycles: list[dict[str, Any]] = []

    def _dfs(
        start: str,
        current: str,
        path: list[str],
        last_time: Any,
        first_time: Any,
        last_amt: float,
        amounts: list[float],
    ) -> None:
        if len(path) > max_len:
            return

        for dst, ts, amt in out_adj[current]:
            if ts <= last_time:
                continue
            if (ts - first_time).total_seconds() > max_window_s:
                break  # sorted by time: later edges will also exceed window

            if last_amt > 0 and not (min_amt_ratio <= (amt / last_amt) <= 1.5):
                continue

            if dst == start and len(path) >= min_len:
                key = frozenset(path)
                if key not in seen_cycles:
                    seen_cycles.add(key)
                    total_min = round((ts - first_time).total_seconds() / 60, 2)
                    new_amounts = amounts + [amt]

                    # Refund-loop guard: skip if 2-node A↔B with same amounts and long gap
                    if len(path) == 2 and len(set(round(a, 2) for a in new_amounts)) == 1 and total_min > 60:
                        continue

                    strength = min(1.0, 0.4 + 0.12 * len(path))
                    raw_cycles.append({
                        "members": list(path),
                        "path": path + [start],
                        "amounts": [round(a, 2) for a in new_amounts],
                        "total_minutes": total_min,
                        "strength": round(strength, 4),
                    })
            elif dst not in path and len(path) < max_len:
                _dfs(
                    start=start,
                    current=dst,
                    path=path + [dst],
                    last_time=ts,
                    first_time=first_time,
                    last_amt=amt,
                    amounts=amounts + [amt],
                )

    for start in candidates_start:
        for dst, ts, amt in out_adj[start]:
            if dst != start:
                _dfs(
                    start=start,
                    current=dst,
                    path=[start, dst],
                    last_time=ts,
                    first_time=ts,
                    last_amt=amt,
                    amounts=[amt],
                )

    # Build per-account Findings
    findings: list[Finding] = []
    for cyc in raw_cycles:
        members = cyc["members"]
        for acct in members:
            findings.append(
                Finding(
                    account_id=acct,
                    pattern="cycle",
                    strength=cyc["strength"],
                    evidence={
                        "path": cyc["path"],
                        "amounts": cyc["amounts"],
                        "total_minutes": cyc["total_minutes"],
                        "cycle_length": len(members),
                    },
                    related_accounts=sorted(set(members) - {acct}),
                )
            )

    return findings
