"""Personalised PageRank risk propagation for MuleTrace.

Seeds propagation from analyst-confirmed mules to compute guilt-by-association risk uplift.
Cleared accounts are suppressed from teleportation and score uplift.
Triggers queue re-ranking following each analyst triage decision.
"""

from __future__ import annotations

import logging
from typing import Any

import networkx as nx

logger = logging.getLogger(__name__)


def compute_risk_propagation(
    G: nx.Graph | nx.MultiDiGraph,
    confirmed_accounts: list[str],
    cleared_accounts: list[str] | None = None,
    alpha: float = 0.85,
    max_iter: int = 50,
) -> dict[str, float]:
    """Calculate Personalized PageRank score uplifts seeded from confirmed mules.

    Args:
        G: NetworkX transaction/entity graph.
        confirmed_accounts: List of account IDs marked 'confirmed' by analysts.
        cleared_accounts: List of account IDs marked 'cleared' benign.
        alpha: Damping factor (default 0.85).
        max_iter: Maximum power iterations.

    Returns:
        Dict mapping account_id -> risk uplift percentage (0.0 to 100.0).
    """
    cleared_set = set(cleared_accounts or [])
    valid_seeds = [a for a in confirmed_accounts if G.has_node(a) and a not in cleared_set]

    if not valid_seeds or G.number_of_nodes() == 0:
        return {node: 0.0 for node in G.nodes()}

    # Convert to simple graph for PageRank
    if isinstance(G, (nx.MultiDiGraph, nx.MultiGraph)):
        simple_G = nx.Graph()
        for u, v, data in G.edges(data=True):
            w = float(data.get("amount", 1.0))
            if simple_G.has_edge(u, v):
                simple_G[u][v]["weight"] += w
            else:
                simple_G.add_edge(u, v, weight=w)
    else:
        simple_G = G.to_undirected() if G.is_directed() else G

    # Personalization vector: teleport only to confirmed mules
    n_nodes = simple_G.number_of_nodes()
    personalization = {node: 0.0 for node in simple_G.nodes()}
    seed_weight = 1.0 / len(valid_seeds)
    for s in valid_seeds:
        personalization[s] = seed_weight

    try:
        pr = nx.pagerank(
            simple_G,
            alpha=alpha,
            personalization=personalization,
            max_iter=500,
            tol=1e-4,
            weight="weight",
        )
    except Exception as e:
        logger.warning("PageRank power iteration failed: %s. Using uniform fallback.", e)
        pr = {node: 0.0 for node in simple_G.nodes()}


    # Normalize uplifts into 0-100 range
    max_pr = max(pr.values()) if pr else 1.0
    uplifts: dict[str, float] = {}

    for node, val in pr.items():
        if node in cleared_set:
            uplifts[node] = 0.0  # Cleared accounts receive no boost
        elif node in valid_seeds:
            uplifts[node] = 100.0  # Seed confirmed mules
        else:
            norm_val = (val / max_pr) if max_pr > 0 else 0.0
            uplifts[node] = round(norm_val * 100.0, 1)

    return uplifts


def rerank_accounts_with_propagation(
    scored_accounts: dict[str, Any],
    G: nx.Graph | nx.MultiDiGraph,
    confirmed_accounts: list[str],
    cleared_accounts: list[str] | None = None,
    propagation_weight: float = 0.25,
) -> dict[str, int]:
    """Combine base risk score with PageRank uplift to compute updated scores.

    Args:
        scored_accounts: Dict of account_id -> ScoredAccount or base risk_score int.
        G: Network graph.
        confirmed_accounts: Confirmed mule account IDs.
        cleared_accounts: Cleared account IDs.
        propagation_weight: Blend weight for PageRank uplift (0.0 to 1.0).

    Returns:
        Dict of account_id -> updated integer risk_score (0 to 100).
    """
    uplifts = compute_risk_propagation(
        G=G,
        confirmed_accounts=confirmed_accounts,
        cleared_accounts=cleared_accounts,
    )

    cleared_set = set(cleared_accounts or [])
    new_scores: dict[str, int] = {}

    for aid, orig_item in scored_accounts.items():
        orig_score = orig_item.risk_score if hasattr(orig_item, "risk_score") else int(orig_item)

        if aid in cleared_set:
            new_scores[aid] = 0
            continue

        uplift = uplifts.get(aid, 0.0)
        blended = (1.0 - propagation_weight) * orig_score + propagation_weight * uplift
        new_scores[aid] = max(0, min(100, int(round(blended))))

    return new_scores
