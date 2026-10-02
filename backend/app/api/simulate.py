from __future__ import annotations

import asyncio
from datetime import datetime
import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..analytics.redteam import evaluate_evasion_curve
from ..db import get_db
from ..models import AccountResult, AuditLog, Decision, FreezeRequest, Run
from ..pipeline import pipeline_state, run_pipeline
from ..schemas import IngestResponse
from ..core.security import Role, TokenData, require_role

logger = logging.getLogger(__name__)
router = APIRouter(tags=["simulate"])

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
SCENARIOS_FILE = Path(__file__).resolve().parent.parent / "data" / "scenarios.json"


@router.post("/simulate/evasion")
def simulate_evasion(
    level: float = Query(0.0, ge=0.0, le=1.0, description="Fraudster sophistication / evasion level"),
    user: TokenData = Depends(require_role(Role.ANALYST)),
) -> dict[str, Any]:
    """Simulate detection performance degradation under adversarial evasion tactics."""
    curve = evaluate_evasion_curve()
    levels = curve["evasion_levels"]

    # Interpolate closest evasion metrics
    closest_idx = min(range(len(levels)), key=lambda i: abs(levels[i] - level))
    current_recalls = {
        pat: curve["recall_by_pattern"][pat][closest_idx]
        for pat in curve["recall_by_pattern"]
    }

    return {
        "evasion_level": level,
        "selected_level": levels[closest_idx],
        "current_recalls": current_recalls,
        "overall_recall": curve["overall_recall"][closest_idx],
        "full_curve": curve,
        "label": "measured on synthetic data",
    }


@router.post("/demo/reset", response_model=IngestResponse)
def reset_demo(db: Session = Depends(get_db), user: TokenData | None = None) -> IngestResponse:
    """Reset the live sandbox: clear analyst decisions, freeze requests, and reload seeded demo data."""
    try:
        # Clear existing triage decisions and freeze requests for fresh sandbox experience
        db.query(Decision).delete()
        db.query(FreezeRequest).delete()
        db.query(AccountResult).delete()
        db.query(Run).delete()
        db.commit()

        # Reload synthetic demo dataset
        txn_file = DATA_DIR / "transactions.csv"
        acct_file = DATA_DIR / "accounts.csv"

        if not txn_file.exists():
            raise HTTPException(
                status_code=404,
                detail="Synthetic data not found in data/ directory.",
            )

        with open(txn_file, "rb") as f:
            txn_bytes = f.read()

        acct_bytes = None
        if acct_file.exists():
            with open(acct_file, "rb") as f:
                acct_bytes = f.read()

        res = run_pipeline(txn_bytes, acct_bytes, db)

        audit = AuditLog(
            action="DEMO_RESET",
            entity_type="SYSTEM",
            entity_id=res.run_id,
            details={"message": "Sandbox reset to seeded baseline."},
        )
        db.add(audit)
        db.commit()

        return res
    except Exception as e:
        logger.exception("Demo reset failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to reset demo: {e}") from e


@router.post("/demo/load", response_model=IngestResponse)
def load_demo_alias(db: Session = Depends(get_db), user: TokenData = Depends(require_role(Role.ANALYST))) -> IngestResponse:
    """Alias for demo data loading (backward compatibility)."""
    return reset_demo(db)


# ─── Live Heist Simulation ──────────────────────────────────────

class StartSimulationRequest(BaseModel):
    scenario_id: str = "digital_arrest"
    speed: float = 1.0

_active_simulations: dict[str, dict] = {}


def _load_scenarios() -> dict[str, Any]:
    if SCENARIOS_FILE.exists():
        with open(SCENARIOS_FILE, "r") as f:
            return json.load(f)
    return {}


@router.get("/simulate/scenarios")
def get_scenarios() -> dict[str, Any]:
    """Retrieve available live heist simulation scenarios."""
    return _load_scenarios()


@router.post("/simulate/start")
def start_simulation(req: StartSimulationRequest) -> dict[str, Any]:
    """Initialize a live heist simulation session."""
    scenarios = _load_scenarios()
    scenario = scenarios.get(req.scenario_id) or scenarios.get("digital_arrest")
    if not scenario:
        raise HTTPException(404, "Scenario not found.")

    session_id = "sim_live_heist"
    _active_simulations[session_id] = {
        "scenario_id": req.scenario_id,
        "speed": req.speed,
        "status": "running",
        "started_at": datetime.utcnow().isoformat(),
    }
    return {
        "status": "started",
        "session_id": session_id,
        "scenario": scenario,
        "speed": req.speed,
    }


@router.post("/simulate/stop")
def stop_simulation() -> dict[str, Any]:
    """Stop active heist simulation and clean up transient data."""
    _active_simulations.clear()
    return {"status": "stopped", "message": "Simulation halted and reset cleanly."}


def _evaluate_stream_rules(history: list[dict], current_txn: dict, scenario: dict) -> list[dict]:
    """Evaluate real detection rules on streaming transaction events."""
    alerts = []
    src = current_txn["src"]
    ring_id = scenario.get("target_ring_id", "RNG-HEIST")

    # 1. Rapid Fan-Out Rule
    outbound = [t for t in history if t["src"] == src]
    if len(outbound) >= 3:
        inbound = [t for t in history if t["dst"] == src]
        total_in = sum(t["amount"] for t in inbound)
        total_out = sum(t["amount"] for t in outbound)
        if total_in > 0 and (total_out / total_in) >= 0.70:
            recipients = {t["dst"] for t in outbound}
            alerts.append({
                "alert_id": f"ALT-FAN-{src}",
                "rule_id": "RULE_RAPID_FANOUT",
                "severity": "CRITICAL",
                "title": "Rapid fan-out detected",
                "ring_id": ring_id,
                "account_id": src,
                "message": f"CRITICAL · Rapid fan-out detected · Ring {ring_id}",
                "detail": f"Hub {src} dispersed ₹{total_out:,.0f} across {len(recipients)} receivers in minutes.",
            })

    # 2. Shared Device / Hardware Collision Rule
    dev = current_txn.get("device")
    if dev and not dev.startswith("DEV-VIC") and not dev.startswith("D-ATM"):
        txns_with_dev = [t for t in history if t.get("device") == dev]
        distinct_accts = {t["src"] for t in txns_with_dev}.union(
            {t["dst"] for t in txns_with_dev if not t.get("is_terminal")}
        )
        if len(distinct_accts) >= 2:
            alerts.append({
                "alert_id": f"ALT-DEV-{dev}",
                "rule_id": "RULE_SHARED_DEVICE",
                "severity": "HIGH",
                "title": "Hardware collision detected",
                "ring_id": ring_id,
                "account_id": src,
                "message": f"HIGH · Shared device collision ({dev}) · Ring {ring_id}",
                "detail": f"Device fingerprint {dev} operating across multiple syndicate accounts.",
            })

    # 3. Layering Chain Velocity
    if current_txn.get("step", 0) >= 6 and not current_txn.get("is_terminal"):
        alerts.append({
            "alert_id": f"ALT-CHAIN-{src}",
            "rule_id": "RULE_CHAIN",
            "severity": "HIGH",
            "title": "Rapid pass-through velocity",
            "ring_id": ring_id,
            "account_id": src,
            "message": f"HIGH · Rapid pass-through velocity · Ring {ring_id}",
            "detail": f"Multi-hop pass-through with minimal dwelling time between {src} → {current_txn['dst']}.",
        })

    # 4. Terminal Cash-Out Extraction
    if current_txn.get("is_terminal"):
        alerts.append({
            "alert_id": f"ALT-CASHOUT-{current_txn['dst']}",
            "rule_id": "RULE_CASHOUT",
            "severity": "CRITICAL",
            "title": "Terminal cash-out extraction",
            "ring_id": ring_id,
            "account_id": current_txn["dst"],
            "message": f"CRITICAL · Terminal cash-out detected · Ring {ring_id}",
            "detail": f"Funds reaching terminal cash-out sink {current_txn['dst']} ({current_txn.get('channel', 'ATM')}).",
        })

    return alerts


@router.get("/simulate/stream")
async def stream_simulation(
    request: Request,
    scenario_id: str = Query("digital_arrest"),
    speed: float = Query(1.0, ge=0.5, le=5.0),
):
    """Server-Sent Events (SSE) streaming live heist transactions and real-time detection."""
    scenarios = _load_scenarios()
    scenario = scenarios.get(scenario_id) or scenarios.get("digital_arrest")
    if not scenario:
        raise HTTPException(404, "Scenario not found.")

    async def event_generator():
        transactions = scenario.get("transactions", [])
        history: list[dict] = []
        all_alerts: list[dict] = []
        first_alert_time: float | None = None
        start_time = asyncio.get_event_loop().time()

        initial_stolen = float(scenario.get("initial_amount", 1500000))
        money_out = 0.0

        # Build graph dynamically
        nodes_dict: dict[str, dict] = {}
        edges_list: list[dict] = []

        for idx, txn in enumerate(transactions):
            if await request.is_disconnected():
                logger.info("Client disconnected from heist simulation stream.")
                break

            current_time = asyncio.get_event_loop().time()
            elapsed_sec = round(current_time - start_time, 2)
            history.append(txn)

            if txn.get("is_terminal"):
                money_out += float(txn["amount"])

            stolen_moving = max(0.0, initial_stolen - money_out)

            # Evaluate real detection rules
            new_alerts = _evaluate_stream_rules(history, txn, scenario)
            for a in new_alerts:
                if not any(existing["alert_id"] == a["alert_id"] for existing in all_alerts):
                    all_alerts.append(a)
                    if first_alert_time is None and a["severity"] == "CRITICAL":
                        first_alert_time = elapsed_sec

            time_to_intercept = first_alert_time if first_alert_time is not None else elapsed_sec

            # Update nodes & edges
            src, dst = txn["src"], txn["dst"]
            interception_acc = scenario.get("interception_account", src)

            for nid in [src, dst]:
                if nid not in nodes_dict:
                    is_interception = (nid == interception_acc)
                    is_hub = (nid == scenario.get("primary_hub"))
                    is_term = bool(txn.get("is_terminal") and nid == dst)
                    score = 96 if (is_interception or is_hub) else (30 if is_term else 82)
                    shape = "rectangle" if (is_term or "DEV" in nid) else ("hexagon" if (is_hub or is_interception) else "ellipse")

                    nodes_dict[nid] = {
                        "id": nid,
                        "score": score,
                        "patterns": ["fan" if is_hub else "chain"],
                        "age_days": 14,
                        "nodeShape": shape,
                        "isFreeze": 1 if is_interception else 0,
                    }

            current_edge_id = f"e_{src}_{dst}_{txn['step']}"
            edges_list.append({
                "src": src,
                "dst": dst,
                "total_amount": float(txn["amount"]),
                "count": 1,
                "first_time": str(elapsed_sec),
                "id": current_edge_id,
            })

            # Calculate freeze point: stoppable amount is remaining flow
            stoppable_rupees = max(0.0, initial_stolen - money_out)

            payload = {
                "type": "transaction",
                "step": txn["step"],
                "total_steps": len(transactions),
                "transaction": txn,
                "stolen_moving": stolen_moving,
                "money_out": money_out,
                "time_to_intercept": time_to_intercept,
                "new_alerts": new_alerts,
                "all_alerts_count": len(all_alerts),
                "active_edge_id": current_edge_id,
                "settled_edge_ids": [e["id"] for e in edges_list[:-1]],
                "freeze_point": {
                    "account_id": interception_acc,
                    "amount_stoppable": stoppable_rupees,
                    "label": f"Freeze here · stops ₹{stoppable_rupees / 100000:.1f}L",
                },
                "nodes": list(nodes_dict.values()),
                "edges": edges_list,
            }

            yield f"data: {json.dumps(payload)}\n\n"

            # 500ms delay divided by speed
            delay_sec = (txn.get("delay_ms", 500) / 1000.0) / speed
            await asyncio.sleep(delay_sec)

        # Complete event
        complete_payload = {
            "type": "complete",
            "summary": {
                "events_processed": len(history),
                "total_events": len(transactions),
                "alerts_raised": len(all_alerts),
                "initial_amount": initial_stolen,
                "stolen_moving": stolen_moving,
                "money_out": money_out,
                "money_intercepted": max(0.0, initial_stolen - money_out),
                "time_to_intercept": time_to_intercept,
            },
        }
        yield f"data: {json.dumps(complete_payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
