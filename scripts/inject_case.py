#!/usr/bin/env python3
"""Inject a deterministic, clearly labelled demo case into transaction data."""

from __future__ import annotations

import argparse
import json
from datetime import timedelta
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = REPO_ROOT / "data" / "transactions.csv"
DEFAULT_OUTPUT = REPO_ROOT / "data" / "aml" / "transactions_with_case.csv"
DEFAULT_TRUTH = REPO_ROOT / "data" / "aml" / "case_truth.json"


def build_case_rows(day: str) -> tuple[list[dict[str, object]], dict[str, object]]:
    start = pd.Timestamp(day).replace(hour=10, minute=0, second=0, microsecond=0)
    transfers = [
        ("DEMO:V001", "DEMO:M001", 500000.0),
        ("DEMO:M001", "DEMO:M002", 250000.0),
        ("DEMO:M001", "DEMO:M003", 250000.0),
        ("DEMO:M002", "DEMO:M004", 249500.0),
        ("DEMO:M003", "DEMO:M005", 249500.0),
        ("DEMO:M005", "DEMO:M007", 249000.0),
        ("DEMO:M004", "DEMO:M009", 249000.0),
        ("DEMO:M007", "DEMO:M009", 248500.0),
        ("DEMO:M009", "DEMO:C001", 248000.0),
        ("DEMO:M009", "DEMO:C002", 248000.0),
    ]
    rows: list[dict[str, object]] = []
    for index, (source, target, amount) in enumerate(transfers, start=1):
        timestamp = start + timedelta(minutes=index * 2)
        rows.append({
            "txn_id": f"DEMO_CASE_{index:03d}",
            "timestamp": timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "src_account": source,
            "dst_account": target,
            "amount": amount,
            "channel": "UPI",
            "device_id": "",
            "ip": "",
            "is_injected": True,
        })
    truth = {
        "case_id": "Injected demo case",
        "victim": "DEMO:V001",
        "mules": ["DEMO:M001", "DEMO:M002", "DEMO:M003", "DEMO:M004", "DEMO:M005", "DEMO:M007", "DEMO:M009"],
        "cash_outs": ["DEMO:C001", "DEMO:C002"],
        "branch_lengths": {"branch_one": 2, "branch_two": 3},
        "timestamps": [row["timestamp"] for row in rows],
        "amounts": [row["amount"] for row in rows],
    }
    return rows, truth


def inject_case(input_path: Path = DEFAULT_INPUT, output_path: Path = DEFAULT_OUTPUT, truth_path: Path = DEFAULT_TRUTH, day: str | None = None) -> dict[str, object]:
    background = pd.read_csv(input_path)
    required = {"txn_id", "timestamp", "src_account", "dst_account", "amount", "channel", "device_id", "ip"}
    missing = required - set(background.columns)
    if missing:
        raise ValueError(f"Input is missing required columns: {sorted(missing)}")
    background = background.copy()
    background["is_injected"] = False
    if day is None:
        dates = pd.to_datetime(background["timestamp"], errors="coerce")
        eligible = dates[dates.dt.date >= pd.Timestamp("2022-09-08").date()]
        if eligible.empty:
            raise ValueError("Input has no real test-period day after 2022-09-07")
        day = str(eligible.iloc[0].date())
    injected, truth = build_case_rows(day)
    result = pd.concat([background, pd.DataFrame(injected)], ignore_index=True)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    truth_path.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(output_path, index=False)
    truth["injected_day"] = day
    truth_path.write_text(json.dumps(truth, indent=2) + "\n", encoding="utf-8")
    return truth


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--truth", type=Path, default=DEFAULT_TRUTH)
    parser.add_argument("--day", help="Test-period day to use; defaults to the first input day after 2022-09-07")
    args = parser.parse_args()
    truth = inject_case(args.input, args.output, args.truth, args.day)
    print(f"Wrote Injected demo case for {truth['injected_day']} to {args.output}")


if __name__ == "__main__":
    main()
