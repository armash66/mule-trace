"""Pass-through chain detector.

Pattern: receives X, forwards ≈X within minutes, keeps ≈0.
Chains of 3+ such accounts form a pass-through chain.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import timedelta
from typing import Any

from app.core.config import DetectorThresholds
from app.engine.graph import GraphStore

logger = logging.getLogger(__name__)

SIGNAL_TYPE = "PASS_THROUGH"


def detect_pass_through(
    store: GraphStore,
    thresholds: DetectorThresholds,
) -> list[dict[str, Any]]:
    """Detect pass-through chains.

    Algorithm:
    1. For each account, check if it receives and forwards within max_hold.
    2. Build a "forwarding DAG" of accounts that forward ≥ forward_ratio.
    3. Find maximal paths in the DAG (chains of length ≥ min_chain_len).
    """
    results: list[dict[str, Any]] = []
    max_hold = timedelta(minutes=thresholds.passthrough_max_hold_min)
    min_forward_ratio = thresholds.passthrough_forward_ratio
    max_retention = thresholds.passthrough_retention_max
    min_chain = thresholds.passthrough_min_chain_len

    # Step 1: identify pass-through accounts
    forwarding_edges: dict[str, list[str]] = defaultdict(list)  # src -> [dst] in forwarding DAG
    pass_through_evidence: dict[str, dict] = {}

    for account_id in store.accounts:
        in_edges = store.sorted_in_edges.get(account_id, [])
        out_edges = store.sorted_edges.get(account_id, [])

        if not in_edges or not out_edges:
            continue

        # For each significant inflow, check if there's a matching outflow
        total_in = sum(e["amount"] for e in in_edges)
        if total_in <= 0:
            continue

        # Find forwarding windows: for each inflow, check outflows within max_hold
        forwarded_total = 0.0
        forwarded_to: set[str] = set()
        hold_times: list[float] = []
        matched_out_edges: list[dict] = []

        for in_edge in in_edges:
            in_ts = in_edge["timestamp"]
            in_amt = in_edge["amount"]
            deadline = in_ts + max_hold

            # Find outflows within window
            window_out = 0.0
            for out_edge in out_edges:
                out_ts = out_edge["timestamp"]
                if out_ts < in_ts:
                    continue
                if out_ts > deadline:
                    break
                window_out += out_edge["amount"]
                forwarded_to.add(out_edge["target"])
                matched_out_edges.append(out_edge)
                hold_time = (out_ts - in_ts).total_seconds() / 60.0
                hold_times.append(hold_time)

            forwarded_total += min(window_out, in_amt)

        forward_ratio = forwarded_total / total_in if total_in > 0 else 0
        total_out = sum(e["amount"] for e in out_edges)
        retention = max(0, (total_in - total_out)) / total_in if total_in > 0 else 1.0

        # Check if this is a pass-through
        if forward_ratio >= min_forward_ratio and retention <= max_retention:
            avg_hold = sum(hold_times) / len(hold_times) if hold_times else 0
            pass_through_evidence[account_id] = {
                "total_in": round(total_in, 2),
                "total_out": round(total_out, 2),
                "forward_ratio": round(forward_ratio, 3),
                "retention": round(retention, 4),
                "avg_hold_minutes": round(avg_hold, 1),
                "forwarded_to": list(forwarded_to),
                "balance_estimated": not _has_real_balance(store, account_id),
            }
            for target in forwarded_to:
                forwarding_edges[account_id].append(target)

    # Step 2: find maximal paths (chains) in forwarding DAG
    chains = _find_chains(forwarding_edges, min_chain)

    # Step 3: build results per account
    account_chain_scores: dict[str, dict] = {}

    for chain in chains:
        chain_len = len(chain)
        if chain_len < min_chain:
            continue

        # Calculate chain-level metrics
        total_flow = sum(
            pass_through_evidence.get(a, {}).get("total_in", 0) for a in chain
        )
        avg_retention = sum(
            pass_through_evidence.get(a, {}).get("retention", 0) for a in chain
        ) / chain_len
        avg_hold = sum(
            pass_through_evidence.get(a, {}).get("avg_hold_minutes", 0) for a in chain
        ) / chain_len

        # Score: length ↑, hold ↓, retention→0 ↑
        length_factor = min(chain_len / 6.0, 1.0)
        hold_factor = max(0, 1.0 - avg_hold / 15.0)
        retention_factor = max(0, 1.0 - avg_retention / max_retention) if max_retention > 0 else 1.0
        score = length_factor * 0.4 + hold_factor * 0.3 + retention_factor * 0.3

        for acct in chain:
            ev = pass_through_evidence.get(acct, {})
            chain_evidence = {
                **ev,
                "chain": chain,
                "chain_length": chain_len,
                "chain_total_flow": round(total_flow, 2),
                "position_in_chain": chain.index(acct),
            }

            reason = (
                f"{acct} forwarded {ev.get('forward_ratio', 0):.0%} of ₹{ev.get('total_in', 0):,.0f} "
                f"within {ev.get('avg_hold_minutes', 0):.0f} minutes, keeping only "
                f"₹{ev.get('total_in', 0) * ev.get('retention', 0):,.0f}. "
                f"Part of a {chain_len}-hop pass-through chain"
            )
            if ev.get("balance_estimated"):
                reason += " (balance estimated from flows)"

            existing = account_chain_scores.get(acct)
            if existing is None or score > existing["raw_value"]:
                account_chain_scores[acct] = {
                    "account_id": acct,
                    "signal_type": SIGNAL_TYPE,
                    "raw_value": score,
                    "evidence": chain_evidence,
                    "reason": reason,
                }

    results = list(account_chain_scores.values())
    logger.info(f"Pass-through detector: {len(results)} alerts from {len(chains)} chains")
    return results


def _find_chains(
    forwarding_edges: dict[str, list[str]],
    min_length: int,
) -> list[list[str]]:
    """Find maximal paths in the forwarding DAG using DFS."""
    chains: list[list[str]] = []
    visited_as_start: set[str] = set()

    # Start DFS from nodes that are NOT targets of forwarding (entry points)
    all_targets = set()
    for targets in forwarding_edges.values():
        all_targets.update(targets)

    entry_points = [n for n in forwarding_edges if n not in all_targets]
    # Also try all nodes as entry points for cycles
    if not entry_points:
        entry_points = list(forwarding_edges.keys())

    for start in entry_points:
        if start in visited_as_start:
            continue
        visited_as_start.add(start)

        # DFS to find longest path from start
        stack: list[tuple[str, list[str]]] = [(start, [start])]
        while stack:
            node, path = stack.pop()
            extended = False
            for target in forwarding_edges.get(node, []):
                if target not in path and len(path) < 10:  # Cap length
                    stack.append((target, path + [target]))
                    extended = True
            if not extended and len(path) >= min_length:
                chains.append(path)

    # Deduplicate: remove chains that are subsets of longer chains
    chains.sort(key=len, reverse=True)
    unique_chains: list[list[str]] = []
    seen_sets: list[set[str]] = []
    for chain in chains:
        chain_set = set(chain)
        if not any(chain_set <= s for s in seen_sets):
            unique_chains.append(chain)
            seen_sets.append(chain_set)

    return unique_chains


def _has_real_balance(store: GraphStore, account_id: str) -> bool:
    """Check if we have real balance data for this account."""
    for edge in store.sorted_in_edges.get(account_id, [])[:5]:
        if edge.get("receiver_balance_after") is not None:
            return True
    return False
