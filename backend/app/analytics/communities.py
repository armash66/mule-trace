"""Community detection using seeded Louvain for MuleTrace.

Discovers dense, tightly coupled mule clusters and emerging transaction communities
even when they do not match predefined rule templates.
Scores communities by internal flow ratio, graph density, share of new accounts, and mean risk.
"""

from __future__ import annotations

import logging
from typing import Any

import networkx as nx
import pandas as pd
from networkx.algorithms.community import louvain_communities

from ..schemas import DiscoveredRing

logger = logging.getLogger(__name__)


def discover_rings(
    G: nx.MultiDiGraph,
    accounts_df: pd.DataFrame | None,
    scored_accounts: dict[str, Any] | None = None,
    seed: int = 42,
    min_size: int = 3,
    max_size: int = 40,
) -> list[DiscoveredRing]:
    """Detect high-risk communities using seeded Louvain algorithm.

    Args:
        G: Transaction MultiDiGraph.
        accounts_df: Cleaned accounts DataFrame.
        scored_accounts: Dict of account_id -> ScoredAccount or risk score dict.
        seed: Random seed for deterministic partition.
        min_size: Minimum community size to consider.
        max_size: Maximum community size (drops giant benign hairballs).

    Returns:
        List of DiscoveredRing schemas ordered by anomaly risk.
    """
    if G.number_of_nodes() < min_size:
        return []

    # Build weighted undirected graph for Louvain
    simple_G = nx.Graph()
    for u, v, data in G.edges(data=True):
        amt = float(data.get("amount", 1000.0))
        if simple_G.has_edge(u, v):
            simple_G[u][v]["weight"] += amt
        else:
            simple_G.add_edge(u, v, weight=amt)

    # Fast Louvain partition
    try:
        communities = louvain_communities(simple_G, weight="weight", seed=seed, resolution=1.0)
    except Exception as e:
        logger.warning("Louvain community detection failed: %s", e)
        return []

    # Map account open dates
    new_accounts_set: set[str] = set()
    if accounts_df is not None and "opened_date" in accounts_df.columns:
        ref_time = pd.to_datetime(accounts_df["opened_date"]).max()
        for _, row in accounts_df.iterrows():
            aid = str(row["account_id"])
            od = row["opened_date"]
            if pd.notna(od):
                age = (ref_time - pd.to_datetime(od)).days
                if age <= 30:
                    new_accounts_set.add(aid)

    discovered: list[DiscoveredRing] = []

    for i, comm in enumerate(communities):
        comm_size = len(comm)
        if comm_size < min_size or comm_size > max_size:
            continue

        comm_nodes = list(comm)
        sub_G = G.subgraph(comm_nodes)

        # Calculate internal vs external volume
        internal_volume = sum(
            float(d.get("amount", 0.0))
            for u, v, d in sub_G.edges(data=True)
        )

        external_volume = 0.0
        for node in comm_nodes:
            for _, v, d in G.out_edges(node, data=True):
                if v not in comm:
                    external_volume += float(d.get("amount", 0.0))
            for u, _, d in G.in_edges(node, data=True):
                if u not in comm:
                    external_volume += float(d.get("amount", 0.0))

        total_flow = internal_volume + external_volume
        internal_flow_ratio = (internal_volume / total_flow) if total_flow > 0 else 0.0

        # Subgraph density
        possible_edges = comm_size * (comm_size - 1)
        density = (sub_G.number_of_edges() / possible_edges) if possible_edges > 0 else 0.0

        # Risk metrics
        scores: list[float] = []
        if scored_accounts:
            for n in comm_nodes:
                sc = scored_accounts.get(n)
                val = sc.risk_score if hasattr(sc, "risk_score") else (sc.get("risk_score", 0) if isinstance(sc, dict) else 0)
                scores.append(float(val))
        mean_risk = (sum(scores) / len(scores)) if scores else 0.0

        # New account share
        new_count = sum(1 for n in comm_nodes if n in new_accounts_set)
        new_share = new_count / comm_size

        # Anomaly heuristic for surfacing discovered ring
        # Rings with high internal flow ratio or high mean risk or new accounts
        if internal_flow_ratio >= 0.35 or mean_risk >= 30.0 or (new_share >= 0.5 and density >= 0.2):
            ring_id = f"RNG-COMM-{i+1:03d}"
            explanation = (
                f"Louvain community of {comm_size} accounts with {internal_flow_ratio*100:.0f}% internal "
                f"volume (₹{internal_volume:,.0f}) and graph density {density:.2f}."
            )

            discovered.append(
                DiscoveredRing(
                    ring_id=ring_id,
                    pattern="community",
                    accounts=comm_nodes,
                    mean_risk=round(mean_risk, 1),
                    internal_flow_ratio=round(internal_flow_ratio, 2),
                    density=round(density, 3),
                    estimated_at_risk=round(internal_volume, 2),
                    explanation=explanation,
                )
            )

    # Sort by highest internal flow and mean risk
    discovered.sort(
        key=lambda r: (r.mean_risk, r.internal_flow_ratio, r.estimated_at_risk),
        reverse=True,
    )
    return discovered
