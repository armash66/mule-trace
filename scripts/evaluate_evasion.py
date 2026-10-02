#!/usr/bin/env python3
"""
MuleTrace Adversarial Evasion Evaluation Script.

Measures detection recall degradation across fraudster evasion levels
(0.0, 0.25, 0.5, 0.75, 1.0) and prints a structured benchmark table.

Usage::

    python scripts/evaluate_evasion.py
"""

from __future__ import annotations

import json
from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

from backend.app.analytics.redteam import evaluate_evasion_curve


def main() -> None:
    print("=" * 70)
    print(" MuleTrace Red-Team Evasion Benchmark — Measured on Synthetic Data")
    print("=" * 70)

    curve = evaluate_evasion_curve()
    levels = curve["evasion_levels"]
    recalls = curve["recall_by_pattern"]
    overall = curve["overall_recall"]

    header = f"{'Evasion Level':<15} | " + " | ".join(f"{p:<9}" for p in recalls) + " | Overall"
    print(header)
    print("-" * len(header))

    for idx, lvl in enumerate(levels):
        row = f"{lvl:<15.2f} | "
        for p in recalls:
            r = recalls[p][idx] * 100
            row += f"{r:>8.1f}% | "
        row += f"{overall[idx]*100:>6.1f}%"
        print(row)

    print("=" * len(header))
    print("[NOTE] All metrics measured on synthetic benchmark data with planted rings.")
    print("       Shows grace degradation under hop delays, amount splitting, and device rotation.")


if __name__ == "__main__":
    main()
