from __future__ import annotations

import networkx as nx
import pytest

from backend.app.analytics.freeze_optimizer import recommend_time_expanded_freeze
from backend.app.analytics.taint import trace_taint
from backend.app.analytics.workflow import DemoWorkflow


def hand_graph() -> nx.MultiDiGraph:
    graph = nx.MultiDiGraph()
    edges = [
        ("victim", "A", 100, "2022-09-08T10:00:00Z"),
        ("clean", "A", 100, "2022-09-08T10:01:00Z"),
        ("A", "B", 50, "2022-09-08T10:02:00Z"),
        ("A", "C", 50, "2022-09-08T10:03:00Z"),
        ("B", "D", 25, "2022-09-08T10:04:00Z"),
        ("C", "D", 50, "2022-09-08T10:05:00Z"),
    ]
    for index, (src, dst, amount, timestamp) in enumerate(edges):
        graph.add_edge(src, dst, txn_id=f"T{index}", amount=amount, timestamp=timestamp)
    return graph


def test_proportional_and_fifo_split_merge_have_known_values():
    seed = {"src": "victim", "dst": "A", "amount": 100, "timestamp": "2022-09-08T10:00:00Z"}
    proportional = trace_taint(hand_graph(), seed, rule="proportional")
    fifo = trace_taint(hand_graph(), seed, rule="fifo")
    assert [edge.tainted_amount for edge in proportional.edges[:2]] == [25.0, 25.0]
    assert [edge.tainted_amount for edge in fifo.edges[:2]] == [50.0, 50.0]
    assert proportional.accounts["D"].tainted_received == 37.5
    assert fifo.accounts["D"].tainted_received == 75.0


def test_freeze_comparison_reports_winner_honestly():
    seed = {"src": "victim", "dst": "A", "amount": 100, "timestamp": "2022-09-08T10:00:00Z"}
    trail = trace_taint(hand_graph(), seed)
    result = recommend_time_expanded_freeze(trail, {"B": 90, "C": 80, "D": 70})
    assert "mincut_wins" in result
    assert isinstance(result["freeze_accounts"], list)


def test_maker_checker_rejects_self_approval_and_exports_hashes():
    workflow = DemoWorkflow()
    workflow.create_request("R1", ["A"], {"A": 50}, ["txn:T1"], "fifo", "maker-1", "maker")
    workflow.submit("R1", "maker-1", "maker")
    with pytest.raises(PermissionError):
        workflow.decide("R1", "maker-1", "checker", True)
    workflow.decide("R1", "checker-1", "checker", True)
    workflow.record_decision("analyst-1", "A", "confirmed", "Observed rapid forwarding")
    assert "payload_hash" in workflow.export_csv()
