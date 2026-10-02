"""Heist Replay event generator for MuleTrace.

Generates a chronological sequence of transfer events for a fraud ring,
annotated with taint volumes and freeze intervention points.
Powers the 60fps interactive replay screen and 'what-if' freeze simulation.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import networkx as nx
import pandas as pd

from ..schemas import ReplayEvent, ReplayResponse


def generate_ring_replay(
    G: nx.MultiDiGraph,
    ring_accounts: list[str],
    ring_id: str = "RNG-REPLAY",
    frozen_accounts: list[str] | None = None,
) -> ReplayResponse:
    """Generate time-ordered transaction sequence with freeze simulation.

    Args:
        G: Transaction MultiDiGraph.
        ring_accounts: List of account IDs belonging to the ring.
        ring_id: Identifier of the ring.
        frozen_accounts: Optional list of accounts frozen during simulation.

    Returns:
        ReplayResponse with ordered events and aggregate stopped/tainted metrics.
    """
    account_set = set(ring_accounts)
    events: list[dict[str, Any]] = []

    # Collect transfers involving ring accounts
    for u, v, k, data in G.edges(keys=True, data=True):
        if u in account_set or v in account_set:
            raw_ts = data.get("timestamp")
            if isinstance(raw_ts, datetime):
                ts = raw_ts
            elif isinstance(raw_ts, str):
                ts = pd.to_datetime(raw_ts, utc=True).to_pydatetime()
            else:
                continue

            amt = float(data.get("amount", 0.0))
            events.append({
                "timestamp": ts,
                "src": u,
                "dst": v,
                "amount": amt,
            })

    # Sort strictly chronologically
    events.sort(key=lambda e: e["timestamp"])

    freeze_set = set(frozen_accounts or [])
    stopped_nodes: set[str] = set()

    replay_events: list[ReplayEvent] = []
    total_amount = 0.0
    total_tainted = 0.0
    stoppable_rupees = 0.0

    for ev in events:
        src = ev["src"]
        dst = ev["dst"]
        amt = ev["amount"]
        ts_str = ev["timestamp"].strftime("%d-%m-%Y • %I:%M %p")

        total_amount += amt
        # Most intra-ring transfers carry full or near-full taint
        taint = amt if (src in account_set and dst in account_set) else amt * 0.9
        total_tainted += taint

        # Simulate freeze intervention
        is_freeze = (src in freeze_set or dst in freeze_set)
        if is_freeze:
            stopped_nodes.add(src)
            stopped_nodes.add(dst)

        # If source has already been stopped, downstream money flow is intercepted
        if src in stopped_nodes:
            status = "stopped"
            stoppable_rupees += taint
        else:
            status = "transferred"

        replay_events.append(
            ReplayEvent(
                timestamp=ts_str,
                src=src,
                dst=dst,
                amount=round(amt, 2),
                tainted_amount=round(taint, 2),
                status=status,
                is_freeze_point=is_freeze,
            )
        )

    return ReplayResponse(
        ring_id=ring_id,
        events=replay_events,
        total_amount=round(total_amount, 2),
        total_tainted=round(total_tainted, 2),
        stoppable_rupees=round(stoppable_rupees if freeze_set else total_tainted * 0.85, 2),
        accounts=list(account_set),
        estimate_note="estimate, not traced" if not freeze_set else None,
    )
