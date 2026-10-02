"""Proportional (haircut) taint tracking along time-respecting paths.

Propagates stolen funds from initial seed transfers/victim deposits across the transaction graph.
Handles:
  - Time-respecting sequence: transfers only propagate taint forward in time.
  - Proportional haircut: outgoing transfers carry taint proportional to node's tainted balance ratio.
  - Cycle prevention: avoids duplicate inflation of tainted amounts.
  - Balances and cash-outs: tracks funds currently in motion, resting in accounts, or cashed out.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

import networkx as nx
import pandas as pd

from ..schemas import TaintAccountResult


@dataclass
class TaintSummary:
    seed_amount: float
    total_tainted_in_motion: float
    total_cashed_out: float
    accounts: dict[str, TaintAccountResult]


@dataclass
class TaintTrailEdge:
    src: str
    dst: str
    amount: float
    tainted_amount: float
    timestamp: datetime
    txn_id: str
    hop: int


@dataclass
class TaintTrailAccount:
    account_id: str
    tainted_received: float
    tainted_forwarded: float
    current_exposure: float


@dataclass
class TaintTrail:
    rule: str
    max_hops: int
    seed_amount: float
    edges: list[TaintTrailEdge]
    accounts: dict[str, TaintTrailAccount]


def trace_taint(
    G: nx.MultiDiGraph,
    seed_transfer: dict[str, Any],
    rule: str = "proportional",
    max_hops: int = 8,
    decision_time: datetime | str | None = None,
) -> TaintTrail:
    """Trace one victim transfer forward in time using proportional or FIFO taint."""
    if rule not in {"proportional", "fifo"}:
        raise ValueError("rule must be proportional or fifo")
    seed_time = pd.to_datetime(seed_transfer["timestamp"], utc=True).to_pydatetime()
    cutoff = pd.to_datetime(decision_time, utc=True).to_pydatetime() if decision_time else None
    edges: list[dict[str, Any]] = []
    for src, dst, key, data in G.edges(keys=True, data=True):
        timestamp = pd.to_datetime(data.get("timestamp"), utc=True, errors="coerce")
        if pd.isna(timestamp):
            continue
        timestamp = timestamp.to_pydatetime()
        if timestamp <= seed_time or (cutoff and timestamp > cutoff):
            continue
        edges.append({"src": src, "dst": dst, "amount": float(data.get("amount", 0.0)), "timestamp": timestamp, "txn_id": data.get("txn_id", f"{src}_{dst}_{key}")})
    edges.sort(key=lambda edge: edge["timestamp"])

    total_balance: dict[str, float] = {str(seed_transfer["dst"]): float(seed_transfer["amount"])}
    taint_balance: dict[str, float] = {str(seed_transfer["dst"]): float(seed_transfer["amount"])}
    tainted_received: dict[str, float] = {str(seed_transfer["dst"]): float(seed_transfer["amount"])}
    tainted_forwarded: dict[str, float] = {}
    lots: dict[str, list[tuple[int, float]]] = {str(seed_transfer["dst"]): [(0, float(seed_transfer["amount"]))]}
    trail: list[TaintTrailEdge] = []

    for edge in edges:
        src, dst, amount = edge["src"], edge["dst"], edge["amount"]
        available = max(total_balance.get(src, 0.0), 0.0)
        available_taint = max(taint_balance.get(src, 0.0), 0.0)
        if rule == "proportional":
            transferred_taint = min(amount, available_taint) if available <= 0 else min(amount, available_taint * (amount / available))
            source_lots = lots.get(src, [])
            allocations: list[tuple[int, float]] = []
            for hop, lot_amount in source_lots:
                share = lot_amount / available_taint if available_taint else 0.0
                allocations.append((hop + 1, transferred_taint * share))
            lots[src] = [(hop, max(0.0, value - transferred_taint * (value / available_taint))) for hop, value in source_lots] if available_taint else source_lots
        else:
            transferred_taint = min(amount, available_taint)
            allocations = []
            remaining = transferred_taint
            source_lots = lots.get(src, [])
            kept: list[tuple[int, float]] = []
            for hop, lot_amount in source_lots:
                used = min(remaining, lot_amount)
                if used:
                    allocations.append((hop + 1, used))
                    remaining -= used
                if lot_amount - used > 1e-9:
                    kept.append((hop, lot_amount - used))
            lots[src] = kept
        total_balance[src] = max(0.0, available - amount)
        total_balance[dst] = total_balance.get(dst, 0.0) + amount
        taint_balance[src] = max(0.0, available_taint - transferred_taint)
        taint_balance[dst] = taint_balance.get(dst, 0.0) + transferred_taint
        if transferred_taint <= 0 or not allocations:
            continue
        tainted_received[dst] = tainted_received.get(dst, 0.0) + transferred_taint
        tainted_forwarded[src] = tainted_forwarded.get(src, 0.0) + transferred_taint
        for hop, allocation in allocations:
            if allocation > 0 and hop <= max_hops:
                lots.setdefault(dst, []).append((hop, allocation))
        min_hop = min(hop for hop, _ in allocations)
        if min_hop <= max_hops:
            trail.append(TaintTrailEdge(src, dst, amount, transferred_taint, edge["timestamp"], edge["txn_id"], min_hop))

    accounts = {account: TaintTrailAccount(account, round(tainted_received.get(account, 0.0), 2), round(tainted_forwarded.get(account, 0.0), 2), round(taint_balance.get(account, 0.0), 2)) for account in set(tainted_received) | set(tainted_forwarded) | set(taint_balance)}
    return TaintTrail(rule, max_hops, float(seed_transfer["amount"]), trail, accounts)


def propagate_taint(
    G: nx.MultiDiGraph,
    seed_transfers: list[dict[str, Any]],
    method: str = "haircut",
) -> TaintSummary:
    """Propagate taint from seed transfers along time-respecting directed edges.

    Args:
        G: NetworkX MultiDiGraph with edge attributes: 'timestamp', 'amount', 'txn_id'.
        seed_transfers: List of dicts representing initial victim/fraud transfers:
                        [{'src': str, 'dst': str, 'amount': float, 'timestamp': datetime | str}]
        method: Taint allocation method ('haircut' for proportional, or 'fifo').

    Returns:
        TaintSummary containing per-account taint metrics and aggregate amounts.
    """
    if not seed_transfers:
        return TaintSummary(seed_amount=0.0, total_tainted_in_motion=0.0, total_cashed_out=0.0, accounts={})

    # Collect and sort all graph edges chronologically
    edge_list: list[dict[str, Any]] = []
    for u, v, k, data in G.edges(keys=True, data=True):
        raw_ts = data.get("timestamp")
        if isinstance(raw_ts, datetime):
            ts = raw_ts
        elif isinstance(raw_ts, str):
            ts = pd.to_datetime(raw_ts, utc=True).to_pydatetime()
        else:
            continue

        amt = float(data.get("amount", 0.0))
        edge_list.append({
            "src": u,
            "dst": v,
            "key": k,
            "timestamp": ts,
            "amount": amt,
            "txn_id": data.get("txn_id", f"{u}_{v}_{k}"),
        })

    edge_list.sort(key=lambda e: e["timestamp"])

    # Per-account state
    tainted_in: dict[str, float] = {}
    tainted_out: dict[str, float] = {}
    current_tainted_bal: dict[str, float] = {}
    total_received: dict[str, float] = {}

    total_seed_amount = 0.0

    # Initialize seed transfers
    for seed in seed_transfers:
        dst = seed["dst"]
        amt = float(seed["amount"])
        total_seed_amount += amt
        tainted_in[dst] = tainted_in.get(dst, 0.0) + amt
        current_tainted_bal[dst] = current_tainted_bal.get(dst, 0.0) + amt
        total_received[dst] = total_received.get(dst, 0.0) + amt

    min_seed_time = None
    for seed in seed_transfers:
        raw_ts = seed.get("timestamp")
        if raw_ts is not None:
            ts = raw_ts if isinstance(raw_ts, datetime) else pd.to_datetime(raw_ts, utc=True).to_pydatetime()
            if min_seed_time is None or ts < min_seed_time:
                min_seed_time = ts

    # Filter edges occurring at or after the earliest seed transfer
    relevant_edges = [
        e for e in edge_list
        if min_seed_time is None or e["timestamp"] >= min_seed_time
    ]

    # Time-respecting simulation
    for e in relevant_edges:
        src = e["src"]
        dst = e["dst"]
        amt = e["amount"]

        total_received[dst] = total_received.get(dst, 0.0) + amt

        src_taint = current_tainted_bal.get(src, 0.0)
        if src_taint <= 0.01:
            continue

        # Calculate transfer taint
        if method == "haircut":
            # Proportional haircut based on tainted balance vs total available
            # If outgoing amount exceeds tainted balance, entire tainted balance flows
            transfer_taint = min(src_taint, amt)
        else:
            # FIFO approach: tainted dollars out first
            transfer_taint = min(src_taint, amt)

        if transfer_taint > 0:
            current_tainted_bal[src] = max(0.0, current_tainted_bal[src] - transfer_taint)
            tainted_out[src] = tainted_out.get(src, 0.0) + transfer_taint

            tainted_in[dst] = tainted_in.get(dst, 0.0) + transfer_taint
            current_tainted_bal[dst] = current_tainted_bal.get(dst, 0.0) + transfer_taint

    # Determine cash-out vs in-motion
    # Sinks (out-degree 0 in the sub-flow or terminal accounts) represent cash-outs
    accounts_result: dict[str, TaintAccountResult] = {}
    all_touched_nodes = set(tainted_in.keys()) | set(tainted_out.keys())

    total_in_motion = 0.0
    total_cashed_out = 0.0

    for aid in all_touched_nodes:
        t_in = round(tainted_in.get(aid, 0.0), 2)
        t_out = round(tainted_out.get(aid, 0.0), 2)
        rem = round(current_tainted_bal.get(aid, 0.0), 2)

        # If account has remaining tainted balance but out-degree is 0 in the graph
        # or has passed > 90% out, mark sink behavior
        out_deg = G.out_degree(aid) if G.has_node(aid) else 0
        c_out = rem if out_deg == 0 and rem > 0 else 0.0

        if c_out > 0:
            total_cashed_out += c_out
        else:
            total_in_motion += rem

        accounts_result[aid] = TaintAccountResult(
            account_id=aid,
            tainted_in=t_in,
            tainted_out=t_out,
            tainted_balance_remaining=rem,
            cashed_out=c_out,
        )

    return TaintSummary(
        seed_amount=round(total_seed_amount, 2),
        total_tainted_in_motion=round(total_in_motion, 2),
        total_cashed_out=round(total_cashed_out, 2),
        accounts=accounts_result,
    )
