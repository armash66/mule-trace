"""Detection pipeline orchestrator.

Runs all stages: parse → graph → detectors → guards → watchlist → score → rings.
Emits SSE events at each stage for streaming UI updates.
"""
from __future__ import annotations

import json
import logging
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Callable

from sqlalchemy.orm import Session

from app.core.config import DetectorThresholds, get_settings
from app.core.pii import mask_account_id
from app.engine.detectors.behavioral import detect_behavioral
from app.engine.detectors.cycles import detect_cycles
from app.engine.detectors.fan_in_out import detect_fan_in_out
from app.engine.detectors.new_cluster import detect_new_clusters
from app.engine.detectors.pass_through import detect_pass_through
from app.engine.feedback import get_active_weights
from app.engine.graph import GraphStore, cache_graph
from app.engine.guards import apply_guards
from app.engine.rings import detect_rings
from app.engine.scoring import score_accounts
from app.engine.watchlist import match_watchlist
from app.models.models import (
    Account,
    Alert,
    Ring,
    Run,
    Signal,
    Transfer,
    gen_id,
)
from app.schemas.schemas import DataQuality

logger = logging.getLogger(__name__)

# Type for SSE event callback
EventCallback = Callable[[str, dict[str, Any], float], None]


def noop_callback(stage: str, data: dict, progress: float) -> None:
    """Default no-op callback."""
    pass


def run_pipeline(
    run_id: str,
    df: Any,  # pandas DataFrame
    quality: DataQuality,
    db: Session,
    thresholds: DetectorThresholds | None = None,
    emit: EventCallback = noop_callback,
) -> dict[str, Any]:
    """Execute the full detection pipeline.

    Args:
        run_id: unique run identifier
        df: cleaned transactions DataFrame (from ingest.parse_csv)
        quality: data quality report
        db: database session
        thresholds: detection thresholds (uses defaults if None)
        emit: SSE event callback for streaming progress

    Returns:
        Pipeline results dict with timing and summary stats.
    """
    settings = get_settings()
    if thresholds is None:
        thresholds = settings.thresholds

    timings: dict[str, float] = {}
    run = db.query(Run).filter(Run.id == run_id).first()
    if run:
        run.status = "running"
        run.started_at = datetime.now(timezone.utc)
        run.config_snapshot_json = json.dumps(thresholds.model_dump(), default=str)
        run.data_quality_json = quality.model_dump_json()
        db.commit()

    # ── Stage 1: Emit parsed data quality ────────────────
    t0 = time.perf_counter()
    emit("parsed", {
        "rows": quality.valid_rows,
        "quality": quality.model_dump(),
    }, 0.1)
    timings["parse"] = round(time.perf_counter() - t0, 3)

    # ── Stage 2: Build graph ─────────────────────────────
    t0 = time.perf_counter()
    store = GraphStore()
    store.build_from_dataframe(df)
    timings["graph"] = round(time.perf_counter() - t0, 3)

    emit("graph", {
        "nodes": store.graph.number_of_nodes(),
        "edges": store.graph.number_of_edges(),
    }, 0.2)

    # Cache graph
    cache_graph(run_id, store)

    # Store accounts and transfers in DB
    acct_map = _persist_accounts(db, run_id, store)
    _persist_transfers(db, run_id, df)

    # ── Stage 3: Run detectors ───────────────────────────
    all_signals: dict[str, list[dict[str, Any]]] = defaultdict(list)

    # 3a: Fan-in/Fan-out
    t0 = time.perf_counter()
    fan_results = detect_fan_in_out(store, thresholds)
    timings["detector_fan_in_out"] = round(time.perf_counter() - t0, 3)
    for r in fan_results:
        all_signals[r["account_id"]].append(r)
    emit("detector", {
        "name": "fan_in_out",
        "alerts": len(fan_results),
    }, 0.35)

    # 3b: Cycles
    t0 = time.perf_counter()
    cycle_results = detect_cycles(store, thresholds)
    timings["detector_cycles"] = round(time.perf_counter() - t0, 3)
    for r in cycle_results:
        all_signals[r["account_id"]].append(r)
    emit("detector", {
        "name": "cycles",
        "alerts": len(cycle_results),
    }, 0.5)

    # 3c: Pass-through
    t0 = time.perf_counter()
    pt_results = detect_pass_through(store, thresholds)
    timings["detector_pass_through"] = round(time.perf_counter() - t0, 3)
    for r in pt_results:
        all_signals[r["account_id"]].append(r)
    emit("detector", {
        "name": "pass_through",
        "alerts": len(pt_results),
    }, 0.6)

    # 3d: New-account clusters
    t0 = time.perf_counter()
    cluster_results = detect_new_clusters(store, thresholds)
    timings["detector_new_cluster"] = round(time.perf_counter() - t0, 3)
    for r in cluster_results:
        all_signals[r["account_id"]].append(r)
    emit("detector", {
        "name": "new_cluster",
        "alerts": len(cluster_results),
    }, 0.7)

    # 3e: Behavioral + ML
    t0 = time.perf_counter()
    behavioral_results = detect_behavioral(store, thresholds)
    timings["detector_behavioral"] = round(time.perf_counter() - t0, 3)
    for r in behavioral_results:
        all_signals[r["account_id"]].append(r)
    emit("detector", {
        "name": "behavioral",
        "alerts": len(behavioral_results),
    }, 0.75)

    # ── Stage 4: Watchlist match ─────────────────────────
    t0 = time.perf_counter()
    watchlist_results = match_watchlist(store, db, thresholds.watchlist_bonus)
    timings["watchlist"] = round(time.perf_counter() - t0, 3)
    for r in watchlist_results:
        all_signals[r["account_id"]].append(r)

    # ── Stage 5: False-positive guards ───────────────────
    t0 = time.perf_counter()
    all_signals = apply_guards(store, dict(all_signals))
    timings["guards"] = round(time.perf_counter() - t0, 3)

    # ── Stage 6: Score + Reasons ─────────────────────────
    t0 = time.perf_counter()
    learned_weights = get_active_weights(db)
    scored = score_accounts(all_signals, thresholds, learned_weights)
    timings["scoring"] = round(time.perf_counter() - t0, 3)

    emit("scored", {
        "total_alerts": len(scored),
        "critical": sum(1 for s in scored if s["risk_band"] == "CRITICAL"),
        "high": sum(1 for s in scored if s["risk_band"] == "HIGH"),
    }, 0.85)

    # ── Stage 7: Ring detection ──────────────────────────
    t0 = time.perf_counter()
    rings = detect_rings(store, scored)
    timings["rings"] = round(time.perf_counter() - t0, 3)

    # Update scored accounts with ring info
    ring_map: dict[str, str] = {}
    for ring in rings:
        for member in ring["members"]:
            ring_map[member] = ring["ring_label"]

    for s in scored:
        s["ring_label"] = ring_map.get(s["account_id"])

    # ── Stage 8: Persist results ─────────────────────────
    t0 = time.perf_counter()
    _persist_alerts(db, run_id, scored, ring_map, thresholds, acct_map)
    _persist_rings(db, run_id, rings)
    _update_account_scores(db, run_id, scored, store, ring_map)
    timings["persist"] = round(time.perf_counter() - t0, 3)

    # Update run status
    if run:
        run.status = "completed"
        run.completed_at = datetime.now(timezone.utc)
        run.total_accounts = store.graph.number_of_nodes()
        run.total_transfers = store.graph.number_of_edges()
        run.total_alerts = len(scored)
        run.total_rings = len(rings)
        run.timing_json = json.dumps(timings)
        db.commit()

    total_time = sum(timings.values())
    timings["total"] = round(total_time, 3)

    emit("done", {
        "total_alerts": len(scored),
        "total_rings": len(rings),
        "timings": timings,
    }, 1.0)

    logger.info(f"Pipeline complete for run {run_id}: {len(scored)} alerts, {len(rings)} rings in {total_time:.2f}s")

    return {
        "run_id": run_id,
        "total_alerts": len(scored),
        "total_rings": len(rings),
        "scored": scored,
        "rings": rings,
        "timings": timings,
        "quality": quality.model_dump(),
    }


def _persist_accounts(db: Session, run_id: str, store: GraphStore) -> dict[str, str]:
    """Save accounts to database and return account_id -> database PK mapping."""
    acct_map: dict[str, str] = {}
    for acct_id, data in store.accounts.items():
        pk = gen_id()
        acct_map[acct_id] = pk
        account = Account(
            id=pk,
            run_id=run_id,
            account_id=acct_id,
            open_date=data.get("open_date"),
            age_days=data.get("age_days"),
            segment=data.get("segment"),
            in_degree=data.get("in_degree", 0),
            out_degree=data.get("out_degree", 0),
            total_in=data.get("total_in", 0),
            total_out=data.get("total_out", 0),
            net_flow=data.get("net_flow", 0),
        )
        db.add(account)
    db.flush()
    return acct_map


def _persist_transfers(db: Session, run_id: str, df: Any) -> None:
    """Save transfers to database."""
    for _, row in df.iterrows():
        transfer = Transfer(
            id=gen_id(),
            run_id=run_id,
            txn_id=str(row["txn_id"]),
            timestamp=row["timestamp"],
            sender_account=row["sender_account"],
            receiver_account=row["receiver_account"],
            amount=float(row["amount"]),
            currency=row.get("currency", "INR"),
            channel=row.get("channel"),
            sender_balance_after=row.get("sender_balance_after"),
            receiver_balance_after=row.get("receiver_balance_after"),
            device_id=row.get("device_id"),
            ip_address=row.get("ip_address"),
            is_victim_report=bool(row.get("is_victim_report", False)),
        )
        db.add(transfer)
    db.flush()


def _persist_alerts(
    db: Session,
    run_id: str,
    scored: list[dict],
    ring_map: dict[str, str],
    thresholds: DetectorThresholds,
    acct_map: dict[str, str] | None = None,
) -> None:
    """Save alerts and signals to database."""
    config_version = gen_id()
    acct_map = acct_map or {}

    for s in scored:
        alert_id = gen_id()
        acct_pk = acct_map.get(s["account_id"])
        alert = Alert(
            id=alert_id,
            run_id=run_id,
            account_id=s["account_id"],
            risk_score=s["risk_score"],
            risk_band=s["risk_band"],
            confidence=s["confidence"],
            reason=s["reason"],
            reason_simple=s.get("reason_simple"),
            next_action=s.get("next_action"),
            innocent_reason=s.get("innocent_reason"),
            ring_id=ring_map.get(s["account_id"]),
            total_flow=sum(
                sig.get("evidence", {}).get("burst_amount", 0)
                or sig.get("evidence", {}).get("total_in", 0)
                or 0
                for sig in s.get("signals", [])
            ),
            config_version=config_version,
        )
        db.add(alert)

        # Save individual signals
        for sig in s.get("signals", []):
            signal = Signal(
                id=gen_id(),
                account_db_id=acct_pk,
                alert_id=alert_id,
                signal_type=sig["signal_type"],
                weight=sig.get("weight", 0),
                raw_value=sig.get("raw_value", 0),
                weighted_score=sig.get("weighted_score", 0),
                evidence_json=json.dumps(sig.get("evidence", {}), default=str),
                reason=sig.get("reason", ""),
                guard_penalty=sig.get("guard_penalty", 0),
                guard_reason=sig.get("guard_reason", ""),
            )
            db.add(signal)

    db.flush()


def _persist_rings(db: Session, run_id: str, rings: list[dict]) -> None:
    """Save rings to database."""
    for ring in rings:
        ring_obj = Ring(
            id=gen_id(),
            run_id=run_id,
            ring_label=ring["ring_label"],
            member_count=ring["member_count"],
            total_flow=ring["total_flow"],
            time_span_minutes=ring["time_span_minutes"],
            risk_score=ring["risk_score"],
            entry_accounts_json=json.dumps(ring["entry_accounts"]),
            exit_accounts_json=json.dumps(ring["exit_accounts"]),
            member_accounts_json=json.dumps(ring["members"]),
            layout_json=json.dumps(ring.get("layout", {})),
        )
        db.add(ring_obj)
    db.flush()


def _update_account_scores(
    db: Session,
    run_id: str,
    scored: list[dict],
    store: GraphStore,
    ring_map: dict[str, str],
) -> None:
    """Update account records with scores and ring assignments."""
    score_map = {s["account_id"]: s for s in scored}

    accounts = db.query(Account).filter(Account.run_id == run_id).all()
    for account in accounts:
        if account.account_id in score_map:
            s = score_map[account.account_id]
            account.risk_score = s["risk_score"]
            account.risk_band = s["risk_band"]
            account.ring_id = ring_map.get(account.account_id)
            account.is_flagged = True
            # Update graph store too
            if account.account_id in store.accounts:
                store.accounts[account.account_id]["risk_score"] = s["risk_score"]
                store.accounts[account.account_id]["risk_band"] = s["risk_band"]
                store.accounts[account.account_id]["ring_id"] = ring_map.get(account.account_id)
                store.accounts[account.account_id]["signal_types"] = s.get("signal_types", [])
                store.accounts[account.account_id]["status"] = "UNREVIEWED"

    db.commit()
