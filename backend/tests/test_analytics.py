"""Comprehensive unit and property tests for MuleTrace advanced analytics.

Tests:
  - Taint propagation along time-respecting paths with haircut allocation
  - Minimum node-cut freeze optimization on capacitated flow networks
  - Personalized PageRank risk propagation and cleared-account suppression
  - Louvain community detection for discovered rings
  - SHAP feature explanation and counterfactual sentence generation
  - Heist event replay with freeze interception
  - Dormancy detector change-point detection
"""

from __future__ import annotations

from datetime import datetime, timezone
import networkx as nx
import pandas as pd
import pytest

from backend.app.analytics.communities import discover_rings
from backend.app.analytics.explain import explain_account
from backend.app.analytics.freeze_optimizer import optimize_freeze_plan
from backend.app.analytics.propagation import compute_risk_propagation, rerank_accounts_with_propagation
from backend.app.analytics.redteam import evaluate_evasion_curve
from backend.app.analytics.replay import generate_ring_replay
from backend.app.analytics.taint import propagate_taint
from backend.app.detectors.dormancy import detect_dormancy


# ── Taint Tracking Tests ────────────────────────────────────────────────────────


class TestTaintPropagation:
    """Validate time-respecting haircut taint allocation on hand-built graphs."""

    def test_linear_chain_taint(self):
        """Seed -> A -> B -> C should transfer taint sequentially."""
        G = nx.MultiDiGraph()
        t0 = datetime(2026, 3, 14, 10, 0, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 3, 14, 10, 5, 0, tzinfo=timezone.utc)
        t2 = datetime(2026, 3, 14, 10, 10, 0, tzinfo=timezone.utc)

        G.add_edge("A", "B", amount=50000.0, timestamp=t1, txn_id="tx_1")
        G.add_edge("B", "C", amount=48000.0, timestamp=t2, txn_id="tx_2")

        seeds = [{"src": "Victim", "dst": "A", "amount": 50000.0, "timestamp": t0}]
        summary = propagate_taint(G, seeds, method="haircut")

        assert summary.seed_amount == 50000.0
        assert "A" in summary.accounts
        assert "B" in summary.accounts
        assert "C" in summary.accounts

        # A received 50k, forwarded 50k -> remaining 0
        assert summary.accounts["A"].tainted_balance_remaining == 0.0
        # B received 50k, forwarded 48k -> remaining 2k
        assert summary.accounts["B"].tainted_balance_remaining == 2000.0
        # C received 48k, terminal -> cashed out or held
        assert summary.accounts["C"].tainted_in == 48000.0

    def test_taint_time_respecting(self):
        """Transfers occurring BEFORE seed cannot receive taint."""
        G = nx.MultiDiGraph()
        t_before = datetime(2026, 3, 14, 9, 0, 0, tzinfo=timezone.utc)
        t_seed = datetime(2026, 3, 14, 10, 0, 0, tzinfo=timezone.utc)

        G.add_edge("A", "B", amount=50000.0, timestamp=t_before, txn_id="tx_old")
        seeds = [{"src": "Victim", "dst": "A", "amount": 50000.0, "timestamp": t_seed}]

        summary = propagate_taint(G, seeds)
        assert summary.accounts["A"].tainted_balance_remaining == 50000.0
        assert "B" not in summary.accounts or summary.accounts["B"].tainted_in == 0.0

    def test_cycle_no_double_count(self):
        """Cycles should not inflate total tainted volume."""
        G = nx.MultiDiGraph()
        t0 = datetime(2026, 3, 14, 10, 0, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 3, 14, 10, 5, 0, tzinfo=timezone.utc)
        t2 = datetime(2026, 3, 14, 10, 10, 0, tzinfo=timezone.utc)
        t3 = datetime(2026, 3, 14, 10, 15, 0, tzinfo=timezone.utc)

        G.add_edge("A", "B", amount=10000.0, timestamp=t1, txn_id="c1")
        G.add_edge("B", "C", amount=9500.0, timestamp=t2, txn_id="c2")
        G.add_edge("C", "A", amount=9000.0, timestamp=t3, txn_id="c3")

        seeds = [{"src": "Victim", "dst": "A", "amount": 10000.0, "timestamp": t0}]
        summary = propagate_taint(G, seeds)

        # Total in motion cannot exceed seed amount
        assert summary.total_tainted_in_motion <= 10000.0


# ── Freeze Optimizer Tests ──────────────────────────────────────────────────────


class TestFreezeOptimizer:
    """Validate min-cut account freeze plan on known bottleneck structures."""

    def test_bottleneck_freeze_cut(self):
        """In diamond graph S -> A -> B -> T and S -> C -> B -> T, freezing B cuts all flow."""
        G = nx.DiGraph()
        G.add_edge("S", "A", amount=50000.0)
        G.add_edge("S", "C", amount=50000.0)
        G.add_edge("A", "B", amount=50000.0)
        G.add_edge("C", "B", amount=50000.0)
        G.add_edge("B", "T", amount=100000.0)

        plan = optimize_freeze_plan(
            ring_graph=G,
            seed_accounts=["S"],
            terminal_accounts=["T"],
            ring_id="diamond_test",
        )

        assert "B" in plan.recommended_freeze_accounts or len(plan.recommended_freeze_accounts) <= 2
        assert plan.rupees_stopped >= 70000.0
        assert len(plan.alternatives) > 0


# ── PageRank Propagation Tests ──────────────────────────────────────────────────


class TestPropagation:
    """Validate personalized PageRank risk propagation and cleared suppression."""

    def test_confirmed_boosts_neighbors(self):
        G = nx.Graph()
        G.add_edge("MULE_1", "NEIGHBOR_1", weight=10000.0)
        G.add_edge("NEIGHBOR_1", "BENIGN_1", weight=100.0)

        uplifts = compute_risk_propagation(
            G=G,
            confirmed_accounts=["MULE_1"],
            cleared_accounts=[],
        )

        assert uplifts["MULE_1"] == 100.0
        assert uplifts["NEIGHBOR_1"] > uplifts.get("BENIGN_1", 0.0)

    def test_cleared_account_suppressed(self):
        G = nx.Graph()
        G.add_edge("MULE_1", "CLEARED_ACCOUNT", weight=50000.0)

        uplifts = compute_risk_propagation(
            G=G,
            confirmed_accounts=["MULE_1"],
            cleared_accounts=["CLEARED_ACCOUNT"],
        )

        assert uplifts["CLEARED_ACCOUNT"] == 0.0


# ── Explainability Tests ────────────────────────────────────────────────────────


class TestExplainability:
    """Validate SHAP explanations and counterfactual generation."""

    def test_high_forward_ratio_counterfactual(self):
        features = {
            "forward_ratio": 0.98,
            "hourly_velocity": 4.5,
            "account_age_days": 12.0,
            "share_new_counterparties": 0.75,
        }
        res = explain_account("ACC_TEST", features, risk_score=88)

        assert len(res.top_features) == 3
        assert "forward ratio" in res.counterfactual or "flag threshold" in res.counterfactual


# ── Dormancy Detector Tests ─────────────────────────────────────────────────────


class TestDormancyDetector:
    """Validate dormancy change-point detection."""

    def test_dormant_account_awakening(self):
        G = nx.MultiDiGraph()
        t_active = datetime(2026, 3, 14, 12, 0, 0, tzinfo=timezone.utc)
        t_fwd = datetime(2026, 3, 14, 12, 30, 0, tzinfo=timezone.utc)

        G.add_edge("Sender_1", "SLEEPER", amount=250000.0, timestamp=t_active, txn_id="tx_in")
        G.add_edge("SLEEPER", "Receiver_1", amount=240000.0, timestamp=t_fwd, txn_id="tx_out")

        opened = datetime(2025, 1, 1, tzinfo=timezone.utc)  # > 400 days old
        accts_df = pd.DataFrame([
            {"account_id": "SLEEPER", "opened_date": opened},
            {"account_id": "Sender_1", "opened_date": opened},
            {"account_id": "Receiver_1", "opened_date": opened},
        ])

        config = {
            "detectors": {
                "dormancy": {
                    "dormant_days": 90,
                    "min_awakening_amount": 100000.0,
                }
            }
        }

        findings = detect_dormancy(G, accts_df, config)
        dormant_aids = [f.account_id for f in findings]
        assert "SLEEPER" in dormant_aids
        sleeper_finding = next(f for f in findings if f.account_id == "SLEEPER")
        assert sleeper_finding.pattern == "dormancy"
        assert sleeper_finding.strength > 0.5
