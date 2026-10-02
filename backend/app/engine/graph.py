"""Graph builder: construct NetworkX directed graph from transactions + compute features."""
from __future__ import annotations

import json
import logging
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

import networkx as nx
import numpy as np
import pandas as pd

from app.core.config import DetectorThresholds
from app.core.pii import mask_account_id

logger = logging.getLogger(__name__)

# LRU graph cache per run_id
_graph_cache: dict[str, nx.DiGraph] = {}
MAX_CACHE = 10


class GraphStore:
    """Interface for graph storage. Default: NetworkX. Can be swapped to Neo4j."""

    def __init__(self) -> None:
        self.graph: nx.DiGraph = nx.DiGraph()
        self.accounts: dict[str, dict[str, Any]] = {}
        self.sorted_edges: dict[str, list[dict]] = defaultdict(list)  # account -> sorted outgoing edges
        self.sorted_in_edges: dict[str, list[dict]] = defaultdict(list)  # account -> sorted incoming edges

    def build_from_dataframe(self, df: pd.DataFrame, accounts_df: pd.DataFrame | None = None) -> None:
        """Build graph from cleaned transactions DataFrame."""
        G = nx.DiGraph()
        all_accounts: set[str] = set()

        for _, row in df.iterrows():
            sender = row["sender_account"]
            receiver = row["receiver_account"]
            all_accounts.add(sender)
            all_accounts.add(receiver)

            edge_data = {
                "txn_id": row["txn_id"],
                "timestamp": row["timestamp"],
                "amount": float(row["amount"]),
                "channel": row.get("channel"),
                "device_id": row.get("device_id"),
                "ip_address": row.get("ip_address"),
                "is_victim_report": bool(row.get("is_victim_report", False)),
            }

            # NetworkX multi-edge: use txn_id as key
            if G.has_edge(sender, receiver):
                # Add to existing edge list
                existing = G[sender][receiver]
                existing.setdefault("transfers", []).append(edge_data)
                existing["total_amount"] = existing.get("total_amount", 0) + edge_data["amount"]
                existing["count"] = existing.get("count", 0) + 1
            else:
                G.add_edge(
                    sender, receiver,
                    transfers=[edge_data],
                    total_amount=edge_data["amount"],
                    count=1,
                )

        # Build sorted edge lists for efficient time-window queries
        for sender, receiver, data in G.edges(data=True):
            for t in data.get("transfers", []):
                self.sorted_edges[sender].append({**t, "target": receiver})
                self.sorted_in_edges[receiver].append({**t, "source": sender})

        # Sort by timestamp
        for acct in self.sorted_edges:
            self.sorted_edges[acct].sort(key=lambda x: x["timestamp"])
        for acct in self.sorted_in_edges:
            self.sorted_in_edges[acct].sort(key=lambda x: x["timestamp"])

        # Compute per-account features
        for acct in all_accounts:
            in_edges = self.sorted_in_edges.get(acct, [])
            out_edges = self.sorted_edges.get(acct, [])

            total_in = sum(e["amount"] for e in in_edges)
            total_out = sum(e["amount"] for e in out_edges)

            # Get account metadata if available
            acct_meta: dict[str, Any] = {}
            if accounts_df is not None and acct in accounts_df.index:
                acct_meta = accounts_df.loc[acct].to_dict()

            self.accounts[acct] = {
                "account_id": acct,
                "in_degree": len(set(e["source"] for e in in_edges)),
                "out_degree": len(set(e["target"] for e in out_edges)),
                "total_in": total_in,
                "total_out": total_out,
                "net_flow": total_in - total_out,
                "tx_count": len(in_edges) + len(out_edges),
                "first_seen": min(
                    (e["timestamp"] for e in in_edges + out_edges),
                    default=None,
                ),
                "last_seen": max(
                    (e["timestamp"] for e in in_edges + out_edges),
                    default=None,
                ),
                "devices": list(set(
                    e.get("device_id") for e in in_edges + out_edges
                    if e.get("device_id")
                )),
                "ips": list(set(
                    e.get("ip_address") for e in in_edges + out_edges
                    if e.get("ip_address")
                )),
                "channels": list(set(
                    e.get("channel") for e in in_edges + out_edges
                    if e.get("channel")
                )),
                "open_date": acct_meta.get("open_date"),
                "age_days": acct_meta.get("age_days"),
                "segment": acct_meta.get("segment"),
                "kyc_phone_hash": acct_meta.get("kyc_phone_hash"),
                "kyc_address_hash": acct_meta.get("kyc_address_hash"),
                "kyc_pan_hash": acct_meta.get("kyc_pan_hash"),
            }

            G.nodes[acct].update(self.accounts[acct])

        self.graph = G
        logger.info(f"Built graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    def get_subgraph(
        self,
        center: str,
        hops: int = 2,
        min_amount: float = 0.0,
        max_nodes: int = 300,
    ) -> dict[str, Any]:
        """Extract neighborhood subgraph for visualization."""
        if center not in self.graph:
            return {"center": center, "nodes": [], "edges": [], "truncated": False}

        # BFS to collect neighborhood
        visited: set[str] = {center}
        frontier: set[str] = {center}
        for _ in range(hops):
            next_frontier: set[str] = set()
            for node in frontier:
                for neighbor in set(self.graph.successors(node)) | set(self.graph.predecessors(node)):
                    if neighbor not in visited:
                        next_frontier.add(neighbor)
                        visited.add(neighbor)
            frontier = next_frontier
            if len(visited) >= max_nodes:
                break

        truncated = len(visited) >= max_nodes
        subgraph_nodes = list(visited)[:max_nodes]

        # Compute layout
        sub_g = self.graph.subgraph(subgraph_nodes)
        positions = layout_hint(sub_g)

        nodes = []
        for n in subgraph_nodes:
            data = self.accounts.get(n, {})
            pos = positions.get(n, (0, 0))
            nodes.append({
                "id": n,
                "label": mask_account_id(n),
                "risk": data.get("risk_score", 0),
                "band": data.get("risk_band", "LOW"),
                "age_days": data.get("age_days"),
                "ring_id": data.get("ring_id"),
                "status": data.get("status", "UNREVIEWED"),
                "signals": data.get("signal_types", []),
                "flow_through": data.get("total_in", 0) + data.get("total_out", 0),
                "x": float(pos[0]),
                "y": float(pos[1]),
            })

        edges = []
        for u, v, edata in sub_g.edges(data=True):
            for t in edata.get("transfers", []):
                if t["amount"] >= min_amount:
                    edges.append({
                        "id": t["txn_id"],
                        "source": u,
                        "target": v,
                        "amount": t["amount"],
                        "ts": t["timestamp"].isoformat() if hasattr(t["timestamp"], "isoformat") else str(t["timestamp"]),
                        "channel": t.get("channel"),
                    })

        return {
            "center": center,
            "nodes": nodes,
            "edges": edges,
            "truncated": truncated,
        }


def layout_hint(G: nx.DiGraph) -> dict[str, tuple[float, float]]:
    """Compute layout positions for graph visualization.
    
    Uses spring layout scaled to canvas coordinates.
    Server-side hints for fast first paint.
    """
    if G.number_of_nodes() == 0:
        return {}

    try:
        pos = nx.spring_layout(G, k=2.0 / math.sqrt(max(G.number_of_nodes(), 1)), iterations=50, seed=42)
    except Exception:
        pos = nx.random_layout(G, seed=42)

    # Scale to canvas coordinates (0-800)
    scaled = {}
    for node, (x, y) in pos.items():
        scaled[node] = (round(x * 400 + 400, 1), round(y * 300 + 300, 1))
    return scaled


def cache_graph(run_id: str, store: GraphStore) -> None:
    """Cache a graph store by run_id with LRU eviction."""
    global _graph_cache
    if len(_graph_cache) >= MAX_CACHE:
        oldest = next(iter(_graph_cache))
        del _graph_cache[oldest]
    _graph_cache[run_id] = store.graph


def get_cached_graph(run_id: str) -> nx.DiGraph | None:
    """Retrieve cached graph."""
    return _graph_cache.get(run_id)
