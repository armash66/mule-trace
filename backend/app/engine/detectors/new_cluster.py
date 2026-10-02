"""New-account cluster detector.

Pattern: ≥ min_cluster_size recently opened accounts share a device, IP,
or KYC attribute AND transact with each other or a common counterparty.
"""
from __future__ import annotations

import logging
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.config import DetectorThresholds
from app.engine.graph import GraphStore

logger = logging.getLogger(__name__)

SIGNAL_TYPE = "NEW_CLUSTER"


def detect_new_clusters(
    store: GraphStore,
    thresholds: DetectorThresholds,
    reference_date: datetime | None = None,
) -> list[dict[str, Any]]:
    """Detect clusters of new accounts sharing attributes.

    Algorithm:
    1. Build bipartite graph: account ↔ attribute value (device, IP, KYC hash).
    2. Find connected components.
    3. Filter by new-account count ≥ min_cluster_size.
    4. Check overlap with transfer graph (transact with each other or common counterparty).
    5. Apply IDF weighting to ignore overly common attributes.
    """
    results: list[dict[str, Any]] = []
    new_days = thresholds.cluster_new_account_days
    min_size = thresholds.cluster_min_size
    max_share = thresholds.cluster_max_attribute_share

    if reference_date is None:
        # Use the latest timestamp in the graph
        all_times = [
            a.get("last_seen") for a in store.accounts.values() if a.get("last_seen")
        ]
        reference_date = max(all_times) if all_times else datetime.now(timezone.utc)

    new_account_cutoff = reference_date - timedelta(days=new_days)

    # Step 1: collect attributes per account
    # attribute_type:value -> set of accounts
    attr_to_accounts: dict[str, set[str]] = defaultdict(set)
    account_to_attrs: dict[str, set[str]] = defaultdict(set)
    new_accounts: set[str] = set()

    for acct_id, acct_data in store.accounts.items():
        # Check if account is "new"
        is_new = False
        if acct_data.get("open_date"):
            try:
                open_dt = acct_data["open_date"]
                if isinstance(open_dt, str):
                    open_dt = datetime.fromisoformat(open_dt)
                if open_dt.tzinfo is None:
                    open_dt = open_dt.replace(tzinfo=timezone.utc)
                if open_dt >= new_account_cutoff:
                    is_new = True
            except (ValueError, TypeError):
                pass
        elif acct_data.get("age_days") is not None:
            if acct_data["age_days"] <= new_days:
                is_new = True
        elif acct_data.get("first_seen"):
            first = acct_data["first_seen"]
            if hasattr(first, 'tzinfo') and first.tzinfo is None:
                first = first.replace(tzinfo=timezone.utc)
            if first >= new_account_cutoff:
                is_new = True

        if is_new:
            new_accounts.add(acct_id)

        # Collect device attributes
        for device in acct_data.get("devices", []):
            if device:
                attr_key = f"device:{device}"
                attr_to_accounts[attr_key].add(acct_id)
                account_to_attrs[acct_id].add(attr_key)

        # Collect IP attributes
        for ip in acct_data.get("ips", []):
            if ip:
                attr_key = f"ip:{ip}"
                attr_to_accounts[attr_key].add(acct_id)
                account_to_attrs[acct_id].add(attr_key)

        # Collect KYC hash attributes
        for kyc_field in ["kyc_phone_hash", "kyc_address_hash", "kyc_pan_hash"]:
            val = acct_data.get(kyc_field)
            if val:
                attr_key = f"{kyc_field}:{val}"
                attr_to_accounts[attr_key].add(acct_id)
                account_to_attrs[acct_id].add(attr_key)

    if not new_accounts:
        logger.info("New-cluster detector: no new accounts found, skipping")
        return []

    if not attr_to_accounts:
        logger.info("New-cluster detector: no device/IP/KYC data found, skipping")
        return []

    # Step 2: IDF weighting — ignore attributes shared by > max_share accounts
    total_accounts = len(store.accounts)
    filtered_attrs: dict[str, set[str]] = {}
    for attr, accounts in attr_to_accounts.items():
        if len(accounts) > max_share:
            continue  # Too common (public Wi-Fi, CGNAT, etc.)
        filtered_attrs[attr] = accounts

    # Step 3: Union-Find to build connected components
    parent: dict[str, str] = {}

    def find(x: str) -> str:
        while parent.get(x, x) != x:
            parent[x] = parent.get(parent[x], parent[x])
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    # Connect accounts sharing attributes
    for attr, accounts in filtered_attrs.items():
        acct_list = list(accounts)
        for i in range(1, len(acct_list)):
            union(acct_list[0], acct_list[i])

    # Step 4: Group into clusters
    clusters: dict[str, list[str]] = defaultdict(list)
    all_attr_accounts = set()
    for accounts in filtered_attrs.values():
        all_attr_accounts.update(accounts)

    for acct in all_attr_accounts:
        root = find(acct)
        clusters[root].append(acct)

    # Step 5: Filter clusters by new-account count and transfer overlap
    for cluster_root, members in clusters.items():
        new_in_cluster = [m for m in members if m in new_accounts]
        if len(new_in_cluster) < min_size:
            continue

        # Check transfer overlap: do they transact with each other or common counterparties?
        member_set = set(members)
        internal_transfers = 0
        common_counterparties: set[str] = set()

        for member in members:
            out_edges = store.sorted_edges.get(member, [])
            in_edges = store.sorted_in_edges.get(member, [])

            for edge in out_edges:
                if edge["target"] in member_set:
                    internal_transfers += 1
                else:
                    common_counterparties.add(edge["target"])

            for edge in in_edges:
                if edge["source"] in member_set:
                    internal_transfers += 1
                else:
                    common_counterparties.add(edge["source"])

        # Find truly common counterparties (shared by 2+ cluster members)
        counterparty_counts: dict[str, int] = defaultdict(int)
        for member in members:
            seen: set[str] = set()
            for edge in store.sorted_edges.get(member, []) + store.sorted_in_edges.get(member, []):
                target = edge.get("target", edge.get("source"))
                if target and target not in member_set and target not in seen:
                    counterparty_counts[target] = counterparty_counts.get(target, 0) + 1
                    seen.add(target)

        shared_counterparties = [cp for cp, cnt in counterparty_counts.items() if cnt >= 2]

        has_overlap = internal_transfers > 0 or len(shared_counterparties) > 0
        if not has_overlap:
            continue

        # Find shared attributes
        shared_attrs: list[str] = []
        for attr, accts in filtered_attrs.items():
            cluster_in_attr = accts & member_set
            if len(cluster_in_attr) >= 2:
                shared_attrs.append(attr)

        # IDF-weighted score
        idf_scores = []
        for attr in shared_attrs:
            acct_count = len(attr_to_accounts.get(attr, set()))
            idf = math.log(total_accounts / max(acct_count, 1))
            idf_scores.append(idf)

        avg_idf = sum(idf_scores) / len(idf_scores) if idf_scores else 0
        size_factor = min(len(new_in_cluster) / 10.0, 1.0)
        overlap_factor = min((internal_transfers + len(shared_counterparties)) / 10.0, 1.0)
        score = (size_factor * 0.3 + overlap_factor * 0.3 + min(avg_idf / 5.0, 1.0) * 0.4)

        evidence = {
            "cluster_size": len(members),
            "new_accounts": len(new_in_cluster),
            "shared_attributes": shared_attrs[:10],
            "internal_transfers": internal_transfers,
            "shared_counterparties": shared_counterparties[:5],
            "member_accounts": members[:20],
        }

        attr_desc_parts = []
        for attr in shared_attrs[:3]:
            attr_type = attr.split(":")[0]
            attr_desc_parts.append(attr_type.replace("_", " "))
        attr_desc = ", ".join(set(attr_desc_parts)) if attr_desc_parts else "attributes"

        reason = (
            f"Cluster of {len(new_in_cluster)} new accounts (opened within {new_days} days) "
            f"sharing {attr_desc} with {internal_transfers} internal transfers"
        )
        if shared_counterparties:
            reason += f" and {len(shared_counterparties)} common counterparties"

        # Create alerts for each new account in the cluster
        for acct in new_in_cluster:
            acct_attrs = account_to_attrs.get(acct, set()) & set(shared_attrs)
            acct_evidence = {
                **evidence,
                "account_shared_attrs": list(acct_attrs)[:5],
            }
            results.append({
                "account_id": acct,
                "signal_type": SIGNAL_TYPE,
                "raw_value": score,
                "evidence": acct_evidence,
                "reason": reason,
            })

    logger.info(f"New-cluster detector: {len(results)} alerts")
    return results
