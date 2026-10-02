"""Simulation, adversarial evasion testing, and demo dataset reset API routes."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
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
def reset_demo(db: Session = Depends(get_db), user: TokenData = Depends(require_role(Role.ANALYST))) -> IngestResponse:
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
