"""Circular transfer detector.

Pattern: time-respecting cycle (A→B→C→A) where each edge timestamp ≥ previous,
completed within a time window. Length 3-6.
"""
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from app.core.config import DetectorThresholds
from app.engine.graph import GraphStore

logger = logging.getLogger(__name__)

SIGNAL_TYPE = "CYCLE"

# Per-node edge cap to bound search
MAX_EDGES_PER_NODE = 50


def detect_cycles(
    store: GraphStore,
    thresholds: DetectorThresholds,
) -> list[dict[str, Any]]:
    """Detect time-respecting circular transfers.

    Algorithm: Bounded time-respecting DFS from each node.
    - At each step, only follow edges with timestamp >= previous edge's timestamp.
    - Cap cycle length at max_len.
    - Per-node edge cap to prevent explosion on super-nodes.
    - Canonical rotation deduplication (rotate cycle so smallest node is first).
    """
    results: list[dict[str, Any]] = []
    max_len = thresholds.cycle_max_length
    cycle_window = timedelta(minutes=thresholds.cycle_window_min)
    min_retained = thresholds.cycle_retained_ratio

    seen_cycles: set[tuple] = set()
    account_cycles: dict[str, list[dict]] = {}  # account_id -> list of cycle evidence

    # Only start DFS from accounts with both in and out edges
    candidates = [
        a for a in store.accounts
        if store.sorted_edges.get(a) and store.sorted_in_edges.get(a)
    ]

    for start_node in candidates:
        # Bounded DFS
        _dfs_cycles(
            store=store,
            start=start_node,
            path=[start_node],
            path_edges=[],
            min_ts=None,
            max_len=max_len,
            cycle_window=cycle_window,
            min_retained=min_retained,
            seen_cycles=seen_cycles,
            account_cycles=account_cycles,
        )

    # Build results per account
    for account_id, cycles in account_cycles.items():
        if not cycles:
            continue

        # Take the strongest cycle
        best_cycle = max(cycles, key=lambda c: c["score"])

        results.append({
            "account_id": account_id,
            "signal_type": SIGNAL_TYPE,
            "raw_value": best_cycle["score"],
            "evidence": best_cycle["evidence"],
            "reason": best_cycle["reason"],
        })

    logger.info(f"Cycle detector: {len(results)} alerts from {len(seen_cycles)} unique cycles")
    return results


def _dfs_cycles(
    store: GraphStore,
    start: str,
    path: list[str],
    path_edges: list[dict],
    min_ts: Any,
    max_len: int,
    cycle_window: timedelta,
    min_retained: float,
    seen_cycles: set[tuple],
    account_cycles: dict[str, list[dict]],
    depth: int = 0,
) -> None:
    """Bounded time-respecting DFS to find cycles."""
    if depth >= max_len:
        return

    current = path[-1]
    out_edges = store.sorted_edges.get(current, [])

    # Cap edges per node
    edge_count = 0
    for edge in out_edges:
        if edge_count >= MAX_EDGES_PER_NODE:
            break

        ts = edge["timestamp"]

        # Time-respecting: edge timestamp must be >= previous edge
        if min_ts is not None and ts < min_ts:
            continue

        # Check cycle window from first edge
        if path_edges and (ts - path_edges[0]["timestamp"]) > cycle_window:
            continue

        target = edge["target"]
        edge_count += 1

        # Found a cycle back to start
        if target == start and len(path) >= 3:
            cycle_path = path + [start]
            cycle_edges = path_edges + [edge]

            # Canonical rotation for deduplication
            canonical = _canonical_cycle(path)
            if canonical in seen_cycles:
                continue
            seen_cycles.add(canonical)

            # Calculate retained ratio (money that made it around the cycle)
            amounts = [e["amount"] for e in cycle_edges]
            if amounts[0] > 0:
                retained_ratio = min(amounts) / max(amounts)
            else:
                retained_ratio = 0

            if retained_ratio < min_retained:
                continue

            # Score: shorter time, higher retained ratio → higher score
            cycle_time = (cycle_edges[-1]["timestamp"] - cycle_edges[0]["timestamp"]).total_seconds() / 60.0
            time_factor = max(0, 1.0 - cycle_time / 120.0)  # Faster = higher
            length_factor = 1.0 - (len(path) - 3) / (max_len - 2)  # Shorter = higher
            score = (retained_ratio * 0.4 + time_factor * 0.3 + length_factor * 0.3)

            total_amount = sum(amounts)
            evidence = {
                "cycle_path": cycle_path,
                "cycle_length": len(path),
                "cycle_time_minutes": round(cycle_time, 1),
                "retained_ratio": round(retained_ratio, 3),
                "total_amount": round(total_amount, 2),
                "amounts": [round(a, 2) for a in amounts],
                "transfer_ids": [e["txn_id"] for e in cycle_edges],
            }

            reason = (
                f"Circular transfer detected: {' → '.join(cycle_path)} "
                f"completing in {cycle_time:.0f} minutes with {retained_ratio:.0%} retained "
                f"(₹{total_amount:,.0f} moved)"
            )

            cycle_data = {"score": score, "evidence": evidence, "reason": reason}

            # Record for all accounts in the cycle
            for acct in path:
                account_cycles.setdefault(acct, []).append(cycle_data)

            continue

        # Continue DFS if target not already in path (no revisits except start)
        if target not in path:
            path.append(target)
            path_edges.append(edge)
            _dfs_cycles(
                store=store,
                start=start,
                path=path,
                path_edges=path_edges,
                min_ts=ts,
                max_len=max_len,
                cycle_window=cycle_window,
                min_retained=min_retained,
                seen_cycles=seen_cycles,
                account_cycles=account_cycles,
                depth=depth + 1,
            )
            path.pop()
            path_edges.pop()


def _canonical_cycle(path: list[str]) -> tuple:
    """Canonical rotation: rotate so smallest node is first."""
    if not path:
        return ()
    min_idx = path.index(min(path))
    rotated = path[min_idx:] + path[:min_idx]
    return tuple(rotated)
