"""Deterministic synthetic data generator for MuleTrace.

Generates realistic transactions with planted mule patterns and look-alikes.
Outputs: transactions.csv, accounts.csv, ground_truth.json, watchlist_sample.csv.
"""
from __future__ import annotations

import csv
import json
import os
import random
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np


def generate_synthetic_data(
    num_accounts: int = 5000,
    num_rings: int = 10,
    noise_pct: float = 0.1,
    seed: int = 42,
    output_dir: str = "./data",
) -> dict[str, Any]:
    """Generate a complete synthetic dataset.

    Args:
        num_accounts: total accounts to generate
        num_rings: number of planted mule rings
        noise_pct: percentage of noise/jitter in planted patterns
        seed: random seed for reproducibility
        output_dir: directory to write output files

    Returns:
        Summary dict with file paths and ground truth.
    """
    rng = random.Random(seed)
    np_rng = np.random.RandomState(seed)

    os.makedirs(output_dir, exist_ok=True)

    # Reference date
    ref_date = datetime(2026, 10, 1, tzinfo=timezone.utc)
    start_date = ref_date - timedelta(days=90)

    # ── Generate accounts ──────────────────────────────
    accounts: list[dict[str, Any]] = []
    account_ids: list[str] = []
    devices: list[str] = [f"D-{i:04d}" for i in range(200)]
    ips: list[str] = [f"192.168.{i // 256}.{i % 256}" for i in range(500)]
    branches = ["DELHI-01", "MUMBAI-01", "BANG-01", "CHEN-01", "HYD-01", "PUNE-01", "KOL-01"]

    for i in range(num_accounts):
        acct_id = f"ACC-{i:06d}"
        account_ids.append(acct_id)

        # Most accounts are old, some are new
        if rng.random() < 0.15:
            open_date = ref_date - timedelta(days=rng.randint(1, 30))  # New
            age_days = (ref_date - open_date).days
        else:
            open_date = start_date - timedelta(days=rng.randint(30, 1000))
            age_days = (ref_date - open_date).days

        segment = rng.choice(["retail"] * 8 + ["merchant"] * 1 + ["corporate"] * 1)

        accounts.append({
            "account_id": acct_id,
            "open_date": open_date.isoformat(),
            "age_days": age_days,
            "segment": segment,
            "branch": rng.choice(branches),
            "kyc_phone_hash": f"PH-{rng.randint(0, num_accounts // 2):06d}",
            "kyc_address_hash": f"AD-{rng.randint(0, num_accounts // 3):06d}",
            "kyc_pan_hash": f"PN-{i:06d}",
            "device_ids": rng.choice(devices),
            "ip_addresses": rng.choice(ips),
        })

    # ── Generate normal transactions ──────────────────
    transactions: list[dict[str, Any]] = []
    txn_counter = 0

    # Normal patterns: salary, rent, UPI merchant, bill pay, family
    for acct in accounts:
        acct_id = acct["account_id"]
        num_txns = int(np_rng.lognormal(2.5, 0.8))
        num_txns = min(max(num_txns, 2), 100)

        for _ in range(num_txns):
            # Random counterparty
            counterparty = rng.choice(account_ids)
            while counterparty == acct_id:
                counterparty = rng.choice(account_ids)

            # Time: weighted toward daytime IST (3:30-14:30 UTC)
            day_offset = rng.randint(0, 89)
            hour = int(np_rng.normal(9, 3)) % 24  # Peak at 9 AM IST
            minute = rng.randint(0, 59)
            ts = start_date + timedelta(days=day_offset, hours=hour, minutes=minute)

            # Amount: log-normal, INR
            amount = round(np_rng.lognormal(7.5, 1.5), 2)  # Median ~₹1,800
            amount = max(10.0, min(amount, 500000.0))

            # Determine direction
            is_send = rng.random() < 0.5
            sender = acct_id if is_send else counterparty
            receiver = counterparty if is_send else acct_id

            channel = rng.choices(
                ["UPI", "IMPS", "NEFT", "RTGS", "CARD", "ATM"],
                weights=[50, 20, 15, 5, 8, 2],
            )[0]

            transactions.append({
                "txn_id": f"TXN-{txn_counter:08d}",
                "timestamp": ts.isoformat(),
                "sender_account": sender,
                "receiver_account": receiver,
                "amount": round(amount, 2),
                "currency": "INR",
                "channel": channel,
                "device_id": acct["device_ids"],
                "ip_address": acct["ip_addresses"],
                "is_victim_report": False,
            })
            txn_counter += 1

    # ── Plant look-alikes (merchants, payroll, landlords) ──
    look_alikes: list[str] = []

    # 20 Merchants: high fan-in, stable over weeks
    for i in range(20):
        merchant_id = f"ACC-M{i:04d}"
        account_ids.append(merchant_id)
        look_alikes.append(merchant_id)
        accounts.append({
            "account_id": merchant_id,
            "open_date": (start_date - timedelta(days=365)).isoformat(),
            "age_days": 455,
            "segment": "merchant",
            "branch": rng.choice(branches),
            "kyc_phone_hash": f"PH-M{i:04d}",
            "kyc_address_hash": f"AD-M{i:04d}",
            "kyc_pan_hash": f"PN-M{i:04d}",
            "device_ids": f"D-M{i:04d}",
            "ip_addresses": rng.choice(ips),
        })
        # Generate steady inflows from many accounts
        for day in range(90):
            num_daily = rng.randint(5, 20)
            for _ in range(num_daily):
                sender = rng.choice(account_ids[:num_accounts])
                ts = start_date + timedelta(days=day, hours=rng.randint(8, 20), minutes=rng.randint(0, 59))
                amount = round(rng.uniform(100, 5000), 2)
                transactions.append({
                    "txn_id": f"TXN-{txn_counter:08d}",
                    "timestamp": ts.isoformat(),
                    "sender_account": sender,
                    "receiver_account": merchant_id,
                    "amount": amount,
                    "currency": "INR",
                    "channel": "UPI",
                    "device_id": "",
                    "ip_address": "",
                    "is_victim_report": False,
                })
                txn_counter += 1

    # 5 Payroll accounts
    for i in range(5):
        payroll_id = f"ACC-P{i:04d}"
        account_ids.append(payroll_id)
        look_alikes.append(payroll_id)
        accounts.append({
            "account_id": payroll_id,
            "open_date": (start_date - timedelta(days=500)).isoformat(),
            "age_days": 590,
            "segment": "corporate",
            "branch": rng.choice(branches),
            "kyc_phone_hash": f"PH-P{i:04d}",
            "kyc_address_hash": f"AD-P{i:04d}",
            "kyc_pan_hash": f"PN-P{i:04d}",
            "device_ids": f"D-P{i:04d}",
            "ip_addresses": rng.choice(ips),
        })
        # Monthly salary disbursement
        salary = round(rng.uniform(25000, 75000), -2)
        employees = rng.sample(account_ids[:num_accounts], min(30, num_accounts))
        for month in range(3):
            day = rng.randint(28, 30) if month < 2 else 1
            ts_base = start_date + timedelta(days=month * 30 + day)
            for emp in employees:
                transactions.append({
                    "txn_id": f"TXN-{txn_counter:08d}",
                    "timestamp": (ts_base + timedelta(minutes=rng.randint(0, 60))).isoformat(),
                    "sender_account": payroll_id,
                    "receiver_account": emp,
                    "amount": salary + rng.randint(-500, 500),
                    "currency": "INR",
                    "channel": "NEFT",
                    "device_id": "",
                    "ip_address": "",
                    "is_victim_report": False,
                })
                txn_counter += 1

    # ── Plant mule rings ─────────────────────────────────
    ground_truth: dict[str, Any] = {
        "rings": [],
        "mule_accounts": [],
        "victim_accounts": [],
        "look_alikes": look_alikes,
    }

    ring_types = ["funnel", "cycle", "pass_through", "device_cluster", "hybrid", "hybrid"]

    for ring_idx in range(num_rings):
        ring_type = ring_types[ring_idx % len(ring_types)]
        ring_size = rng.randint(3, 6)

        # Create mule accounts (new, shared devices)
        shared_device = f"D-MULE-{ring_idx:03d}"
        shared_ip = f"10.0.{ring_idx}.1"
        mule_accounts: list[str] = []

        for j in range(ring_size):
            mule_id = f"ACC-RING{ring_idx:02d}-{j:02d}"
            account_ids.append(mule_id)
            mule_accounts.append(mule_id)
            ground_truth["mule_accounts"].append(mule_id)

            accounts.append({
                "account_id": mule_id,
                "open_date": (ref_date - timedelta(days=rng.randint(3, 25))).isoformat(),
                "age_days": rng.randint(3, 25),
                "segment": "retail",
                "branch": rng.choice(branches),
                "kyc_phone_hash": f"PH-MULE-{ring_idx:03d}",
                "kyc_address_hash": f"AD-MULE-{ring_idx:03d}",
                "kyc_pan_hash": f"PN-RING{ring_idx:02d}-{j:02d}",
                "device_ids": shared_device,
                "ip_addresses": shared_ip,
            })

        # Create victim
        victim_id = rng.choice(account_ids[:num_accounts])
        ground_truth["victim_accounts"].append(victim_id)

        # Base time for the ring
        ring_day = rng.randint(60, 85)
        ring_hour = rng.randint(10, 16)
        base_ts = start_date + timedelta(days=ring_day, hours=ring_hour)

        stolen_amount = round(rng.uniform(20000, 100000), -2)
        jitter_min = int(noise_pct * 30)  # Timing jitter

        ring_txns: list[dict] = []

        if ring_type == "funnel":
            # Fan-in from victim + others → mule[0] → fan-out to mule[1:]
            # Victim transfer
            ring_txns.append(_make_txn(
                txn_counter, base_ts, victim_id, mule_accounts[0],
                stolen_amount, "UPI", shared_device, shared_ip, True,
            ))
            txn_counter += 1

            # Additional senders (look like fan-in)
            for k in range(rng.randint(2, 5)):
                sender = rng.choice(account_ids[:num_accounts])
                ts = base_ts + timedelta(minutes=rng.randint(0, 20))
                amt = round(rng.uniform(5000, 20000), 2)
                ring_txns.append(_make_txn(
                    txn_counter, ts, sender, mule_accounts[0],
                    amt, "UPI", "", "", False,
                ))
                txn_counter += 1

            # Fan-out
            split = stolen_amount / max(ring_size - 1, 1)
            for k in range(1, ring_size):
                ts = base_ts + timedelta(minutes=rng.randint(5, 25 + jitter_min))
                amt = round(split * (1 - noise_pct * rng.random()), 2)
                ring_txns.append(_make_txn(
                    txn_counter, ts, mule_accounts[0], mule_accounts[k],
                    amt, "IMPS", shared_device, shared_ip, False,
                ))
                txn_counter += 1

        elif ring_type == "cycle":
            # A → B → C → A
            amt = stolen_amount
            ts = base_ts
            for k in range(ring_size):
                next_k = (k + 1) % ring_size
                transfer_amt = round(amt * (1 - noise_pct * rng.random() * 0.1), 2)
                ring_txns.append(_make_txn(
                    txn_counter, ts, mule_accounts[k], mule_accounts[next_k],
                    transfer_amt, "UPI", shared_device, shared_ip, k == 0,
                ))
                txn_counter += 1
                ts = ts + timedelta(minutes=rng.randint(3, 15 + jitter_min))
                amt = transfer_amt * 0.95

        elif ring_type == "pass_through":
            # Chain: victim → A → B → C → ... → cash-out
            ring_txns.append(_make_txn(
                txn_counter, base_ts, victim_id, mule_accounts[0],
                stolen_amount, "UPI", "", "", True,
            ))
            txn_counter += 1

            amt = stolen_amount
            ts = base_ts
            for k in range(ring_size - 1):
                forward_amt = round(amt * (0.95 + noise_pct * rng.random() * 0.04), 2)
                ts = ts + timedelta(minutes=rng.randint(2, 10 + jitter_min))
                ring_txns.append(_make_txn(
                    txn_counter, ts, mule_accounts[k], mule_accounts[k + 1],
                    forward_amt, "IMPS", shared_device, shared_ip, False,
                ))
                txn_counter += 1
                amt = forward_amt

            # Cash-out at end
            ts = ts + timedelta(minutes=rng.randint(5, 20))
            cashout_target = rng.choice(account_ids[:num_accounts])
            ring_txns.append(_make_txn(
                txn_counter, ts, mule_accounts[-1], cashout_target,
                round(amt * 0.9, 2), "ATM", shared_device, shared_ip, False,
            ))
            txn_counter += 1

        elif ring_type == "device_cluster":
            # New accounts sharing device, transacting with common counterparty
            common_counterparty = rng.choice(account_ids[:num_accounts])
            for k in range(ring_size):
                ts = base_ts + timedelta(minutes=rng.randint(0, 60))
                amt = round(rng.uniform(5000, 30000), 2)
                # Send to common counterparty
                ring_txns.append(_make_txn(
                    txn_counter, ts, mule_accounts[k], common_counterparty,
                    amt, "UPI", shared_device, shared_ip, False,
                ))
                txn_counter += 1
                # Also internal transfers
                if k < ring_size - 1:
                    ts2 = ts + timedelta(minutes=rng.randint(5, 30))
                    ring_txns.append(_make_txn(
                        txn_counter, ts2, mule_accounts[k], mule_accounts[k + 1],
                        round(amt * 0.5, 2), "IMPS", shared_device, shared_ip, False,
                    ))
                    txn_counter += 1

        else:  # hybrid
            # Combination: fan-in + pass-through + cycle elements
            ring_txns.append(_make_txn(
                txn_counter, base_ts, victim_id, mule_accounts[0],
                stolen_amount, "UPI", "", "", True,
            ))
            txn_counter += 1

            # Pass-through chain
            amt = stolen_amount
            ts = base_ts
            for k in range(min(ring_size - 1, 3)):
                forward_amt = round(amt * 0.93, 2)
                ts = ts + timedelta(minutes=rng.randint(3, 12 + jitter_min))
                ring_txns.append(_make_txn(
                    txn_counter, ts, mule_accounts[k], mule_accounts[k + 1],
                    forward_amt, "IMPS", shared_device, shared_ip, False,
                ))
                txn_counter += 1
                amt = forward_amt

            # Extra fan-in senders
            for k in range(rng.randint(2, 4)):
                sender = rng.choice(account_ids[:num_accounts])
                ts2 = base_ts + timedelta(minutes=rng.randint(0, 20))
                ring_txns.append(_make_txn(
                    txn_counter, ts2, sender, mule_accounts[0],
                    round(rng.uniform(3000, 15000), 2), "UPI", "", "", False,
                ))
                txn_counter += 1

        # Add some decoy transfers for harder cases (2-3 rings)
        if ring_idx >= num_rings - 3:
            for _ in range(rng.randint(5, 15)):
                decoy_sender = rng.choice(mule_accounts)
                decoy_receiver = rng.choice(account_ids[:num_accounts])
                ts = base_ts + timedelta(minutes=rng.randint(-60, 120))
                ring_txns.append(_make_txn(
                    txn_counter, ts, decoy_sender, decoy_receiver,
                    round(rng.uniform(100, 3000), 2), "UPI", shared_device, shared_ip, False,
                ))
                txn_counter += 1

        transactions.extend(ring_txns)

        ground_truth["rings"].append({
            "ring_idx": ring_idx,
            "ring_type": ring_type,
            "mule_accounts": mule_accounts,
            "victim_account": victim_id if ring_type != "device_cluster" else None,
            "stolen_amount": stolen_amount if ring_type != "device_cluster" else None,
            "base_time": base_ts.isoformat(),
            "num_transactions": len(ring_txns),
        })

    # ── Add balance info to some transactions ──────────
    running_balances: dict[str, float] = {}
    transactions.sort(key=lambda t: t["timestamp"])

    for txn in transactions:
        sender = txn["sender_account"]
        receiver = txn["receiver_account"]
        amount = txn["amount"]

        if sender not in running_balances:
            running_balances[sender] = round(rng.uniform(5000, 500000), 2)
        if receiver not in running_balances:
            running_balances[receiver] = round(rng.uniform(5000, 500000), 2)

        running_balances[sender] = max(0, running_balances[sender] - amount)
        running_balances[receiver] += amount

        # Only include balance for ~60% of transactions
        if rng.random() < 0.6:
            txn["sender_balance_after"] = round(running_balances[sender], 2)
            txn["receiver_balance_after"] = round(running_balances[receiver], 2)
        else:
            txn["sender_balance_after"] = ""
            txn["receiver_balance_after"] = ""

    # ── Write files ──────────────────────────────────────
    txn_path = os.path.join(output_dir, "transactions.csv")
    acct_path = os.path.join(output_dir, "accounts.csv")
    gt_path = os.path.join(output_dir, "ground_truth.json")
    wl_path = os.path.join(output_dir, "watchlist_sample.csv")

    # Transactions CSV
    txn_fields = [
        "txn_id", "timestamp", "sender_account", "receiver_account",
        "amount", "currency", "channel", "sender_balance_after",
        "receiver_balance_after", "device_id", "ip_address", "is_victim_report",
    ]
    with open(txn_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=txn_fields)
        writer.writeheader()
        writer.writerows(transactions)

    # Accounts CSV
    acct_fields = [
        "account_id", "open_date", "age_days", "segment", "branch",
        "kyc_phone_hash", "kyc_address_hash", "kyc_pan_hash",
        "device_ids", "ip_addresses",
    ]
    with open(acct_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=acct_fields)
        writer.writeheader()
        writer.writerows(accounts)

    # Ground truth
    with open(gt_path, "w", encoding="utf-8") as f:
        json.dump(ground_truth, f, indent=2)

    # Watchlist sample (2 known mules from first 2 rings)
    watchlist_entries = []
    for ring in ground_truth["rings"][:2]:
        for mule in ring["mule_accounts"][:1]:
            watchlist_entries.append({
                "account_id": mule,
                "source": f"Previous investigation (ring {ring['ring_idx']})",
                "reason": "Confirmed mule in prior run",
            })
    with open(wl_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["account_id", "source", "reason"])
        writer.writeheader()
        writer.writerows(watchlist_entries)

    summary = {
        "transactions": len(transactions),
        "accounts": len(accounts),
        "rings_planted": num_rings,
        "mule_accounts": len(ground_truth["mule_accounts"]),
        "victim_accounts": len(ground_truth["victim_accounts"]),
        "look_alikes": len(look_alikes),
        "files": {
            "transactions": txn_path,
            "accounts": acct_path,
            "ground_truth": gt_path,
            "watchlist": wl_path,
        },
    }

    return summary


def _make_txn(
    counter: int,
    ts: datetime,
    sender: str,
    receiver: str,
    amount: float,
    channel: str,
    device: str,
    ip: str,
    is_victim: bool,
) -> dict[str, Any]:
    """Helper to create a transaction dict."""
    return {
        "txn_id": f"TXN-{counter:08d}",
        "timestamp": ts.isoformat(),
        "sender_account": sender,
        "receiver_account": receiver,
        "amount": round(amount, 2),
        "currency": "INR",
        "channel": channel,
        "device_id": device,
        "ip_address": ip,
        "is_victim_report": is_victim,
        "sender_balance_after": "",
        "receiver_balance_after": "",
    }


if __name__ == "__main__":
    summary = generate_synthetic_data()
    print(json.dumps(summary, indent=2))
