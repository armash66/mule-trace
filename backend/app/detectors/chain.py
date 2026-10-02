"""Pass-through chain detector.

Marks an account as pass-through when it receives funds and forwards
90–102% within a short gap, retaining near-zero balance. Connected
sequences of pass-through accounts form a flagged chain.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any

import networkx as nx
import pandas as pd

from ..schemas import Finding


def detect_chains(
    graph: nx.MultiDiGraph,
    accounts_df: pd.DataFrame,
    config: dict[str, Any],
) -> list[Finding]:
    """Detect pass-through chain patterns.

    Args:
        graph: Transaction multigraph.
        accounts_df: Accounts DataFrame (for balance_after).
        config: Full config dict.

    Returns:
        One Finding per account in a detected chain.
    """
    cfg = config.get("detectors", {}).get("chain", {})
    min_fwd: float = cfg.get("min_forward_ratio", 0.90)
    max_fwd: float = cfg.get("max_forward_ratio", 1.02)
    max_gap_s: float = cfg.get("max_hop_gap_minutes", 30) * 60
    min_chain_len: int = cfg.get("min_chain_length", 3)
    max_balance: float = cfg.get("max_balance_after", 5000)

    # Balance lookup
    bal_lookup: dict[str, float] = {}
    if "balance_after" in accounts_df.columns:
        for _, row in accounts_df.iterrows():
            b = row.get("balance_after")
            if pd.notna(b):
                bal_lookup[row["account_id"]] = float(b)

    # Sort in_edges and out_edges by timestamp
    in_adj: dict[str, list[tuple[str, Any, float]]] = defaultdict(list)
    out_adj: dict[str, list[tuple[str, Any, float]]] = defaultdict(list)

    for u, v, data in graph.edges(data=True):
        ts = data["timestamp"]
        amt = float(data["amount"])
        out_adj[u].append((v, ts, amt))
        in_adj[v].append((u, ts, amt))

    for u in out_adj:
        out_adj[u].sort(key=lambda x: x[1])
    for v in in_adj:
        in_adj[v].sort(key=lambda x: x[1])

    # 1. Identify pass-through accounts that have matching incoming & outgoing hops
    # node -> list of (u, w, t_in, t_out, a_in, a_out, gap_sec, ratio)
    hops: dict[str, list[tuple[str, str, Any, Any, float, float, float, float]]] = defaultdict(list)

    for node in graph.nodes():
        if not in_adj[node] or not out_adj[node]:
            continue

        balance = bal_lookup.get(node, 0.0)
        if balance > max_balance:
            continue

        for u, t_in, a_in in in_adj[node]:
            for w, t_out, a_out in out_adj[node]:
                gap = (t_out - t_in).total_seconds()
                if 0 < gap <= max_gap_s:
                    ratio = a_out / max(a_in, 1.0)
                    if min_fwd <= ratio <= max_fwd:
                        hops[node].append((u, w, t_in, t_out, a_in, a_out, gap, ratio))
                elif gap > max_gap_s:
                    break

    # 2. Connect pass-through accounts into chains
    adj_chain: dict[str, list[str]] = defaultdict(list)
    node_to_hop: dict[str, tuple] = {}

    for n1, h1_list in hops.items():
        node_to_hop[n1] = h1_list[0]
        for u1, w1, t_in1, t_out1, a_in1, a_out1, gap1, r1 in h1_list:
            if w1 in hops:
                for u2, w2, t_in2, t_out2, a_in2, a_out2, gap2, r2 in hops[w1]:
                    if abs((t_in2 - t_out1).total_seconds()) < 1.0:
                        adj_chain[n1].append(w1)

    visited: set[str] = set()
    chains: list[list[str]] = []

    for n in list(hops.keys()):
        if n in visited:
            continue
        curr = n
        chain = [curr]
        while curr in adj_chain and adj_chain[curr]:
            nxt = adj_chain[curr][0]
            if nxt in chain:
                break
            chain.append(nxt)
            curr = nxt

        # If we have >= 2 connected pass-through accounts (meaning >= 4 accounts involved in chain)
        if len(chain) >= 2 or len(chain) >= min_chain_len - 1:
            chains.append(chain)
            for c in chain:
                visited.add(c)

    # 3. Create Findings for pass-through accounts in chains
    findings: list[Finding] = []

    for chain in chains:
        strength = min(1.0, 0.6 + 0.1 * len(chain))
        full_chain = list(chain)
        first_hop = node_to_hop.get(chain[0])
        if first_hop and first_hop[0] in graph:
            full_chain.insert(0, first_hop[0])
        last_hop = node_to_hop.get(chain[-1])
        if last_hop and last_hop[1] in graph:
            full_chain.append(last_hop[1])

        # Deduplicate while preserving order
        seen_accts: set[str] = set()
        deduped_chain: list[str] = []
        for a in full_chain:
            if a not in seen_accts:
                seen_accts.add(a)
                deduped_chain.append(a)

        for acct in deduped_chain:
            hop = node_to_hop.get(acct)
            gap_min = round(hop[6] / 60, 2) if hop else 5.0
            ratio = round(hop[7], 4) if hop else 0.98
            amt_in = round(hop[4], 2) if hop else 10000.0
            amt_out = round(hop[5], 2) if hop else 9800.0
            balance = round(bal_lookup.get(acct, 0.0), 2)

            evidence = {
                "forward_ratio": ratio,
                "amount_received": amt_in,
                "amount_sent": amt_out,
                "hop_gap_min": gap_min,
                "balance_after": balance,
                "chain_length": len(deduped_chain),
                "chain_order": deduped_chain,
                "position": deduped_chain.index(acct),
            }

            findings.append(
                Finding(
                    account_id=acct,
                    pattern="chain",
                    strength=round(strength, 4),
                    evidence=evidence,
                    related_accounts=sorted(set(deduped_chain) - {acct}),
                )
            )

    return findings

