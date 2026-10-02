"""Build a NetworkX MultiDiGraph from cleaned DataFrames.

Edges carry txn_id, timestamp (datetime), amount, channel, device_id, ip.
Nodes carry account metadata from the accounts DataFrame.
"""

from __future__ import annotations

from datetime import datetime

import networkx as nx
import pandas as pd


def build_graph(txn_df: pd.DataFrame, acct_df: pd.DataFrame) -> nx.MultiDiGraph:
    """Construct a directed multigraph from transaction and account data.

    Args:
        txn_df: Cleaned transactions (columns: txn_id, timestamp, src_account,
                 dst_account, amount, channel, device_id, ip).
        acct_df: Cleaned accounts (columns: account_id, opened_date, …).

    Returns:
        NetworkX MultiDiGraph.
    """
    G = nx.MultiDiGraph()

    # Add nodes with account attributes
    for _, row in acct_df.iterrows():
        G.add_node(
            row["account_id"],
            opened_date=row["opened_date"],
            kyc_phone=row.get("kyc_phone"),
            kyc_address=row.get("kyc_address"),
            kyc_id_hash=row.get("kyc_id_hash"),
            balance_after=row.get("balance_after"),
        )

    # Add edges from transactions
    for _, row in txn_df.iterrows():
        src = row["src_account"]
        dst = row["dst_account"]
        # Ensure nodes exist even if not in accounts CSV
        if src not in G:
            G.add_node(src)
        if dst not in G:
            G.add_node(dst)

        G.add_edge(
            src,
            dst,
            txn_id=row["txn_id"],
            timestamp=row["timestamp"],
            amount=float(row["amount"]),
            channel=row.get("channel"),
            device_id=row.get("device_id") if pd.notna(row.get("device_id")) else None,
            ip=row.get("ip") if pd.notna(row.get("ip")) else None,
        )

    return G


def get_ego_network(
    graph: nx.MultiDiGraph,
    center: str,
    hops: int = 1,
    max_nodes: int = 60,
    score_fn: callable | None = None,
) -> tuple[set[str], list[tuple[str, str, dict]]]:
    """Extract an ego-network subgraph around *center*.

    Does BFS up to *hops* levels, caps at *max_nodes* by preferring
    higher-scored neighbours.

    Args:
        graph: The full transaction graph.
        center: Account ID to centre on.
        hops: Number of BFS hops (1–3).
        max_nodes: Hard cap on returned nodes.
        score_fn: Optional callable(node_id) -> int for scoring priority.

    Returns:
        (node_set, edge_list) where each edge is (src, dst, aggregated_data).
    """
    visited: set[str] = {center}
    frontier: set[str] = {center}

    for _ in range(hops):
        next_frontier: set[str] = set()
        for node in frontier:
            for _, nbr, _ in graph.out_edges(node, data=True):
                if nbr not in visited:
                    next_frontier.add(nbr)
            for nbr, _, _ in graph.in_edges(node, data=True):
                if nbr not in visited:
                    next_frontier.add(nbr)
        visited |= next_frontier
        frontier = next_frontier

    # Cap: keep centre + top-scored nodes
    if len(visited) > max_nodes and score_fn is not None:
        ranked = sorted(visited - {center}, key=lambda n: score_fn(n), reverse=True)
        visited = {center} | set(ranked[: max_nodes - 1])

    # Aggregate edges between visited nodes
    edge_agg: dict[tuple[str, str], dict] = {}
    for node in visited:
        for _, dst, data in graph.out_edges(node, data=True):
            if dst not in visited:
                continue
            key = (node, dst)
            if key not in edge_agg:
                edge_agg[key] = {
                    "total_amount": 0.0,
                    "count": 0,
                    "first_time": data["timestamp"],
                }
            edge_agg[key]["total_amount"] += data["amount"]
            edge_agg[key]["count"] += 1
            if data["timestamp"] < edge_agg[key]["first_time"]:
                edge_agg[key]["first_time"] = data["timestamp"]

    edges = [(s, d, agg) for (s, d), agg in edge_agg.items()]
    return visited, edges
