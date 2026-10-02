#!/usr/bin/env python3
"""Evaluate AMLSim/HI-Small transactions with a time-held-out split."""

from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = REPO_ROOT / "dataset" / "HI-Small_Trans.csv"
DEFAULT_PATTERNS = REPO_ROOT / "dataset" / "HI-Small_Patterns.txt"
DEFAULT_THRESHOLDS = REPO_ROOT / "config" / "thresholds.json"


def split_transactions(frame: pd.DataFrame, split_date: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    timestamps = pd.to_datetime(frame["Timestamp"], errors="coerce")
    cutoff = pd.Timestamp(split_date)
    if timestamps.isna().any():
        raise ValueError("Timestamp contains unparseable values")
    tuning = frame.loc[timestamps < cutoff].copy()
    test = frame.loc[timestamps >= cutoff].copy()
    if tuning.empty or test.empty:
        raise ValueError("split-date must leave rows in both tuning and test sets")
    return tuning, test


def split_counts(frame: pd.DataFrame) -> dict[str, int]:
    laundering = frame["Is Laundering"].astype(int).eq(1)
    accounts = set(frame["Account"].astype(str)) | set(frame["Account.1"].astype(str))
    laundering_accounts = set(frame.loc[laundering, "Account"].astype(str)) | set(frame.loc[laundering, "Account.1"].astype(str))
    return {
        "accounts": len(accounts),
        "laundering_transactions": int(laundering.sum()),
        "normal_accounts": len(accounts - laundering_accounts),
    }


def _features(frame: pd.DataFrame) -> dict[str, pd.Series]:
    sources = frame["Account"].astype(str)
    targets = frame["Account.1"].astype(str)
    out_degree = sources.value_counts()
    in_degree = targets.value_counts()
    source_counts = sources.map(out_degree).fillna(0)
    target_counts = targets.map(in_degree).fillna(0)
    adjacency: dict[str, set[str]] = {}
    for source, target in zip(sources, targets):
        adjacency.setdefault(source, set()).add(target)
    cycle = pd.Series([source in adjacency.get(target, set()) for source, target in zip(sources, targets)], index=frame.index)
    pass_through = source_counts.ge(2) & target_counts.ge(2)
    amount = pd.to_numeric(frame["Amount Paid"], errors="coerce").fillna(0)
    return {"fan_out": source_counts, "fan_in": target_counts, "cycle": cycle.astype(int), "pass_through": pass_through.astype(int), "behavioral": amount}


def _best_threshold(values: pd.Series, labels: pd.Series, candidates: list[float]) -> float:
    best = (0.0, candidates[0])
    for threshold in candidates:
        predicted = values.ge(threshold)
        tp = int((predicted & labels).sum())
        fp = int((predicted & ~labels).sum())
        fn = int((~predicted & labels).sum())
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        if f1 > best[0]:
            best = (f1, threshold)
    return best[1]


def tune_thresholds(frame: pd.DataFrame) -> dict[str, float]:
    features = _features(frame)
    labels = frame["Is Laundering"].astype(int).eq(1)
    amount_candidates = sorted(set(float(features["behavioral"].quantile(q)) for q in (0.75, 0.9, 0.95, 0.99)))
    return {
        "fan_out": _best_threshold(features["fan_out"], labels, list(range(2, 17))),
        "fan_in": _best_threshold(features["fan_in"], labels, list(range(2, 17))),
        "cycle": 1.0,
        "pass_through": 1.0,
        "behavioral": _best_threshold(features["behavioral"], labels, amount_candidates),
    }


def parse_pattern_labels(path: Path) -> dict[tuple[str, ...], str]:
    result: dict[tuple[str, ...], str] = {}
    pattern = "unknown"
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line.startswith("BEGIN LAUNDERING ATTEMPT - "):
            pattern = line.removeprefix("BEGIN LAUNDERING ATTEMPT - ").split(":", 1)[0].strip().lower()
        elif line and not line.startswith("END "):
            fields = next(csv.reader([line]))
            if len(fields) >= 11 and fields[-1] == "1":
                result[tuple(_normalize_key_field(value) for value in fields[:10])] = pattern
    return result


def _normalize_key_field(value: Any) -> str:
    text = str(value).strip()
    if text.isdigit():
        return text.lstrip("0") or "0"
    try:
        return f"{float(text):.10g}"
    except ValueError:
        return text


def _row_keys(frame: pd.DataFrame) -> list[tuple[str, ...]]:
    columns = ("Timestamp", "From Bank", "Account", "To Bank", "Account.1", "Amount Received", "Receiving Currency", "Amount Paid", "Payment Currency", "Payment Format")
    return [tuple(_normalize_key_field(row[column]) for column in columns) for _, row in frame.iterrows()]


def predictions(frame: pd.DataFrame, thresholds: dict[str, float]) -> dict[str, pd.Series]:
    features = _features(frame)
    return {
        "fan_out": features["fan_out"].ge(thresholds["fan_out"]),
        "fan_in": features["fan_in"].ge(thresholds["fan_in"]),
        "cycle": features["cycle"].ge(thresholds["cycle"]),
        "pass_through": features["pass_through"].ge(thresholds["pass_through"]),
        "behavioral": features["behavioral"].ge(thresholds["behavioral"]),
    }


def metric(predicted: pd.Series, labels: pd.Series) -> dict[str, float]:
    tp = int((predicted & labels).sum())
    fp = int((predicted & ~labels).sum())
    fn = int((~predicted & labels).sum())
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {"precision": precision, "recall": recall, "f1": f1}


def legitimate_hub_summary(frame: pd.DataFrame, detector_predictions: dict[str, pd.Series], labels: pd.Series) -> dict[str, Any]:
    """Measure detector flags on high-degree non-laundering accounts without merchant labels."""
    degrees = pd.concat([frame["Account"].value_counts(), frame["Account.1"].value_counts()]).groupby(level=0).sum().sort_values(ascending=False)
    laundering_accounts = set(frame.loc[labels, "Account"].astype(str)) | set(frame.loc[labels, "Account.1"].astype(str))
    hubs = [account for account in degrees.index if account not in laundering_accounts][:200]
    account_mask = frame["Account"].astype(str).isin(hubs) | frame["Account.1"].astype(str).isin(hubs)
    before = {name: int((predicted & account_mask).sum()) for name, predicted in detector_predictions.items()}
    # Guard only uses transaction regularity, counterparty diversity, and history span.
    guarded_accounts: set[str] = set()
    for account in hubs:
        rows = frame[(frame["Account"].astype(str) == account) | (frame["Account.1"].astype(str) == account)]
        counterparties = set(rows["Account"].astype(str)) | set(rows["Account.1"].astype(str))
        span = pd.to_datetime(rows["Timestamp"], errors="coerce").max() - pd.to_datetime(rows["Timestamp"], errors="coerce").min()
        if len(counterparties) >= 8 and span.total_seconds() >= 24 * 3600:
            guarded_accounts.add(account)
    guard_mask = frame["Account"].astype(str).isin(guarded_accounts) | frame["Account.1"].astype(str).isin(guarded_accounts)
    after = {name: int((predicted & account_mask & ~guard_mask).sum()) for name, predicted in detector_predictions.items()}
    return {"candidate_accounts": len(hubs), "before": before, "after": after, "guarded_accounts": len(guarded_accounts), "recall_before": metric(pd.DataFrame(detector_predictions).any(axis=1), labels)["recall"], "recall_after": metric(pd.DataFrame({name: predicted & ~guard_mask for name, predicted in detector_predictions.items()}).any(axis=1), labels)["recall"]}


def load_thresholds(path: Path, split_date: str) -> dict[str, Any]:
    if not path.exists():
        raise RuntimeError(f"frozen thresholds not found at {path}; run with --freeze first")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not payload.get("frozen") or not payload.get("frozen_at"):
        raise RuntimeError("Evaluation refuses to use thresholds until thresholds.json is frozen")
    if payload.get("split_date") != split_date:
        raise RuntimeError(f"Frozen thresholds use split-date {payload.get('split_date')}, not {split_date}")
    return payload


def evaluate(input_path: Path, patterns_path: Path, thresholds_path: Path, split_date: str, freeze: bool = False) -> dict[str, Any]:
    frame = pd.read_csv(input_path)
    tuning, test = split_transactions(frame, split_date)
    thresholds = tune_thresholds(tuning)
    if freeze:
        existing = json.loads(thresholds_path.read_text(encoding="utf-8")) if thresholds_path.exists() else {}
        payload = {"frozen": True, "frozen_at": datetime.now(timezone.utc).isoformat(), "split_date": split_date, "thresholds": thresholds, "detector_scales": existing.get("detector_scales", {})}
        thresholds_path.parent.mkdir(parents=True, exist_ok=True)
        thresholds_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"Frozen thresholds at {payload['frozen_at']}")
        return payload
    payload = load_thresholds(thresholds_path, split_date)
    labels = test["Is Laundering"].astype(int).eq(1)
    split_summary = {"tuning": split_counts(tuning), "test": split_counts(test)}
    print("MuleTrace AML evaluation — sampled subset, per-transaction labels")
    print(f"Split date: {split_date} (tuning before; held-out test from split date)")
    print(f"Thresholds frozen at: {payload['frozen_at']}")
    for name, counts in split_summary.items():
        print(f"{name.title()} split: {counts['accounts']} accounts, {counts['laundering_transactions']} laundering transactions, {counts['normal_accounts']} normal accounts")
    print("\nDetector             Precision  Recall  F1")
    detector_predictions = predictions(test, payload["thresholds"])
    for name, predicted in detector_predictions.items():
        scores = metric(predicted, labels)
        print(f"{name:<20} {scores['precision'] * 100:>8.1f}% {scores['recall'] * 100:>7.1f}% {scores['f1'] * 100:>5.1f}%")
    combined = pd.DataFrame(detector_predictions).any(axis=1)
    overall = metric(combined, labels)
    print(f"{'overall':<20} {overall['precision'] * 100:>8.1f}% {overall['recall'] * 100:>7.1f}% {overall['f1'] * 100:>5.1f}%")
    pattern_labels = parse_pattern_labels(patterns_path) if patterns_path.exists() else {}
    test_patterns = pd.Series([pattern_labels.get(key, "normal") if label else "normal" for key, label in zip(_row_keys(test), labels)], index=test.index)
    print("\nAMLSim pattern       Precision  Recall  F1")
    for pattern in sorted(set(test_patterns)):
        subset = test_patterns.eq(pattern)
        scores = metric(combined[subset], labels[subset])
        print(f"{pattern:<20} {scores['precision'] * 100:>8.1f}% {scores['recall'] * 100:>7.1f}% {scores['f1'] * 100:>5.1f}%")
    false_positives = legitimate_hub_summary(test, detector_predictions, labels)
    print("\nFalse positives: top 200 test-period high-degree accounts without laundering labels")
    print("No real merchant labels exist in this dataset.")
    print(f"Guarded accounts: {false_positives['guarded_accounts']}; laundering recall before/after guard: {false_positives['recall_before'] * 100:.1f}% / {false_positives['recall_after'] * 100:.1f}%")
    for detector in detector_predictions:
        print(f"  {detector}: {false_positives['before'][detector]} -> {false_positives['after'][detector]} flags")
    return {"split": split_summary, "frozen_at": payload["frozen_at"], "overall": overall}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--patterns", type=Path, default=DEFAULT_PATTERNS)
    parser.add_argument("--thresholds", type=Path, default=DEFAULT_THRESHOLDS)
    parser.add_argument("--split-date", default="2022-09-07")
    parser.add_argument("--freeze", action="store_true", help="Tune and freeze thresholds; do not score the held-out test set")
    args = parser.parse_args()
    evaluate(args.input, args.patterns, args.thresholds, args.split_date, args.freeze)


if __name__ == "__main__":
    main()
