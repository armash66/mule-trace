"""Benchmark runner for MuleTrace.

Evaluates detection performance on deterministic synthetic data with planted
mule rings and look-alike behaviors. Measures Precision, Recall, F1, FPR,
detection latency, and freeze-first fund recovery rates.
Outputs: benchmark_results.json.
"""
from __future__ import annotations

import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any

# Ensure backend directory is in path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.config import get_settings
from app.core.database import get_engine, get_session_factory, init_db
from app.engine.ingest import parse_csv
from app.engine.pipeline import run_pipeline
from app.engine.graph import GraphStore
from app.engine.trace import trace_funds
from app.models.models import Alert, Run, gen_id
from synthetic.generator import generate_synthetic_data

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def run_benchmark(
    num_accounts: int = 5000,
    num_rings: int = 10,
    seed: int = 42,
    output_file: str = "benchmark_results.json",
) -> dict[str, Any]:
    """Execute complete detection and fund recovery benchmark."""
    logger.info("=========================================")
    logger.info("   MULETRACE BENCHMARK EVALUATION ENGINE ")
    logger.info("=========================================")
    logger.info(f"Parameters: accounts={num_accounts}, planted_rings={num_rings}, seed={seed}")

    data_dir = os.path.join(backend_dir, "app", "data")
    os.makedirs(data_dir, exist_ok=True)

    # 1. Generate Synthetic Data
    gen_start = time.perf_counter()
    summary = generate_synthetic_data(
        num_accounts=num_accounts,
        num_rings=num_rings,
        seed=seed,
        output_dir=data_dir,
    )
    gen_time = time.perf_counter() - gen_start
    logger.info(f"Synthetic data generated in {gen_time:.2f}s ({summary['transactions']} txns)")

    # Load Ground Truth
    with open(summary["files"]["ground_truth"], "r", encoding="utf-8") as f:
        ground_truth = json.load(f)

    planted_mules = set(ground_truth["mule_accounts"])
    planted_victims = set(ground_truth["victim_accounts"])
    planted_rings = ground_truth["rings"]

    # 2. Database & Pipeline Execution
    init_db()
    factory = get_session_factory(get_engine())
    db = factory()

    try:
        with open(summary["files"]["transactions"], "rb") as f:
            csv_content = f.read()

        parse_start = time.perf_counter()
        df, quality = parse_csv(csv_content, "benchmark_txns.csv")
        parse_time = time.perf_counter() - parse_start

        run = Run(
            id=gen_id(),
            status="pending",
            filename="benchmark_txns.csv",
            total_rows=quality.total_rows,
            valid_rows=quality.valid_rows,
            seed=seed,
        )
        db.add(run)
        db.commit()

        pipeline_start = time.perf_counter()
        pipeline_res = run_pipeline(run.id, df, quality, db)
        pipeline_time = time.perf_counter() - pipeline_start

        # 3. Fetch Flagged Accounts (Alerts)
        alerts = db.query(Alert).filter(Alert.run_id == run.id).all()
        flagged_accounts = {a.account_id for a in alerts}
        high_critical_flagged = {
            a.account_id for a in alerts if a.risk_band in ("HIGH", "CRITICAL", "High", "Critical") or (a.risk_score or 0) >= 70
        }

        # 4. Metric Computation (Ground Truth vs Detected)
        true_positives = len(flagged_accounts.intersection(planted_mules))
        false_positives = len(flagged_accounts - planted_mules)
        false_negatives = len(planted_mules - flagged_accounts)
        true_negatives = (num_accounts - len(planted_mules)) - false_positives

        precision = (
            true_positives / (true_positives + false_positives)
            if (true_positives + false_positives) > 0
            else 0.0
        )
        recall = (
            true_positives / (true_positives + false_negatives)
            if (true_positives + false_negatives) > 0
            else 0.0
        )
        f1_score = (
            2 * (precision * recall) / (precision + recall)
            if (precision + recall) > 0
            else 0.0
        )

        # False positive rate on benign accounts
        fpr_benign = (
            false_positives / (false_positives + true_negatives)
            if (false_positives + true_negatives) > 0
            else 0.0
        )

        # Ring detection recall
        detected_rings = pipeline_res.get("total_rings", 0)
        ring_recall = min(1.0, detected_rings / num_rings) if num_rings > 0 else 1.0

        # 5. Recovery Rate Benchmark (Freeze-First vs Naive)
        store = GraphStore()
        store.build_from_dataframe(df)

        total_stolen = 0.0
        freeze_first_recoverable = 0.0
        naive_recoverable = 0.0

        for victim_id in list(planted_victims)[:5]:
            victim_out = store.sorted_edges.get(victim_id, [])
            if not victim_out:
                continue
            start_ts = victim_out[0]["timestamp"]
            trace_res = trace_funds(store=store, victim_account=victim_id, start_ts=start_ts)
            stolen = trace_res.get("stolen_amount", 0.0)
            if stolen > 0:
                total_stolen += stolen
                # Freeze first: recoverable amounts from freeze priority
                ff = sum(
                    item.get("recoverable_amount", 0.0)
                    for item in trace_res.get("freeze_priority", [])
                )
                freeze_first_recoverable += ff
                # Naive recovery: only first-hop accounts if frozen immediately
                first_hop_sum = sum(
                    hop.get("amount", 0.0)
                    for hop in trace_res.get("hops", [])
                    if hop.get("hop_number") == 1 and hop.get("status") == "terminal"
                )
                naive_recoverable += first_hop_sum

        recovery_rate_freeze_first = (
            (freeze_first_recoverable / total_stolen * 100) if total_stolen > 0 else 0.0
        )
        recovery_rate_naive = (
            (naive_recoverable / total_stolen * 100) if total_stolen > 0 else 0.0
        )

        # 6. Latency & Throughput
        total_txns = len(df)
        tps = total_txns / pipeline_time if pipeline_time > 0 else 0.0
        latency_per_10k = (pipeline_time / total_txns * 10000) if total_txns > 0 else 0.0

        results = {
            "metadata": {
                "benchmark_date": datetime.now(timezone.utc).isoformat(),
                "seed": seed,
                "dataset": "Synthetic-Deterministic-V3",
                "total_transactions": total_txns,
                "total_accounts": num_accounts,
                "planted_mules": len(planted_mules),
                "planted_rings": num_rings,
            },
            "metrics": {
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "f1_score": round(f1_score, 4),
                "false_positive_rate": round(fpr_benign, 4),
                "ring_detection_recall": round(ring_recall, 4),
                "high_critical_alerts": len(high_critical_flagged),
                "total_alerts": len(alerts),
            },
            "performance": {
                "parse_time_seconds": round(parse_time, 3),
                "pipeline_time_seconds": round(pipeline_time, 3),
                "transactions_per_second": round(tps, 1),
                "latency_per_10k_txns_seconds": round(latency_per_10k, 2),
                "stage_timings": pipeline_res.get("timings", {}),
            },
            "recovery_benchmark": {
                "total_stolen_sample_inr": round(total_stolen, 2),
                "freeze_first_recoverable_inr": round(freeze_first_recoverable, 2),
                "freeze_first_recovery_pct": round(recovery_rate_freeze_first, 1),
                "naive_recovery_pct": round(recovery_rate_naive, 1),
                "recovery_lift_multiplier": (
                    round(recovery_rate_freeze_first / max(recovery_rate_naive, 1.0), 2)
                ),
            },
        }

        # Write output file to both root and backend
        root_out = os.path.join(os.path.dirname(backend_dir), output_file)
        backend_out = os.path.join(backend_dir, output_file)
        for target in (root_out, backend_out):
            with open(target, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2)

        # Print human-readable summary
        logger.info("\n" + "=" * 50)
        logger.info("            BENCHMARK RESULTS            ")
        logger.info("=" * 50)
        logger.info(f"  Precision:           {results['metrics']['precision'] * 100:.2f}%")
        logger.info(f"  Recall:              {results['metrics']['recall'] * 100:.2f}%")
        logger.info(f"  F1 Score:            {results['metrics']['f1_score'] * 100:.2f}%")
        logger.info(f"  False Positive Rate: {results['metrics']['false_positive_rate'] * 100:.2f}%")
        logger.info(f"  Pipeline Latency:    {results['performance']['pipeline_time_seconds']}s")
        logger.info(f"  Throughput:          {results['performance']['transactions_per_second']} txns/sec")
        logger.info(f"  Freeze-First Recov.: {results['recovery_benchmark']['freeze_first_recovery_pct']}%")
        logger.info(f"  Naive Recov.:        {results['recovery_benchmark']['naive_recovery_pct']}%")
        logger.info("=" * 50)
        logger.info(f"Benchmark results written to: {root_out}")

        return results

    finally:
        db.close()


if __name__ == "__main__":
    run_benchmark()
