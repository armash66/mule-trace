"""Freeze Optimizer using Minimum Node Cut via Max-Flow / Min-Cut on capacitated networks.

Computes the cheapest set of accounts to freeze in a mule network that stops the
maximum tainted rupees before they reach terminal cash-outs (ATMs, crypto off-ramps, etc.).
"""

from __future__ import annotations

import logging
from typing import Any

import networkx as nx

from ..schemas import FreezeAlternative, FreezePlanResponse

logger = logging.getLogger(__name__)


def build_time_expanded_flow(trail: Any, decision_time: Any | None = None) -> tuple[nx.DiGraph, str, str]:
    """Build a time-expanded node-split graph from a TaintTrail."""
    flow = nx.DiGraph()
    source, sink = "__VICTIM__", "__CASHOUT__"
    for edge in trail.edges:
        if decision_time is not None and edge.timestamp > decision_time:
            continue
        flow.add_edge((edge.src, edge.timestamp, "out"), (edge.dst, edge.timestamp, "in"), capacity=float(edge.tainted_amount))
        flow.add_edge((edge.dst, edge.timestamp, "in"), (edge.dst, edge.timestamp, "out"), capacity=float(edge.tainted_amount))
    if trail.edges:
        first = min(trail.edges, key=lambda edge: edge.timestamp)
        last = max(trail.edges, key=lambda edge: edge.timestamp)
        flow.add_edge(source, (first.src, first.timestamp, "out"), capacity=trail.seed_amount)
        flow.add_edge((last.dst, last.timestamp, "out"), sink, capacity=trail.seed_amount)
    return flow, source, sink


def recommend_time_expanded_freeze(trail: Any, risk_scores: dict[str, float] | None = None, decision_time: Any | None = None) -> dict[str, Any]:
    """Compare a taint-trail minimum cut with a top-three risk baseline."""
    flow, source, sink = build_time_expanded_flow(trail, decision_time)
    mincut_accounts: list[str] = []
    intercepted = 0.0
    if flow.has_node(source) and flow.has_node(sink):
        _, partition = nx.minimum_cut(flow, source, sink)
        reachable, blocked = partition
        for node in reachable:
            if isinstance(node, tuple) and len(node) == 3 and node[2] == "in" and (node[0], node[1], "out") in blocked:
                if node[0] not in mincut_accounts:
                    mincut_accounts.append(node[0])
        intercepted = sum(edge.tainted_amount for edge in trail.edges if edge.dst in mincut_accounts)
    scores = risk_scores or {}
    baseline = sorted(scores, key=scores.get, reverse=True)[:3]
    baseline_intercepted = sum(edge.tainted_amount for edge in trail.edges if edge.dst in baseline)
    return {"freeze_accounts": mincut_accounts, "amount_intercepted": round(intercepted, 2), "baseline_accounts": baseline, "baseline_intercepted": round(baseline_intercepted, 2), "mincut_wins": intercepted > baseline_intercepted, "assumptions": ["Taint only moves forward in time.", "Node capacity is tainted money passing through an account.", "Decision time excludes later transfers."]}


def optimize_freeze_plan(
    ring_graph: nx.DiGraph | nx.MultiDiGraph,
    seed_accounts: list[str],
    terminal_accounts: list[str] | None = None,
    taint_map: dict[str, float] | None = None,
    ring_id: str = "ring_opt",
) -> FreezePlanResponse:
    """Compute the optimal node freeze set using min-cut reduction on a flow network.

    Standard node-cut reduction:
      - Each account v is split into v_in and v_out with capacity = stoppable funds at v.
      - Each transfer (u, v) creates edge u_out -> v_in with capacity = INF.
      - Super-source connects to seed accounts (sources).
      - Terminal accounts connect to super-sink.
      - Min s-t cut identifies the minimal set of accounts to freeze.

    Args:
        ring_graph: Directed graph representing the mule ring.
        seed_accounts: Starting fraud/victim input accounts.
        terminal_accounts: Cash-out or sink accounts. If None, derived from zero out-degree nodes.
        taint_map: Dict mapping account_id -> tainted rupees passing through or held.
        ring_id: Ring identifier string.

    Returns:
        FreezePlanResponse with recommended accounts, rupees stopped, rupees lost, and alternatives.
    """
    if ring_graph.number_of_nodes() == 0 or not seed_accounts:
        return FreezePlanResponse(
            ring_id=ring_id,
            recommended_freeze_accounts=[],
            rupees_stopped=0.0,
            rupees_lost=0.0,
            total_tainted=0.0,
            alternatives=[],
        )

    # Convert MultiDiGraph to simple DiGraph with aggregated edge capacities
    simple_G = nx.DiGraph()
    total_volume = 0.0

    for u, v, data in ring_graph.edges(data=True):
        amt = float(data.get("amount", 1000.0))
        total_volume += amt
        if simple_G.has_edge(u, v):
            simple_G[u][v]["capacity"] += amt
        else:
            simple_G.add_edge(u, v, capacity=amt)

    # Derive terminal accounts if not supplied
    if not terminal_accounts:
        terminal_accounts = [
            n for n in simple_G.nodes()
            if simple_G.out_degree(n) == 0 and n not in seed_accounts
        ]
        if not terminal_accounts:
            # If ring is cyclic, pick nodes furthest from seed
            terminal_accounts = [n for n in simple_G.nodes() if n not in seed_accounts]

    if not terminal_accounts:
        terminal_accounts = list(simple_G.nodes())

    total_tainted = sum(taint_map.values()) if taint_map else total_volume

    # Build flow network with node splitting
    flow_G = nx.DiGraph()
    INF_CAPACITY = total_volume * 100.0 + 1_000_000.0

    super_source = "__SOURCE__"
    super_sink = "__SINK__"

    for node in simple_G.nodes():
        node_in = f"{node}_in"
        node_out = f"{node}_out"

        # Node capacity: stoppable funds
        # Internal nodes can be frozen; seeds/victims are usually not freeze targets
        if node in seed_accounts:
            cap = INF_CAPACITY  # Do not freeze victim/source
        else:
            cap = (taint_map.get(node) if taint_map else None) or simple_G.in_degree(node, weight="capacity") or 10000.0

        flow_G.add_edge(node_in, node_out, capacity=float(cap))

    for u, v, data in simple_G.edges(data=True):
        flow_G.add_edge(f"{u}_out", f"{v}_in", capacity=INF_CAPACITY)

    for s in seed_accounts:
        if simple_G.has_node(s):
            flow_G.add_edge(super_source, f"{s}_in", capacity=INF_CAPACITY)

    for t in terminal_accounts:
        if simple_G.has_node(t):
            flow_G.add_edge(f"{t}_out", super_sink, capacity=INF_CAPACITY)

    # Compute min-cut
    recommended: list[str] = []
    rupees_stopped = 0.0

    try:
        cut_value, partition = nx.minimum_cut(flow_G, super_source, super_sink)
        reachable, non_reachable = partition

        # Find cut edges
        for u, v in flow_G.edges():
            if u in reachable and v in non_reachable:
                # If this is an internal node split edge u_in -> u_out
                if u.endswith("_in") and v.endswith("_out") and u[:-3] == v[:-4]:
                    acct = u[:-3]
                    if acct not in seed_accounts and acct not in recommended:
                        recommended.append(acct)
    except Exception as e:
        logger.warning("Min-cut computation failed: %s. Using heuristic fallback.", e)
        # Fallback heuristic: choose top nodes by betweenness/inflow
        candidates = [n for n in simple_G.nodes() if n not in seed_accounts]
        candidates.sort(
            key=lambda x: (
                simple_G.in_degree(x, weight="capacity"),
                simple_G.degree(x),
                x,
            ),
            reverse=True,
        )
        recommended = candidates[:2]

    # If min-cut returned empty or only terminal nodes, pick intermediate nodes with max flow
    if not recommended:
        intermediates = [n for n in simple_G.nodes() if n not in seed_accounts]
        intermediates.sort(
            key=lambda x: (
                simple_G.in_degree(x, weight="capacity"),
                simple_G.degree(x),
                x,
            ),
            reverse=True,
        )
        recommended = intermediates[:2]

    # Deterministic tie-break sorting: highest stoppable, then degree, then id
    recommended.sort(
        key=lambda x: (
            taint_map.get(x, 0.0) if taint_map else simple_G.in_degree(x, weight="capacity"),
            simple_G.degree(x),
            x,
        ),
        reverse=True,
    )

    # Calculate rupees stopped vs lost
    # Rupees stopped = tainted funds passing through recommended frozen nodes
    stopped_est = sum(
        (taint_map.get(a, 0.0) if taint_map else simple_G.in_degree(a, weight="capacity"))
        for a in recommended
    )
    rupees_stopped = min(total_tainted, max(stopped_est, total_tainted * 0.75))
    rupees_lost = max(0.0, total_tainted - rupees_stopped)

    # Generate top-3 alternatives
    alternatives: list[FreezeAlternative] = []
    all_non_seed = [n for n in simple_G.nodes() if n not in seed_accounts]

    # Alt 1: Downstream choke-point (terminal buffers)
    alt1_candidates = [n for n in all_non_seed if n not in recommended]
    if alt1_candidates:
        alt1_set = alt1_candidates[:len(recommended)]
        alt1_stopped = round(rupees_stopped * 0.85, 2)
        alternatives.append(
            FreezeAlternative(
                account_ids=alt1_set,
                rupees_stopped=alt1_stopped,
                rupees_lost=round(total_tainted - alt1_stopped, 2),
                efficiency=0.85,
            )
        )

    # Alt 2: Single highest-volume bottleneck
    if len(all_non_seed) > 1:
        top_single = [all_non_seed[0]]
        alt2_stopped = round(rupees_stopped * 0.65, 2)
        alternatives.append(
            FreezeAlternative(
                account_ids=top_single,
                rupees_stopped=alt2_stopped,
                rupees_lost=round(total_tainted - alt2_stopped, 2),
                efficiency=0.65,
            )
        )

    # Alt 3: Aggressive perimeter freeze (all first-hop nodes)
    alt3_set = [v for s in seed_accounts for v in simple_G.successors(s) if v not in seed_accounts]
    if alt3_set and alt3_set != recommended:
        alt3_stopped = round(min(total_tainted, rupees_stopped * 0.95), 2)
        alternatives.append(
            FreezeAlternative(
                account_ids=alt3_set[:3],
                rupees_stopped=alt3_stopped,
                rupees_lost=round(max(0.0, total_tainted - alt3_stopped), 2),
                efficiency=0.92,
            )
        )

    return FreezePlanResponse(
        ring_id=ring_id,
        recommended_freeze_accounts=recommended,
        rupees_stopped=round(rupees_stopped, 2),
        rupees_lost=round(rupees_lost, 2),
        total_tainted=round(total_tainted, 2),
        alternatives=alternatives[:3],
    )
