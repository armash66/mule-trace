#!/usr/bin/env python3
"""
MuleTrace Evaluation Script.

Runs the detection pipeline against data/transactions.csv, evaluates against
data/ground_truth.json, and prints:
  - Precision, Recall, and F1 per pattern
  - Overall precision and recall
  - Decoy false-positive count (must be <= config limit)
  - Clear label: "measured on synthetic data"

Usage::

    python scripts/evaluate.py
"""

from __future__ import annotations

import json
from pathlib import Path
import sys
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

from backend.app.config import load_config
from backend.app.db import SessionLocal, init_db
from backend.app.pipeline import run_pipeline

DATA_DIR = REPO_ROOT / "data"


def evaluate() -> dict[str, Any]:
    print("=" * 70)
    print(" MuleTrace Engine Evaluation — Measured on Synthetic Data")
    print("=" * 70)

    gt_path = DATA_DIR / "ground_truth.json"
    txn_path = DATA_DIR / "transactions.csv"
    acct_path = DATA_DIR / "accounts.csv"

    if not gt_path.exists() or not txn_path.exists():
        print("Error: data files not found. Run python scripts/generate_data.py first.")
        sys.exit(1)

    with open(gt_path, "r", encoding="utf-8") as f:
        gt = json.load(f)

    with open(txn_path, "rb") as f:
        txn_bytes = f.read()

    acct_bytes = None
    if acct_path.exists():
        with open(acct_path, "rb") as f:
            acct_bytes = f.read()

    init_db()
    db = SessionLocal()

    try:
        config = load_config()
        res = run_pipeline(txn_bytes, acct_bytes, db, config)
    finally:
        db.close()

    # Ground truth sets
    all_mules = set(gt.get("all_mule_accounts", []))
    all_decoys = set(gt.get("all_decoy_accounts", []))

    # Pattern ground truths
    planted_by_pattern: dict[str, set[str]] = {
        "fan": set(),
        "cycle": set(),
        "chain": set(),
        "cluster": set(),
        "dormancy": set(),
    }
    for ring in gt.get("planted_rings", []):
        pat = ring.get("pattern")
        if pat in planted_by_pattern:
            planted_by_pattern[pat].update(ring.get("accounts", []))

    from backend.app.pipeline import pipeline_state

    # Detected sets
    detected_mules: set[str] = set()
    detected_by_pattern: dict[str, set[str]] = {p: set() for p in planted_by_pattern}

    flag_threshold = config.get("scoring", {}).get("flag_threshold", 50)
    for aid, sc in pipeline_state.scored_accounts.items():
        if sc.risk_score >= flag_threshold or len(sc.patterns) > 0:
            detected_mules.add(aid)
            for p in sc.patterns:
                if p in detected_by_pattern:
                    detected_by_pattern[p].add(aid)

    # Per-pattern metrics
    metrics: dict[str, dict[str, float]] = {}
    print(f"\n{'Pattern':<12} | {'Planted':<8} | {'Detected':<8} | {'TP':<6} | {'Precision':<10} | {'Recall':<10} | {'F1':<8}")
    print("-" * 75)

    total_tp = 0
    total_planted = len(all_mules)
    total_detected = len(detected_mules)

    for pat, planted_set in planted_by_pattern.items():
        det_set = detected_by_pattern[pat]
        tp = len(planted_set.intersection(det_set))
        prec = (tp / len(det_set)) if det_set else 1.0
        rec = (tp / len(planted_set)) if planted_set else 1.0
        f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0

        metrics[pat] = {
            "planted": len(planted_set),
            "detected": len(det_set),
            "tp": tp,
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
        }
        print(f"{pat:<12} | {len(planted_set):<8} | {len(det_set):<8} | {tp:<6} | {prec*100:>8.1f}% | {rec*100:>8.1f}% | {f1:>6.3f}")

    # Decoy False Positives
    decoy_fps = detected_mules.intersection(all_decoys)
    decoy_fp_count = len(decoy_fps)

    overall_tp = len(all_mules.intersection(detected_mules))
    overall_prec = (overall_tp / total_detected) if total_detected else 0.0
    overall_rec = (overall_tp / total_planted) if total_planted else 0.0
    overall_f1 = (2 * overall_prec * overall_rec / (overall_prec + overall_rec)) if (overall_prec + overall_rec) > 0 else 0.0

    print("-" * 75)
    print(f"{'OVERALL':<12} | {total_planted:<8} | {total_detected:<8} | {overall_tp:<6} | {overall_prec*100:>8.1f}% | {overall_rec*100:>8.1f}% | {overall_f1:>6.3f}")
    print("=" * 75)
    print(f"\nDecoy False Positives: {decoy_fp_count} / {len(all_decoys)} (Allowed max: {config.get('testing', {}).get('max_decoy_false_positives', 2)})")
    if decoy_fps:
        print(f"  Flagged decoys: {decoy_fps}")
    else:
        print("  Zero decoy false positives! All business/payroll/family accounts remained clean.")

    print("\n[NOTE] All figures measured strictly on synthetic benchmark data with planted rings.")
    print("=" * 70)

    return {
        "overall_precision": overall_prec,
        "overall_recall": overall_rec,
        "overall_f1": overall_f1,
        "decoy_false_positives": decoy_fp_count,
        "per_pattern": metrics,
    }


if __name__ == "__main__":
    evaluate()
