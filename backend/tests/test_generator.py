"""Tests for scripts/generate_data.py.

Validates determinism, schema compliance, planted-ring structure,
decoy completeness, and injected noise.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pandas as pd
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SCRIPT = REPO_ROOT / "scripts" / "generate_data.py"
CONFIG = REPO_ROOT / "config.yaml"


# ════════════════════════════════════════════════════════════════════════════════
# Determinism
# ════════════════════════════════════════════════════════════════════════════════


class TestDeterminism:
    """Same seed must produce bit-identical output files."""

    def test_same_seed_identical_files(
        self,
        gen_data: dict[str, Any],
        tmp_path: Path,
    ) -> None:
        """Second run with the same seed matches the fixture run."""
        run2 = tmp_path / "run2"
        run2.mkdir()
        subprocess.run(
            [
                sys.executable, str(SCRIPT),
                "--seed", "42",
                "--output-dir", str(run2),
                "--config", str(CONFIG),
            ],
            capture_output=True,
            check=True,
        )
        for fname in ("transactions.csv", "accounts.csv", "ground_truth.json"):
            h1 = hashlib.md5((gen_data["dir"] / fname).read_bytes()).hexdigest()
            h2 = hashlib.md5((run2 / fname).read_bytes()).hexdigest()
            assert h1 == h2, f"{fname} differs between seed=42 runs"


# ════════════════════════════════════════════════════════════════════════════════
# Schema compliance
# ════════════════════════════════════════════════════════════════════════════════


class TestSchema:
    """CSV columns, types, and value constraints."""

    def test_transaction_columns(self, gen_data: dict[str, Any]) -> None:
        expected = {
            "txn_id", "timestamp", "src_account", "dst_account",
            "amount", "channel", "device_id", "ip",
        }
        assert set(gen_data["txn"].columns) == expected

    def test_account_columns(self, gen_data: dict[str, Any]) -> None:
        expected = {
            "account_id", "opened_date", "kyc_phone", "kyc_address",
            "kyc_id_hash", "balance_after",
        }
        assert set(gen_data["acct"].columns) == expected

    def test_amounts_positive(self, gen_data: dict[str, Any]) -> None:
        assert (gen_data["txn"]["amount"] > 0).all()

    def test_timestamps_parseable(self, gen_data: dict[str, Any]) -> None:
        parsed = pd.to_datetime(gen_data["txn"]["timestamp"], utc=True)
        assert parsed.notna().all()

    def test_channels_valid(self, gen_data: dict[str, Any]) -> None:
        valid = {"UPI", "IMPS", "NEFT"}
        actual = set(gen_data["txn"]["channel"].unique())
        assert actual <= valid, f"Unexpected channels: {actual - valid}"

    def test_account_ids_unique_in_accounts(self, gen_data: dict[str, Any]) -> None:
        assert gen_data["acct"]["account_id"].is_unique


# ════════════════════════════════════════════════════════════════════════════════
# Counts
# ════════════════════════════════════════════════════════════════════════════════


class TestCounts:
    """Row counts in expected ranges."""

    def test_account_count(self, gen_data: dict[str, Any]) -> None:
        n = len(gen_data["acct"])
        assert 5000 <= n <= 5200, f"Expected ~5 043 accounts, got {n}"

    def test_transaction_count(self, gen_data: dict[str, Any]) -> None:
        n = len(gen_data["txn"])
        # 60k normal + ~1k planted/decoy/cover + noise
        assert 55_000 <= n <= 75_000, f"Expected ~62k transactions, got {n}"


# ════════════════════════════════════════════════════════════════════════════════
# Ground truth – planted rings
# ════════════════════════════════════════════════════════════════════════════════


class TestGroundTruth:
    """Completeness and structure of ground_truth.json."""

    def test_has_all_pattern_types(self, gen_data: dict[str, Any]) -> None:
        patterns = {r["pattern"] for r in gen_data["gt"]["planted_rings"]}
        assert patterns >= {"fan", "cycle", "chain", "cluster"}

    # ── Fan ──

    def test_fan_ring_structure(self, gen_data: dict[str, Any]) -> None:
        fans = [r for r in gen_data["gt"]["planted_rings"] if r["pattern"] == "fan"]
        assert len(fans) == 1
        fan = fans[0]
        assert "hub" in fan["details"]
        assert len(fan["details"]["victims"]) >= 8
        assert len(fan["details"]["receivers"]) >= 4
        assert fan["details"]["forward_ratio"] >= 0.90

    # ── Cycles ──

    def test_cycle_count_and_sizes(self, gen_data: dict[str, Any]) -> None:
        cycles = [r for r in gen_data["gt"]["planted_rings"] if r["pattern"] == "cycle"]
        assert len(cycles) == 3
        sizes = sorted(len(c["accounts"]) for c in cycles)
        assert sizes == [3, 4, 5]

    def test_cycle_within_time_window(self, gen_data: dict[str, Any]) -> None:
        for c in gen_data["gt"]["planted_rings"]:
            if c["pattern"] == "cycle":
                assert c["details"]["total_minutes"] <= 50, (
                    f"{c['ring_id']} took {c['details']['total_minutes']} min"
                )

    # ── Chains ──

    def test_chain_count(self, gen_data: dict[str, Any]) -> None:
        chains = [r for r in gen_data["gt"]["planted_rings"] if r["pattern"] == "chain"]
        assert len(chains) == 2
        for ch in chains:
            assert len(ch["accounts"]) >= 4

    def test_chain_forward_ratios(self, gen_data: dict[str, Any]) -> None:
        for ch in gen_data["gt"]["planted_rings"]:
            if ch["pattern"] == "chain":
                for ratio in ch["details"]["forward_ratios"]:
                    assert 0.95 <= ratio <= 0.99

    # ── Clusters ──

    def test_cluster_count(self, gen_data: dict[str, Any]) -> None:
        clusters = [r for r in gen_data["gt"]["planted_rings"] if r["pattern"] == "cluster"]
        assert len(clusters) == 2

    def test_cluster_overlap_with_other_rings(self, gen_data: dict[str, Any]) -> None:
        """Some cluster accounts should also appear in fan / chain rings."""
        cluster_accts: set[str] = set()
        other_accts: set[str] = set()
        for r in gen_data["gt"]["planted_rings"]:
            if r["pattern"] == "cluster":
                cluster_accts.update(r["accounts"])
            else:
                other_accts.update(r["accounts"])
        overlap = cluster_accts & other_accts
        assert len(overlap) >= 2, (
            f"Expected cluster/ring overlap ≥ 2, got {len(overlap)}: {overlap}"
        )

    # ── All mule accounts present ──

    def test_all_mule_accounts_in_csv(self, gen_data: dict[str, Any]) -> None:
        csv_ids = set(gen_data["acct"]["account_id"])
        for aid in gen_data["gt"]["all_mule_accounts"]:
            assert aid in csv_ids, f"Mule {aid} not in accounts.csv"

    def test_all_mule_accounts_have_transactions(self, gen_data: dict[str, Any]) -> None:
        txn = gen_data["txn"]
        all_txn_accts = set(txn["src_account"]) | set(txn["dst_account"])
        for aid in gen_data["gt"]["all_mule_accounts"]:
            assert aid in all_txn_accts, f"Mule {aid} has no transactions"


# ════════════════════════════════════════════════════════════════════════════════
# Ground truth – decoys
# ════════════════════════════════════════════════════════════════════════════════


class TestDecoys:
    """Decoy accounts present and properly typed."""

    def test_decoy_types(self, gen_data: dict[str, Any]) -> None:
        types = {d["type"] for d in gen_data["gt"]["decoys"]}
        expected = {"payroll", "merchant", "family", "refund_loop", "salary_spike"}
        assert types >= expected, f"Missing decoy types: {expected - types}"

    def test_all_decoy_accounts_in_csv(self, gen_data: dict[str, Any]) -> None:
        csv_ids = set(gen_data["acct"]["account_id"])
        for aid in gen_data["gt"]["all_decoy_accounts"]:
            assert aid in csv_ids, f"Decoy {aid} not in accounts.csv"

    def test_payroll_has_200_outbound(self, gen_data: dict[str, Any]) -> None:
        payroll_accts = [
            d["accounts"][0]
            for d in gen_data["gt"]["decoys"]
            if d["type"] == "payroll"
        ]
        assert len(payroll_accts) == 1
        payroll = payroll_accts[0]
        txn = gen_data["txn"]
        outbound = txn[txn["src_account"] == payroll]
        # 200 payroll + a few cover transactions
        assert len(outbound) >= 200

    def test_merchant_has_many_inbound(self, gen_data: dict[str, Any]) -> None:
        merchant_accts = [
            d["accounts"][0]
            for d in gen_data["gt"]["decoys"]
            if d["type"] == "merchant"
        ]
        assert len(merchant_accts) == 1
        merchant = merchant_accts[0]
        txn = gen_data["txn"]
        inbound = txn[txn["dst_account"] == merchant]
        assert len(inbound) >= 500


# ════════════════════════════════════════════════════════════════════════════════
# Noise
# ════════════════════════════════════════════════════════════════════════════════


class TestNoise:
    """Injected duplicates, missing fields, and self-transfers."""

    def test_duplicate_txn_ids_exist(self, gen_data: dict[str, Any]) -> None:
        dupes = gen_data["txn"]["txn_id"].duplicated().sum()
        assert dupes > 0, "Expected some duplicate txn_id rows"

    def test_duplicate_rate_in_range(self, gen_data: dict[str, Any]) -> None:
        n = len(gen_data["txn"])
        dupes = gen_data["txn"]["txn_id"].duplicated().sum()
        rate = dupes / n
        assert 0.005 < rate < 0.03, f"Duplicate rate {rate:.3%} outside 0.5-3 %"

    def test_missing_device_id(self, gen_data: dict[str, Any]) -> None:
        total = len(gen_data["txn"])
        missing = gen_data["txn"]["device_id"].isna().sum()
        rate = missing / total
        assert 0.02 < rate < 0.15, f"Missing device_id rate {rate:.2%} outside range"

    def test_missing_ip(self, gen_data: dict[str, Any]) -> None:
        total = len(gen_data["txn"])
        missing = gen_data["txn"]["ip"].isna().sum()
        rate = missing / total
        assert 0.02 < rate < 0.15, f"Missing IP rate {rate:.2%} outside range"

    def test_self_transfers_exist(self, gen_data: dict[str, Any]) -> None:
        txn = gen_data["txn"]
        self_txn = (txn["src_account"] == txn["dst_account"]).sum()
        assert self_txn > 0, "Expected at least one self-transfer"


# ════════════════════════════════════════════════════════════════════════════════
# Summary output
# ════════════════════════════════════════════════════════════════════════════════


class TestSummary:
    """Generator prints a readable summary to stdout."""

    def test_summary_printed(self, gen_data: dict[str, Any]) -> None:
        out = gen_data["stdout"]
        assert "MuleTrace Data Generator" in out
        for label in ("Planted fan:", "Planted cycle:", "Planted chain:",
                       "Planted cluster:", "Mule accounts:", "Decoys:"):
            assert label in out, f"Missing '{label}' in summary output"
