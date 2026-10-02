#!/usr/bin/env python3
"""Run held-out component ablations without deleting production components."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

import pandas as pd

from evaluate import DEFAULT_INPUT, DEFAULT_PATTERNS, DEFAULT_THRESHOLDS, load_thresholds, metric, predictions, split_transactions

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_REPORT = REPO_ROOT / "reports" / "ablation.csv"


def run(input_path: Path = DEFAULT_INPUT, thresholds_path: Path = DEFAULT_THRESHOLDS, report_path: Path = DEFAULT_REPORT, split_date: str = "2022-09-07") -> None:
    frame = pd.read_csv(input_path)
    _, test = split_transactions(frame, split_date)
    frozen = load_thresholds(thresholds_path, split_date)
    labels = test["Is Laundering"].astype(int).eq(1)
    base_predictions = predictions(test, frozen["thresholds"])
    components = ["louvain", "pagerank", "isolation_forest", "shap", *base_predictions.keys()]
    baseline = metric(pd.DataFrame(base_predictions).any(axis=1), labels)
    rows: list[dict[str, object]] = []
    for component in components:
        altered = dict(base_predictions)
        if component in altered:
            altered.pop(component)
        predicted = pd.DataFrame(altered).any(axis=1) if altered else pd.Series(False, index=test.index)
        scores = metric(predicted, labels)
        change = scores["f1"] - baseline["f1"]
        rows.append({"component": component, "precision": scores["precision"], "recall": scores["recall"], "f1": scores["f1"], "delta_f1": change, "contribution": "no measured contribution" if abs(change) < 1e-12 else "measured"})
        print(f"{component:<18} precision={scores['precision']:.4f} recall={scores['recall']:.4f} f1={scores['f1']:.4f} change={change:+.4f} ({rows[-1]['contribution']})")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
        writer.writeheader(); writer.writerows(rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--thresholds", type=Path, default=DEFAULT_THRESHOLDS)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--split-date", default="2022-09-07")
    args = parser.parse_args()
    run(args.input, args.thresholds, args.report, args.split_date)
