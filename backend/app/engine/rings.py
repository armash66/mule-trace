"""Ring detection using Louvain community detection.

Groups suspicious accounts into rings with entry/exit classification.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import community as community_louvain  # python-louvain
import networkx as nx

from app.engine.graph import GraphStore, layout_hint

logger = logging.getLogger(__name__)


def detect_rings(
    store: GraphStore,
    scored_accounts: list[dict[str, Any]],
    min_score: float = 40.0,
) -> list[dict[str, Any]]:
    """Detect rings (communities) among suspicious accounts.

    Algorithm:
    1. Build subgraph of flagged accounts (score >= min_score).
    2. Run Louvain community detection on undirected projection.
    3. Classify entry (victim-facing) and exit (cash-out) accounts.
    4. Score rings by max member score + connectivity.
    """
    # Build flagged account set
    flagged = {a["account_id"] for a in scored_accounts if a["risk_score"] >= min_score}
    if len(flagged) < 2:
        logger.info("Ring detection: fewer than 2 flagged accounts, skipping")
        return []

    # Build subgraph
    flagged_in_graph = flagged & set(store.graph.nodes)
    if len(flagged_in_graph) < 2:
        return []

    sub_g = store.graph.subgraph(flagged_in_graph).copy()

    # Louvain needs undirected
    undirected = sub_g.to_undirected()

    # Remove isolated nodes
    isolated = list(nx.isolates(undirected))
    undirected.remove_nodes_from(isolated)

    if undirected.number_of_nodes() < 2:
        return []

    # Run Louvain
    try:
        partition = community_louvain.best_partition(undirected, random_state=42)
    except Exception as e:
        logger.warning(f"Louvain failed: {e}, falling back to connected components")
        partition = {}
        for i, component in enumerate(nx.connected_components(undirected)):
            for node in component:
                partition[node] = i

    # Group by community
    communities: dict[int, list[str]] = {}
    for node, comm_id in partition.items():
        communities.setdefault(comm_id, []).append(node)

    # Build ring objects
    rings: list[dict[str, Any]] = []
    score_map = {a["account_id"]: a for a in scored_accounts}

    for ring_idx, (comm_id, members) in enumerate(sorted(communities.items(), key=lambda x: -len(x[1]))):
        if len(members) < 2:
            continue

        ring_label = f"R-{ring_idx + 1:02d}"

        # Classify entry and exit accounts
        entry_accounts: list[str] = []
        exit_accounts: list[str] = []

        for member in members:
            member_set = set(members)

            # Entry: has incoming edges from outside the ring
            in_from_outside = any(
                e["source"] not in member_set
                for e in store.sorted_in_edges.get(member, [])
            )
            # Exit: has outgoing edges to outside the ring
            out_to_outside = any(
                e["target"] not in member_set
                for e in store.sorted_edges.get(member, [])
            )
            # Check for cash-out channels
            has_cashout = any(
                e.get("channel") in {"ATM", "MERCHANT", "WALLET"}
                for e in store.sorted_edges.get(member, [])
            )

            if in_from_outside and not out_to_outside:
                entry_accounts.append(member)
            elif (out_to_outside or has_cashout) and not in_from_outside:
                exit_accounts.append(member)
            elif in_from_outside:
                entry_accounts.append(member)

        # Calculate ring metrics
        ring_sub = store.graph.subgraph(members)
        total_flow = sum(
            data.get("total_amount", 0)
            for _, _, data in ring_sub.edges(data=True)
        )

        # Time span
        all_times = []
        for member in members:
            for e in store.sorted_edges.get(member, []) + store.sorted_in_edges.get(member, []):
                if e.get("target") in members or e.get("source") in members:
                    all_times.append(e["timestamp"])

        time_span_min = 0.0
        if all_times:
            time_span_min = (max(all_times) - min(all_times)).total_seconds() / 60.0

        # Ring risk = max member score + connectivity bonus
        member_scores = [score_map[m]["risk_score"] for m in members if m in score_map]
        max_score = max(member_scores) if member_scores else 0
        connectivity_bonus = min(len(members) * 2, 10)  # Up to 10 bonus for large rings
        ring_risk = min(100, max_score + connectivity_bonus)

        # Layout
        ring_layout = layout_hint(ring_sub)

        rings.append({
            "ring_label": ring_label,
            "members": members,
            "member_count": len(members),
            "total_flow": round(total_flow, 2),
            "time_span_minutes": round(time_span_min, 1),
            "risk_score": round(ring_risk, 1),
            "entry_accounts": entry_accounts,
            "exit_accounts": exit_accounts,
            "layout": {k: list(v) for k, v in ring_layout.items()},
        })

    # Sort by risk
    rings.sort(key=lambda r: r["risk_score"], reverse=True)

    logger.info(f"Ring detection: {len(rings)} rings found")
    return rings
