"""Detection engine unit tests for patterns: Fan-In/Fan-Out, Cycles, Pass-Through, Guards."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import pandas as pd
import pytest

from app.core.config import DetectorThresholds
from app.engine.detectors.cycles import detect_cycles
from app.engine.detectors.fan_in_out import detect_fan_in_out
from app.engine.detectors.pass_through import detect_pass_through
from app.engine.graph import GraphStore
from app.engine.guards import apply_guards


def _base_ts():
    return datetime(2026, 10, 1, 10, 0, 0, tzinfo=timezone.utc)


def test_fan_in_out_flagged():
    """P0: Flag an account with >=3 senders and >=2 receivers within burst window, outflow >= 80%."""
    t0 = _base_ts()
    txns = [
        # Inflows: S1, S2, S3 -> MULE (within 5 minutes)
        {"txn_id": "T1", "timestamp": t0, "sender_account": "S1", "receiver_account": "MULE", "amount": 10000.0},
        {"txn_id": "T2", "timestamp": t0 + timedelta(minutes=2), "sender_account": "S2", "receiver_account": "MULE", "amount": 10000.0},
        {"txn_id": "T3", "timestamp": t0 + timedelta(minutes=4), "sender_account": "S3", "receiver_account": "MULE", "amount": 10000.0},
        # Outflows: MULE -> R1, R2 (within 10 minutes, outflow 28000/30000 = 93.3%)
        {"txn_id": "T4", "timestamp": t0 + timedelta(minutes=8), "sender_account": "MULE", "receiver_account": "R1", "amount": 14000.0},
        {"txn_id": "T5", "timestamp": t0 + timedelta(minutes=10), "sender_account": "MULE", "receiver_account": "R2", "amount": 14000.0},
    ]
    df = pd.DataFrame(txns)
    store = GraphStore()
    store.build_from_dataframe(df)

    thresholds = DetectorThresholds(
        fan_in_min_senders=3,
        fan_out_min_receivers=2,
        fan_burst_window_min=30,
        fan_outflow_window_min=30,
        fan_outflow_ratio=0.80,
    )

    signals = detect_fan_in_out(store, thresholds)
    flagged_accounts = {s["account_id"] for s in signals}
    assert "MULE" in flagged_accounts


def test_cycles_detection_3_hop():
    """P0: Detects 3-account loop within time window, excludes 2-account reciprocal transfers."""
    t0 = _base_ts()
    # 3-hop loop: A -> B -> C -> A
    txns = [
        {"txn_id": "C1", "timestamp": t0, "sender_account": "A", "receiver_account": "B", "amount": 50000.0},
        {"txn_id": "C2", "timestamp": t0 + timedelta(minutes=5), "sender_account": "B", "receiver_account": "C", "amount": 48000.0},
        {"txn_id": "C3", "timestamp": t0 + timedelta(minutes=10), "sender_account": "C", "receiver_account": "A", "amount": 47000.0},
        # Reciprocal pair: X <-> Y (should NOT be flagged as cycle)
        {"txn_id": "R1", "timestamp": t0, "sender_account": "X", "receiver_account": "Y", "amount": 5000.0},
        {"txn_id": "R2", "timestamp": t0 + timedelta(minutes=2), "sender_account": "Y", "receiver_account": "X", "amount": 5000.0},
    ]
    df = pd.DataFrame(txns)
    store = GraphStore()
    store.build_from_dataframe(df)

    thresholds = DetectorThresholds(
        cycle_max_length=6,
        cycle_window_min=60,
        cycle_retained_ratio=0.70,
    )

    signals = detect_cycles(store, thresholds)
    flagged = {s["account_id"] for s in signals}

    # A, B, C are in a cycle
    assert "A" in flagged or "B" in flagged or "C" in flagged
    # 2-hop reciprocal transfer X, Y must NOT be flagged
    assert "X" not in flagged
    assert "Y" not in flagged


def test_pass_through_chain():
    """P0: Detects chains forwarding >= 90% within 15 minutes with low retention."""
    t0 = _base_ts()
    txns = [
        {"txn_id": "P1", "timestamp": t0, "sender_account": "SRC", "receiver_account": "M1", "amount": 100000.0},
        {"txn_id": "P2", "timestamp": t0 + timedelta(minutes=2), "sender_account": "M1", "receiver_account": "M2", "amount": 98000.0},
        {"txn_id": "P3", "timestamp": t0 + timedelta(minutes=4), "sender_account": "M2", "receiver_account": "M3", "amount": 96000.0},
        {"txn_id": "P4", "timestamp": t0 + timedelta(minutes=6), "sender_account": "M3", "receiver_account": "DST", "amount": 94000.0},
    ]
    df = pd.DataFrame(txns)
    store = GraphStore()
    store.build_from_dataframe(df)

    thresholds = DetectorThresholds(
        passthrough_max_hold_min=15,
        passthrough_forward_ratio=0.90,
        passthrough_retention_max=0.10,
        passthrough_min_chain_len=3,
    )

    signals = detect_pass_through(store, thresholds)
    flagged = {s["account_id"] for s in signals}
    assert "M1" in flagged or "M2" in flagged or "M3" in flagged
