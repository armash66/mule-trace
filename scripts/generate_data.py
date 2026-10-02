#!/usr/bin/env python3
"""
Synthetic data generator for MuleTrace.

Produces ``data/transactions.csv``, ``data/accounts.csv``, and
``data/ground_truth.json`` with planted fraud rings, decoy patterns,
and normal background traffic.

**Deterministic**: same ``--seed`` always produces bit-identical output.

Usage::

    python scripts/generate_data.py --seed 42 --output-dir data --config config.yaml
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import yaml

# ── Column schemas ──────────────────────────────────────────────────────────────

TXN_COLS: list[str] = [
    "txn_id", "timestamp", "src_account", "dst_account",
    "amount", "channel", "device_id", "ip",
]

ACCT_COLS: list[str] = [
    "account_id", "opened_date", "kyc_phone", "kyc_address",
    "kyc_id_hash", "balance_after",
]

CHANNELS: list[str] = ["UPI", "IMPS", "NEFT"]
CHANNEL_W: list[float] = [0.60, 0.25, 0.15]

CITIES: list[str] = [
    "Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad",
    "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow",
]
STREETS: list[str] = [
    "MG Road", "Station Road", "Gandhi Nagar", "Nehru Street",
    "Park Avenue", "Lake View", "Hill Road", "Market Street",
    "Ring Road", "Civil Lines",
]

# ── Pure helpers ────────────────────────────────────────────────────────────────


def acc_id(n: int) -> str:
    """Zero-padded account identifier."""
    return f"ACC_{n:05d}"


def fmt_ts(dt: datetime) -> str:
    """ISO-8601 UTC timestamp string."""
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def sha16(val: str) -> str:
    """Deterministic 16-char hex digest for KYC masking."""
    return hashlib.sha256(val.encode("utf-8")).hexdigest()[:16]


def rand_phone(rng: np.random.Generator) -> str:
    """Random Indian mobile number."""
    return f"+91{rng.integers(7_000_000_000, 9_999_999_999)}"


def rand_ip(rng: np.random.Generator) -> str:
    """Random IPv4 address."""
    o = rng.integers(1, 255, size=4)
    return f"{o[0]}.{o[1]}.{o[2]}.{o[3]}"


def rand_device(rng: np.random.Generator) -> str:
    """Random 12-hex-char device identifier."""
    hx = "0123456789abcdef"
    return "DEV_" + "".join(hx[int(i)] for i in rng.integers(0, 16, size=12))


def rand_address(rng: np.random.Generator) -> str:
    """Random Indian street address."""
    num = int(rng.integers(1, 500))
    st = STREETS[int(rng.integers(0, len(STREETS)))]
    ci = CITIES[int(rng.integers(0, len(CITIES)))]
    return f"{num}, {st}, {ci}"


def lognormal_amt(
    rng: np.random.Generator,
    mu: float = 8.5,
    sigma: float = 1.5,
    lo: float = 100.0,
    hi: float = 5_000_000.0,
) -> float:
    """Lognormal INR amount, clipped and rounded to 2 dp."""
    return round(float(np.clip(rng.lognormal(mu, sigma), lo, hi)), 2)


# ── Account-ID allocation ──────────────────────────────────────────────────────
#
#   ACC_00001 – ACC_05000  Normal accounts
#   ACC_05001              Fan hub
#   ACC_05002 – ACC_05007  Fan receivers (05002-05003 also in cluster 1)
#   ACC_05008 – ACC_05010  Cycle ring 1  (3 nodes)
#   ACC_05011 – ACC_05014  Cycle ring 2  (4 nodes)
#   ACC_05015 – ACC_05019  Cycle ring 3  (5 nodes)
#   ACC_05020 – ACC_05024  Chain 1       (05024 also in cluster 2)
#   ACC_05025 – ACC_05028  Chain 2
#   ACC_05029 – ACC_05031  Cluster 1 extras
#   ACC_05032 – ACC_05034  Cluster 2 extras
#   ACC_05035              Decoy: payroll
#   ACC_05036              Decoy: merchant
#   ACC_05037 – ACC_05040  Decoy: family
#   ACC_05041 – ACC_05042  Decoy: refund loop
#   ACC_05043              Decoy: salary spike
#
# ────────────────────────────────────────────────────────────────────────────────


class DataGenerator:
    """Generates synthetic MuleTrace datasets with planted patterns.

    All randomness flows through a single ``np.random.Generator`` so that
    the same seed always yields bit-identical output files.
    """

    # Seven-day observation window (UTC)
    T0 = datetime(2026, 9, 25, 0, 0, 0, tzinfo=timezone.utc)
    T1 = datetime(2026, 10, 1, 23, 59, 59, tzinfo=timezone.utc)
    WINDOW_S = (T1 - T0).total_seconds()

    # ── Init ────────────────────────────────────────────────────────────────

    def __init__(self, seed: int, output_dir: Path, config: dict[str, Any]) -> None:
        self.rng = np.random.default_rng(seed)
        self.out = output_dir
        self.cfg: dict[str, Any] = config.get("generator", {})

        self._txn_ctr: int = 0

        # Row buffers
        self.acct_rows: list[list[Any]] = []
        self.txn_rows: list[list[Any]] = []

        # Per-account default device / IP (used in transactions)
        self.device_of: dict[str, str] = {}
        self.ip_of: dict[str, str] = {}

        # ID pools
        self.normal_ids: list[str] = []

        # Ground-truth bookkeeping
        self.rings: list[dict[str, Any]] = []
        self.decoys: list[dict[str, Any]] = []
        self.mule_ids: set[str] = set()
        self.decoy_ids: set[str] = set()
        self.ground_truth: dict[str, Any] = {}

    # ── Tiny helpers ────────────────────────────────────────────────────────

    def _tid(self) -> str:
        """Next sequential transaction ID."""
        self._txn_ctr += 1
        return f"TXN_{self._txn_ctr:07d}"

    def _rand_ts(
        self,
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> datetime:
        """Uniform random UTC timestamp in [start, end]."""
        s = start or self.T0
        e = end or self.T1
        delta = (e - s).total_seconds()
        return s + timedelta(seconds=float(self.rng.uniform(0, max(delta, 1))))

    def _add_acct(
        self,
        aid: str,
        opened: datetime,
        phone: str,
        addr: str,
        id_hash: str,
        balance: float | None,
    ) -> None:
        """Append one row to the accounts buffer."""
        self.acct_rows.append([
            aid,
            opened.strftime("%Y-%m-%d"),
            phone,
            addr,
            id_hash,
            balance,
        ])

    def _add_txn(
        self,
        src: str,
        dst: str,
        amount: float,
        ts: datetime,
        channel: str,
        device: str | None = None,
        ip: str | None = None,
    ) -> None:
        """Append one row to the transactions buffer."""
        self.txn_rows.append([
            self._tid(),
            fmt_ts(ts),
            src,
            dst,
            round(amount, 2),
            channel,
            device,
            ip,
        ])

    def _txn_default(
        self,
        src: str,
        dst: str,
        amount: float,
        ts: datetime,
        channel: str | None = None,
    ) -> None:
        """Add a transaction using the sender's default device/IP."""
        ch = channel or CHANNELS[int(self.rng.choice(3, p=CHANNEL_W))]
        self._add_txn(src, dst, amount, ts, ch,
                      self.device_of.get(src), self.ip_of.get(src))

    # ════════════════════════════════════════════════════════════════════════
    # 1.  Normal accounts
    # ════════════════════════════════════════════════════════════════════════

    def _gen_normal_accounts(self) -> None:
        """Generate 5 000 normal accounts with realistic ages and KYC."""
        n = int(self.cfg.get("normal_accounts", 5000))

        for i in range(1, n + 1):
            aid = acc_id(i)

            # Age: 180 – 3 650 days (≈6 months – 10 years), lognormal
            age = int(np.clip(self.rng.lognormal(6.5, 0.7), 180, 3650))
            opened = self.T0 - timedelta(days=age)

            phone = rand_phone(self.rng)
            addr = rand_address(self.rng)
            id_hash = sha16(f"norm_{i}")

            # Balance: lognormal, some nullable
            bal: float | None = round(
                float(np.clip(self.rng.lognormal(10, 1.5), 500, 10_000_000)), 2
            )
            if self.rng.random() < 0.03:
                bal = None

            self.device_of[aid] = rand_device(self.rng)
            self.ip_of[aid] = rand_ip(self.rng)
            self._add_acct(aid, opened, phone, addr, id_hash, bal)
            self.normal_ids.append(aid)

        # Family device sharing: 20 groups of 2-5 OLD accounts share a device
        n_groups = int(self.cfg.get("family_device_groups", 20))
        lo = int(self.cfg.get("family_device_size_min", 2))
        hi = int(self.cfg.get("family_device_size_max", 5))
        for _ in range(n_groups):
            sz = int(self.rng.integers(lo, hi + 1))
            idxs = self.rng.choice(len(self.normal_ids), size=sz, replace=False)
            shared = rand_device(self.rng)
            for idx in idxs:
                self.device_of[self.normal_ids[int(idx)]] = shared

        # NAT IP sharing: 5 groups of 10-20 OLD accounts share an IP
        n_nat = int(self.cfg.get("nat_ip_groups", 5))
        nat_lo = int(self.cfg.get("nat_ip_size_min", 10))
        nat_hi = int(self.cfg.get("nat_ip_size_max", 20))
        for _ in range(n_nat):
            sz = int(self.rng.integers(nat_lo, nat_hi + 1))
            idxs = self.rng.choice(len(self.normal_ids), size=sz, replace=False)
            shared = rand_ip(self.rng)
            for idx in idxs:
                self.ip_of[self.normal_ids[int(idx)]] = shared

    # ════════════════════════════════════════════════════════════════════════
    # 2.  Ring accounts (mule accounts for planted patterns)
    # ════════════════════════════════════════════════════════════════════════

    def _make_new_acct(
        self,
        aid: str,
        max_age_days: int = 25,
        phone: str | None = None,
        addr: str | None = None,
        device: str | None = None,
        ip: str | None = None,
        balance: float | None = None,
    ) -> None:
        """Create a NEW account (< 30 d) with optional shared attributes."""
        age = int(self.rng.integers(3, max_age_days + 1))
        opened = self.T0 - timedelta(days=age)
        ph = phone or rand_phone(self.rng)
        ad = addr or rand_address(self.rng)
        ih = sha16(f"ring_{aid}")
        bal = balance if balance is not None else round(float(self.rng.lognormal(8, 1)), 2)
        self.device_of[aid] = device or rand_device(self.rng)
        self.ip_of[aid] = ip or rand_ip(self.rng)
        self._add_acct(aid, opened, ph, ad, ih, bal)

    def _make_old_acct(
        self,
        aid: str,
        min_age: int = 90,
        max_age: int = 1800,
        balance: float | None = None,
    ) -> None:
        """Create an older account (≥ 3 months)."""
        age = int(self.rng.integers(min_age, max_age + 1))
        opened = self.T0 - timedelta(days=age)
        ph = rand_phone(self.rng)
        ad = rand_address(self.rng)
        ih = sha16(f"ring_{aid}")
        bal = balance if balance is not None else round(float(self.rng.lognormal(10, 1)), 2)
        self.device_of[aid] = rand_device(self.rng)
        self.ip_of[aid] = rand_ip(self.rng)
        self._add_acct(aid, opened, ph, ad, ih, bal)

    def _gen_ring_accounts(self) -> None:
        """Create accounts for every planted ring."""

        # ── Fan-in / fan-out ──
        self._make_old_acct(acc_id(5001), balance=500.0)  # hub

        # Receivers: 05002-05003 are new (cluster 1), 05004-05007 are older
        cluster1_dev = rand_device(self.rng)
        for i in range(5002, 5008):
            if i <= 5003:
                self._make_new_acct(acc_id(i), device=cluster1_dev)
            else:
                self._make_old_acct(acc_id(i), min_age=60, max_age=365)

        # ── Cycles (12 accounts) ──
        for i in range(5008, 5020):
            self._make_old_acct(acc_id(i), min_age=120, max_age=900)

        # ── Chains (9 accounts, 05024 deferred to cluster 2) ──
        for i in range(5020, 5029):
            if i == 5024:
                continue  # created below with cluster 2 attributes
            self._make_old_acct(
                acc_id(i),
                balance=round(float(self.rng.uniform(0, 500)), 2),
            )

        # ── Cluster 1 extras: 05029-05031 (share cluster1_dev) ──
        for i in range(5029, 5032):
            self._make_new_acct(acc_id(i), device=cluster1_dev)

        # ── Cluster 2: 05024 + 05032-05034 (share IP + phone) ──
        cluster2_ip = rand_ip(self.rng)
        cluster2_phone = rand_phone(self.rng)
        self._make_new_acct(
            acc_id(5024),
            ip=cluster2_ip,
            phone=cluster2_phone,
            balance=round(float(self.rng.uniform(0, 300)), 2),
        )
        for i in range(5032, 5035):
            self._make_new_acct(acc_id(i), ip=cluster2_ip, phone=cluster2_phone)

        # Register all mule account IDs
        self.mule_ids.update(acc_id(i) for i in range(5001, 5035))

    # ════════════════════════════════════════════════════════════════════════
    # 3.  Decoy accounts
    # ════════════════════════════════════════════════════════════════════════

    def _gen_decoy_accounts(self) -> None:
        """Accounts for patterns that should NOT be flagged."""

        # Payroll
        self._make_old_acct(acc_id(5035), min_age=365 * 3, max_age=365 * 8,
                            balance=50_000_000.0)
        # Merchant
        self._make_old_acct(acc_id(5036), min_age=365 * 2, max_age=365 * 5,
                            balance=5_000_000.0)
        # Family (share a device)
        family_dev = rand_device(self.rng)
        for i in range(5037, 5041):
            self._make_old_acct(acc_id(i), min_age=365, max_age=365 * 5)
            self.device_of[acc_id(i)] = family_dev

        # Refund loop
        self._make_old_acct(acc_id(5041), min_age=180, max_age=365 * 3)
        self._make_old_acct(acc_id(5042), min_age=180, max_age=365 * 3)

        # Salary spike
        self._make_old_acct(acc_id(5043), min_age=365, max_age=365 * 5)

        self.decoy_ids.update(acc_id(i) for i in range(5035, 5044))

    # ════════════════════════════════════════════════════════════════════════
    # 4.  Normal transactions (~60 000)
    # ════════════════════════════════════════════════════════════════════════

    def _gen_normal_transactions(self) -> None:
        """Background traffic between normal accounts."""
        n_txn = int(self.cfg.get("normal_transactions", 60_000))
        n_acc = len(self.normal_ids)

        # Power-law activity weights
        w = self.rng.pareto(1.5, size=n_acc) + 1.0
        w /= w.sum()

        # Draw sender / receiver indices
        s_idx = self.rng.choice(n_acc, size=n_txn, p=w)
        r_idx = self.rng.choice(n_acc, size=n_txn, p=w)

        # Re-roll self-transfers (those are added deliberately in noise)
        mask = s_idx == r_idx
        while mask.any():
            r_idx[mask] = self.rng.choice(n_acc, size=int(mask.sum()), p=w)
            mask = s_idx == r_idx

        # Timestamps (uniform over window)
        offsets = self.rng.uniform(0, self.WINDOW_S, size=n_txn)

        # Amounts (lognormal)
        mu = float(self.cfg.get("amount_mean_log", 8.5))
        sigma = float(self.cfg.get("amount_std_log", 1.5))
        lo = float(self.cfg.get("min_amount", 100))
        hi = float(self.cfg.get("max_amount", 5_000_000))
        amts = np.round(np.clip(self.rng.lognormal(mu, sigma, size=n_txn), lo, hi), 2)

        # Channels
        cw = self.cfg.get("channel_weights", CHANNEL_W)
        ch_idx = self.rng.choice(3, size=n_txn, p=cw)

        # ~5 % missing device / IP
        miss_rate = float(self.cfg.get("missing_device_rate", 0.05))
        dev_miss = self.rng.random(size=n_txn) < miss_rate
        ip_miss = self.rng.random(size=n_txn) < miss_rate

        for i in range(n_txn):
            src = self.normal_ids[int(s_idx[i])]
            dst = self.normal_ids[int(r_idx[i])]
            ts = self.T0 + timedelta(seconds=float(offsets[i]))
            ch = CHANNELS[int(ch_idx[i])]
            dev = None if dev_miss[i] else self.device_of.get(src)
            ip = None if ip_miss[i] else self.ip_of.get(src)
            self._add_txn(src, dst, float(amts[i]), ts, ch, dev, ip)

    # ════════════════════════════════════════════════════════════════════════
    # 5.  Fan-in / fan-out ring
    # ════════════════════════════════════════════════════════════════════════

    def _gen_fan_ring(self) -> None:
        """8-12 victims → hub → 4-6 receivers, tight time windows."""
        hub = acc_id(5001)
        receivers = [acc_id(i) for i in range(5002, 5008)]

        # Pick 10 victims from normal pool
        n_victims = int(self.rng.integers(8, 13))
        v_idxs = self.rng.choice(len(self.normal_ids), size=n_victims, replace=False)
        victims = [self.normal_ids[int(i)] for i in v_idxs]

        # Random base 2-5 days into window
        base = self.T0 + timedelta(days=float(self.rng.uniform(2, 5)))

        # ── Fan-in: victims → hub within 20 min ──
        total_in = 0.0
        for v in victims:
            amt = round(float(self.rng.uniform(20_000, 60_000)), 2)
            offset = float(self.rng.uniform(0, 20))
            ts = base + timedelta(minutes=offset)
            self._txn_default(v, hub, amt, ts, "UPI")
            total_in += amt

        # ── Fan-out: hub → receivers within 15 min (starts ~2 min after) ──
        out_start = base + timedelta(minutes=22)
        fwd_ratio = float(self.rng.uniform(0.92, 0.97))
        fwd_total = total_in * fwd_ratio
        splits = self.rng.dirichlet(np.ones(len(receivers)))

        for r, frac in zip(receivers, splits):
            amt = round(fwd_total * float(frac), 2)
            offset = float(self.rng.uniform(0, 15))
            ts = out_start + timedelta(minutes=offset)
            self._txn_default(hub, r, amt, ts, "IMPS")

        self.rings.append({
            "ring_id": "fan_1",
            "pattern": "fan",
            "accounts": sorted(set([hub] + receivers)),
            "details": {
                "hub": hub,
                "victims": sorted(victims),
                "receivers": sorted(receivers),
                "total_inflow": round(total_in, 2),
                "forward_ratio": round(fwd_ratio, 4),
            },
        })

    # ════════════════════════════════════════════════════════════════════════
    # 6.  Cycle rings
    # ════════════════════════════════════════════════════════════════════════

    def _gen_cycle_rings(self) -> None:
        """Three rings (3, 4, 5 nodes) completing within 45 min each."""
        defs = [
            ("cycle_1", [acc_id(i) for i in (5008, 5009, 5010)]),
            ("cycle_2", [acc_id(i) for i in (5011, 5012, 5013, 5014)]),
            ("cycle_3", [acc_id(i) for i in (5015, 5016, 5017, 5018, 5019)]),
        ]
        for ring_id, members in defs:
            n = len(members)
            base = self.T0 + timedelta(days=float(self.rng.uniform(1, 6)))
            amt = round(float(self.rng.uniform(50_000, 200_000)), 2)
            elapsed = 0.0
            path_amts: list[float] = []
            path_gaps: list[float] = []

            for step in range(n):
                src = members[step]
                dst = members[(step + 1) % n]
                gap = float(self.rng.uniform(3, 45.0 / n))
                elapsed += gap
                ts = base + timedelta(minutes=elapsed)
                self._txn_default(src, dst, amt, ts, "IMPS")
                path_amts.append(amt)
                path_gaps.append(round(gap, 2))
                # Shrink 2-5 %
                amt = round(amt * float(self.rng.uniform(0.95, 0.98)), 2)

            self.rings.append({
                "ring_id": ring_id,
                "pattern": "cycle",
                "accounts": sorted(members),
                "details": {
                    "path": members + [members[0]],
                    "amounts": path_amts,
                    "gap_minutes": path_gaps,
                    "total_minutes": round(elapsed, 2),
                },
            })

    # ════════════════════════════════════════════════════════════════════════
    # 7.  Pass-through chains
    # ════════════════════════════════════════════════════════════════════════

    def _gen_chains(self) -> None:
        """Two chains (5 and 4 accounts), 95-99 % forwarded per hop."""
        defs = [
            ("chain_1", [acc_id(i) for i in (5020, 5021, 5022, 5023, 5024)]),
            ("chain_2", [acc_id(i) for i in (5025, 5026, 5027, 5028)]),
        ]
        for chain_id, members in defs:
            base = self.T0 + timedelta(days=float(self.rng.uniform(1, 5)))
            amt = round(float(self.rng.uniform(100_000, 500_000)), 2)
            elapsed = 0.0
            hop_gaps: list[float] = []
            hop_ratios: list[float] = []

            for step in range(len(members) - 1):
                src = members[step]
                dst = members[step + 1]
                gap = float(self.rng.uniform(2, 8))
                elapsed += gap
                ts = base + timedelta(minutes=elapsed)
                self._txn_default(src, dst, amt, ts, "IMPS")
                hop_gaps.append(round(gap, 2))
                ratio = float(self.rng.uniform(0.95, 0.99))
                hop_ratios.append(round(ratio, 4))
                amt = round(amt * ratio, 2)

            self.rings.append({
                "ring_id": chain_id,
                "pattern": "chain",
                "accounts": sorted(members),
                "details": {
                    "chain_order": members,
                    "hop_gaps_min": hop_gaps,
                    "forward_ratios": hop_ratios,
                },
            })

    # ════════════════════════════════════════════════════════════════════════
    # 8.  Cluster activity
    # ════════════════════════════════════════════════════════════════════════

    def _gen_cluster_activity(self) -> None:
        """Inter-cluster transactions for new-account clusters."""
        cluster_defs = [
            {
                "cluster_id": "cluster_1",
                "accounts": sorted(acc_id(i) for i in (5002, 5003, 5029, 5030, 5031)),
                "shared_attr": "device_id",
            },
            {
                "cluster_id": "cluster_2",
                "accounts": sorted(acc_id(i) for i in (5024, 5032, 5033, 5034)),
                "shared_attr": "ip,kyc_phone",
            },
        ]
        for cdef in cluster_defs:
            members = cdef["accounts"]
            base = self.T0 + timedelta(days=float(self.rng.uniform(1, 5)))
            for i, src in enumerate(members):
                for j, dst in enumerate(members):
                    if i != j and self.rng.random() < 0.4:
                        amt = round(float(self.rng.uniform(5_000, 50_000)), 2)
                        ts = base + timedelta(hours=float(self.rng.uniform(0, 48)))
                        self._txn_default(src, dst, amt, ts, "UPI")

            self.rings.append({
                "ring_id": cdef["cluster_id"],
                "pattern": "cluster",
                "accounts": members,
                "details": {"shared_attribute": cdef["shared_attr"]},
            })

    # ════════════════════════════════════════════════════════════════════════
    # 9.  Decoy transactions
    # ════════════════════════════════════════════════════════════════════════

    def _gen_decoy_transactions(self) -> None:
        """Traffic for each decoy pattern."""
        self._decoy_payroll()
        self._decoy_merchant()
        self._decoy_family()
        self._decoy_refund_loop()
        self._decoy_salary_spike()

    # -- Payroll: 200 outbound, no matching inbound --

    def _decoy_payroll(self) -> None:
        payroll = acc_id(5035)
        emp_idxs = self.rng.choice(len(self.normal_ids), size=200, replace=False)
        employees = [self.normal_ids[int(i)] for i in emp_idxs]

        # Pay-day: day 3, ~10 am IST (04:30 UTC)
        pay_day = self.T0 + timedelta(days=3, hours=4, minutes=30)
        for emp in employees:
            amt = round(35_000 + float(self.rng.uniform(-5_000, 15_000)), 2)
            offset = float(self.rng.uniform(0, 60))  # spread over 1 hour
            ts = pay_day + timedelta(minutes=offset)
            self._txn_default(payroll, emp, amt, ts, "NEFT")

        self.decoys.append({
            "decoy_id": "payroll_1",
            "type": "payroll",
            "accounts": [payroll],
            "description": "Payroll account paying 200 employees at once",
        })

    # -- Merchant: many inbound, few outbound settlements --

    def _decoy_merchant(self) -> None:
        merchant = acc_id(5036)

        # 500 inbound from random customers
        cust_idxs = self.rng.choice(len(self.normal_ids), size=500, replace=True)
        for idx in cust_idxs:
            cust = self.normal_ids[int(idx)]
            amt = round(float(np.clip(self.rng.lognormal(7, 1), 50, 500_000)), 2)
            ts = self._rand_ts()
            self._txn_default(cust, merchant, amt, ts, "UPI")

        # 5 settlement outbound
        for _ in range(5):
            amt = round(float(self.rng.uniform(500_000, 2_000_000)), 2)
            ts = self._rand_ts()
            target = self.normal_ids[int(self.rng.integers(0, len(self.normal_ids)))]
            self._txn_default(merchant, target, amt, ts, "NEFT")

        self.decoys.append({
            "decoy_id": "merchant_1",
            "type": "merchant",
            "accounts": [merchant],
            "description": "Busy merchant: many inbound, few outbound",
        })

    # -- Family: 4 old accounts sharing one device --

    def _decoy_family(self) -> None:
        family = [acc_id(i) for i in range(5037, 5041)]

        for _ in range(30):
            i = int(self.rng.integers(0, 4))
            j = int(self.rng.integers(0, 4))
            if i == j:
                j = (j + 1) % 4
            amt = round(float(self.rng.uniform(500, 20_000)), 2)
            ts = self._rand_ts()
            self._txn_default(family[i], family[j], amt, ts, "UPI")

        self.decoys.append({
            "decoy_id": "family_1",
            "type": "family",
            "accounts": sorted(family),
            "description": "Family sharing one device, inter-member transfers",
        })

    # -- Refund loop: A↔B with matching amounts, days apart --

    def _decoy_refund_loop(self) -> None:
        a, b = acc_id(5041), acc_id(5042)

        for _ in range(8):
            amt = round(float(self.rng.uniform(1_000, 10_000)), 2)
            ts1 = self._rand_ts(self.T0, self.T0 + timedelta(days=4))
            ts2 = ts1 + timedelta(days=float(self.rng.uniform(1, 3)))
            self._txn_default(a, b, amt, ts1, "UPI")
            self._txn_default(b, a, amt, ts2, "UPI")  # exact reversal

        self.decoys.append({
            "decoy_id": "refund_loop_1",
            "type": "refund_loop",
            "accounts": sorted([a, b]),
            "description": "Refund loop: matching amounts reversed days apart",
        })

    # -- Salary spike: 1 inbound salary, then burst of bill payments --

    def _decoy_salary_spike(self) -> None:
        acct = acc_id(5043)
        salary_day = self.T0 + timedelta(days=5, hours=4)

        # Receive salary
        src = self.normal_ids[int(self.rng.integers(0, len(self.normal_ids)))]
        self._txn_default(src, acct, 150_000.0, salary_day, "NEFT")

        # Pay 15 bills over 2 days
        for _ in range(15):
            target = self.normal_ids[int(self.rng.integers(0, len(self.normal_ids)))]
            amt = round(float(self.rng.uniform(2_000, 15_000)), 2)
            ts = salary_day + timedelta(hours=float(self.rng.uniform(1, 48)))
            self._txn_default(acct, target, amt, ts, "UPI")

        self.decoys.append({
            "decoy_id": "salary_spike_1",
            "type": "salary_spike",
            "accounts": [acct],
            "description": "Salary day: 1 big inflow then 15 outgoing bill payments",
        })

    # ════════════════════════════════════════════════════════════════════════
    # 10. Cover traffic for ring / decoy accounts
    # ════════════════════════════════════════════════════════════════════════

    def _gen_cover_traffic(self) -> None:
        """Add a few normal-looking transactions for every special account."""
        all_special = sorted(self.mule_ids | self.decoy_ids)
        for aid in all_special:
            n_cover = int(self.rng.integers(3, 10))
            for _ in range(n_cover):
                partner = self.normal_ids[int(self.rng.integers(0, len(self.normal_ids)))]
                amt = lognormal_amt(self.rng)
                ts = self._rand_ts()
                if self.rng.random() < 0.5:
                    self._txn_default(aid, partner, amt, ts)
                else:
                    self._txn_default(partner, aid, amt, ts)

    # ════════════════════════════════════════════════════════════════════════
    # 11. Noise
    # ════════════════════════════════════════════════════════════════════════

    def _add_noise(self) -> None:
        """Inject duplicates, self-transfers, and shuffle order."""
        n = len(self.txn_rows)

        # 1-2 % duplicate rows (keep same txn_id)
        dup_lo = float(self.cfg.get("duplicate_rate_min", 0.01))
        dup_hi = float(self.cfg.get("duplicate_rate_max", 0.02))
        n_dup = int(n * float(self.rng.uniform(dup_lo, dup_hi)))
        dup_idxs = self.rng.choice(n, size=n_dup, replace=True)
        for idx in dup_idxs:
            self.txn_rows.append(list(self.txn_rows[int(idx)]))

        # Self-transfers
        n_self = int(self.cfg.get("self_transfer_count", 5))
        for _ in range(n_self):
            aid = self.normal_ids[int(self.rng.integers(0, len(self.normal_ids)))]
            amt = lognormal_amt(self.rng)
            ts = self._rand_ts()
            self._txn_default(aid, aid, amt, ts)

        # Shuffle to break generation order (creates out-of-order rows)
        perm = self.rng.permutation(len(self.txn_rows))
        self.txn_rows = [self.txn_rows[int(i)] for i in perm]

    # ════════════════════════════════════════════════════════════════════════
    # 12. Ground truth
    # ════════════════════════════════════════════════════════════════════════

    def _build_ground_truth(self) -> None:
        """Assemble the ground-truth JSON."""
        self.ground_truth = {
            "planted_rings": self.rings,
            "decoys": self.decoys,
            "all_mule_accounts": sorted(self.mule_ids),
            "all_decoy_accounts": sorted(self.decoy_ids),
            "summary": {
                "total_accounts": len(self.acct_rows),
                "total_transactions": len(self.txn_rows),
                "planted_fan": sum(1 for r in self.rings if r["pattern"] == "fan"),
                "planted_cycle": sum(1 for r in self.rings if r["pattern"] == "cycle"),
                "planted_chain": sum(1 for r in self.rings if r["pattern"] == "chain"),
                "planted_cluster": sum(1 for r in self.rings if r["pattern"] == "cluster"),
                "decoy_count": len(self.decoys),
                "mule_account_count": len(self.mule_ids),
                "decoy_account_count": len(self.decoy_ids),
            },
        }

    # ════════════════════════════════════════════════════════════════════════
    # 13. Write outputs
    # ════════════════════════════════════════════════════════════════════════

    def _write_outputs(self) -> None:
        """Write CSV and JSON files to the output directory."""
        self.out.mkdir(parents=True, exist_ok=True)

        pd.DataFrame(self.txn_rows, columns=TXN_COLS).to_csv(
            self.out / "transactions.csv", index=False,
        )
        pd.DataFrame(self.acct_rows, columns=ACCT_COLS).to_csv(
            self.out / "accounts.csv", index=False,
        )
        with open(self.out / "ground_truth.json", "w", encoding="utf-8") as f:
            json.dump(self.ground_truth, f, indent=2, default=str)

    def _print_summary(self) -> None:
        """Print a human-readable summary to stdout."""
        s = self.ground_truth["summary"]
        lines = [
            "=" * 60,
            "MuleTrace Data Generator — Summary",
            "=" * 60,
            f"  Accounts:          {s['total_accounts']:,}",
            f"  Transactions:      {s['total_transactions']:,}",
            f"  Planted fan:       {s['planted_fan']}",
            f"  Planted cycle:     {s['planted_cycle']}",
            f"  Planted chain:     {s['planted_chain']}",
            f"  Planted cluster:   {s['planted_cluster']}",
            f"  Mule accounts:     {s['mule_account_count']}",
            f"  Decoys:            {s['decoy_count']}",
            f"  Decoy accounts:    {s['decoy_account_count']}",
            "=" * 60,
        ]
        print("\n".join(lines))

    # ════════════════════════════════════════════════════════════════════════
    # Entry point
    # ════════════════════════════════════════════════════════════════════════

    def generate(self) -> dict[str, Any]:
        """Run the full generation pipeline. Returns ground truth."""
        self._gen_normal_accounts()
        self._gen_ring_accounts()
        self._gen_decoy_accounts()
        self._gen_normal_transactions()
        self._gen_fan_ring()
        self._gen_cycle_rings()
        self._gen_chains()
        self._gen_cluster_activity()
        self._gen_decoy_transactions()
        self._gen_cover_traffic()
        self._add_noise()
        self._build_ground_truth()
        self._write_outputs()
        self._print_summary()
        return self.ground_truth


# ── CLI ──────────────────────────────────────────────────────────────────────────


def main() -> None:
    """Parse arguments and run the generator."""
    parser = argparse.ArgumentParser(
        description="MuleTrace synthetic data generator",
    )
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for reproducibility (default: 42)")
    parser.add_argument("--output-dir", type=str, default="data",
                        help="Output directory (default: data)")
    parser.add_argument("--config", type=str, default="config.yaml",
                        help="Path to config YAML (default: config.yaml)")
    args = parser.parse_args()

    config_path = Path(args.config)
    if config_path.exists():
        with open(config_path, encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}
    else:
        print(f"Warning: {config_path} not found, using defaults", file=sys.stderr)
        config = {}

    gen = DataGenerator(
        seed=args.seed,
        output_dir=Path(args.output_dir),
        config=config,
    )
    gen.generate()


if __name__ == "__main__":
    main()
