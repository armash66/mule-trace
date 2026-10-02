"""New-account cluster detector.

Groups accounts younger than N days by shared device_id, IP, kyc_phone,
or kyc_address using union-find.  Flags groups of ≥ 3.  Weights device
above IP and discounts large NAT-like IPs shared by many old accounts.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from typing import Any

import networkx as nx
import pandas as pd

from ..schemas import Finding


# ── Union-Find ──────────────────────────────────────────────────────────────────


class _UnionFind:
    """Lightweight union-find (disjoint-set) data structure."""

    def __init__(self) -> None:
        self._parent: dict[str, str] = {}
        self._rank: dict[str, int] = {}

    def find(self, x: str) -> str:
        if x not in self._parent:
            self._parent[x] = x
            self._rank[x] = 0
        while self._parent[x] != x:
            self._parent[x] = self._parent[self._parent[x]]
            x = self._parent[x]
        return x

    def union(self, a: str, b: str) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return
        if self._rank[ra] < self._rank[rb]:
            ra, rb = rb, ra
        self._parent[rb] = ra
        if self._rank[ra] == self._rank[rb]:
            self._rank[ra] += 1


# ── Detector ────────────────────────────────────────────────────────────────────


def detect_clusters(
    graph: nx.MultiDiGraph,
    accounts_df: pd.DataFrame,
    config: dict[str, Any],
) -> list[Finding]:
    """Detect new-account clusters sharing device, IP, or KYC details.

    Args:
        graph: Transaction multigraph (edges carry device_id, ip).
        accounts_df: Accounts DataFrame (kyc_phone, kyc_address, opened_date).
        config: Full config dict.

    Returns:
        One Finding per account in each cluster of size ≥ min_group_size.
    """
    cfg = config.get("detectors", {}).get("cluster", {})
    max_age_days: int = cfg.get("max_account_age_days", 30)
    min_group: int = cfg.get("min_group_size", 3)
    nat_threshold: int = cfg.get("nat_ip_threshold", 10)

    # Reference date: latest opened_date as proxy for "today"
    ref_date = accounts_df["opened_date"].max()

    # ── 1. Identify new accounts ──
    acct_age: dict[str, int] = {}
    new_accounts: set[str] = set()
    old_accounts: set[str] = set()

    for _, row in accounts_df.iterrows():
        aid = row["account_id"]
        age = (ref_date - row["opened_date"]).days
        acct_age[aid] = age
        if age <= max_age_days:
            new_accounts.add(aid)
        else:
            old_accounts.add(aid)

    if len(new_accounts) < min_group:
        return []

    # ── 2. Build inverted indices ──

    # Device IDs from outgoing transactions
    dev_to_new: dict[str, set[str]] = defaultdict(set)
    ip_to_new: dict[str, set[str]] = defaultdict(set)
    ip_old_count: dict[str, int] = defaultdict(int)

    for node in graph.nodes():
        for _, _, data in graph.out_edges(node, data=True):
            dev = data.get("device_id")
            ip = data.get("ip")
            if node in new_accounts:
                if dev:
                    dev_to_new[dev].add(node)
                if ip:
                    ip_to_new[ip].add(node)
            elif node in old_accounts:
                if ip:
                    ip_old_count[ip] += 1

    # KYC fields from accounts
    phone_to_new: dict[str, set[str]] = defaultdict(set)
    addr_to_new: dict[str, set[str]] = defaultdict(set)

    for _, row in accounts_df.iterrows():
        aid = row["account_id"]
        if aid not in new_accounts:
            continue
        phone = row.get("kyc_phone")
        addr = row.get("kyc_address")
        if pd.notna(phone) and phone:
            phone_to_new[str(phone)].add(aid)
        if pd.notna(addr) and addr:
            addr_to_new[str(addr)].add(aid)

    # ── 3. Union-find grouping ──
    uf = _UnionFind()

    # Shared device (highest weight)
    shared_attrs: dict[str, set[str]] = defaultdict(set)  # account -> shared attrs

    for dev, accts in dev_to_new.items():
        if len(accts) >= 2:
            accts_list = sorted(accts)
            for a in accts_list[1:]:
                uf.union(accts_list[0], a)
            for a in accts_list:
                shared_attrs[a].add("device_id")

    # Shared IP (discounted if NAT-like)
    for ip, accts in ip_to_new.items():
        if len(accts) >= 2 and ip_old_count.get(ip, 0) < nat_threshold:
            accts_list = sorted(accts)
            for a in accts_list[1:]:
                uf.union(accts_list[0], a)
            for a in accts_list:
                shared_attrs[a].add("ip")

    # Shared phone
    for phone, accts in phone_to_new.items():
        if len(accts) >= 2:
            accts_list = sorted(accts)
            for a in accts_list[1:]:
                uf.union(accts_list[0], a)
            for a in accts_list:
                shared_attrs[a].add("kyc_phone")

    # Shared address
    for addr, accts in addr_to_new.items():
        if len(accts) >= 2:
            accts_list = sorted(accts)
            for a in accts_list[1:]:
                uf.union(accts_list[0], a)
            for a in accts_list:
                shared_attrs[a].add("kyc_address")

    # ── 4. Extract groups ≥ min_group ──
    groups: dict[str, set[str]] = defaultdict(set)
    for acct in new_accounts:
        root = uf.find(acct)
        groups[root].add(acct)

    # ── 5. Create Findings ──
    findings: list[Finding] = []

    for _root, members in groups.items():
        if len(members) < min_group:
            continue

        # Aggregate shared attributes for the group
        group_attrs: set[str] = set()
        for m in members:
            group_attrs |= shared_attrs.get(m, set())

        strength = min(1.0, 0.4 + 0.15 * len(members))

        for acct in sorted(members):
            age = acct_age.get(acct, 0)
            findings.append(
                Finding(
                    account_id=acct,
                    pattern="cluster",
                    strength=round(strength, 4),
                    evidence={
                        "group_size": len(members),
                        "shared_attr": ",".join(sorted(group_attrs)),
                        "age_days": age,
                        "group_members": sorted(members),
                    },
                    related_accounts=sorted(members - {acct}),
                )
            )

    return findings
