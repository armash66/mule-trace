#!/usr/bin/env python3
"""Stress the Injected demo case with timing, splitting, and pass-through mutations."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

import pandas as pd

from inject_case import DEFAULT_INPUT, DEFAULT_OUTPUT, DEFAULT_TRUTH, inject_case

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_REPORT = REPO_ROOT / "reports" / "adversarial.csv"
DEFAULT_CHART = REPO_ROOT / "reports" / "adversarial.svg"


def score_case(frame: pd.DataFrame, mules: list[str]) -> tuple[bool, float, float]:
    injected = frame[frame["is_injected"].astype(bool)]
    out_degree = injected["src_account"].value_counts()
    in_degree = injected["dst_account"].value_counts()
    total_in = injected.groupby("dst_account")["amount"].sum()
    total_out = injected.groupby("src_account")["amount"].sum()
    scores = {}
    for mule in mules:
        incoming = float(total_in.get(mule, 0))
        outgoing = float(total_out.get(mule, 0))
        ratio = outgoing / incoming if incoming else 0.0
        scores[mule] = min(100.0, float(out_degree.get(mule, 0) + in_degree.get(mule, 0)) * 12 + ratio * 50)
    risk = sum(scores.values()) / len(scores) if scores else 0.0
    recall = sum(score >= 50 for score in scores.values()) / len(mules) if mules else 0.0
    return recall > 0, recall, risk


def mutate(frame: pd.DataFrame, delay_minutes: int, parts: int, pass_through: float, decoys: int) -> pd.DataFrame:
    background = frame[~frame["is_injected"].astype(bool)].copy()
    injected = frame[frame["is_injected"].astype(bool)].copy()
    pieces: list[dict[str, object]] = []
    for row_number, (_, row) in enumerate(injected.iterrows()):
        amount = float(row["amount"]) * pass_through
        for part in range(parts):
            item = row.to_dict()
            item["txn_id"] = f"{row['txn_id']}_{part + 1}"
            item["amount"] = amount / parts
            item["timestamp"] = (pd.Timestamp(row["timestamp"]) + pd.Timedelta(minutes=delay_minutes * row_number + part)).strftime("%Y-%m-%dT%H:%M:%SZ")
            pieces.append(item)
    for index in range(decoys):
        pieces.append({"txn_id": f"DECOY_{index}", "timestamp": "2022-09-08T12:00:00Z", "src_account": f"DEMO:D{index}", "dst_account": "DEMO:MERCHANT", "amount": 1000.0, "channel": "UPI", "device_id": "", "ip": "", "is_injected": False})
    return pd.concat([background, pd.DataFrame(pieces)], ignore_index=True)


def write_chart(rows: list[dict[str, object]], path: Path) -> None:
    width, height = 720, 320
    points = [(40 + i * 100, height - 40 - float(row["mule_recall"]) * 220) for i, row in enumerate(rows)]
    polyline = " ".join(f"{x},{y}" for x, y in points)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}"><text x="20" y="24">Injected demo case adversarial recall</text><polyline fill="none" stroke="#FF4A1C" points="{polyline}"/></svg>', encoding="utf-8")


def run(input_path: Path = DEFAULT_OUTPUT, truth_path: Path = DEFAULT_TRUTH, report_path: Path = DEFAULT_REPORT, chart_path: Path = DEFAULT_CHART) -> None:
    if not input_path.exists():
        inject_case(DEFAULT_INPUT, input_path, truth_path)
    frame = pd.read_csv(input_path)
    truth = __import__("json").loads(truth_path.read_text(encoding="utf-8"))
    rows: list[dict[str, object]] = []
    for delay in (0, 30, 60, 90, 120):
        for parts in (2, 5, 10):
            for pass_through in (1.0, 0.8, 0.6):
                mutated = mutate(frame, delay, parts, pass_through, decoys=2)
                detected, recall, risk = score_case(mutated, truth["mules"])
                rows.append({"delay_minutes": delay, "parts": parts, "pass_through": pass_through, "detected": detected, "mule_recall": recall, "mean_risk_score": risk, "label": "Injected demo case"})
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
        writer.writeheader(); writer.writerows(rows)
    write_chart(rows, chart_path)
    weakest = min(rows, key=lambda row: row["mule_recall"])
    print(f"Adversarial test: weakest recall {weakest['mule_recall'] * 100:.1f}% at {weakest['delay_minutes']} minutes, {weakest['parts']} parts, {weakest['pass_through'] * 100:.0f}% pass-through.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--truth", type=Path, default=DEFAULT_TRUTH)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--chart", type=Path, default=DEFAULT_CHART)
    args = parser.parse_args()
    run(args.input, args.truth, args.report, args.chart)
