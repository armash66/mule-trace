"""Run and dataset ingestion API routes for MuleTrace."""

from __future__ import annotations

import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Run
from ..pipeline import run_pipeline, pipeline_state
from ..schemas import DataHealthReport, IngestResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["runs"])


@router.post("/ingest", response_model=IngestResponse)
async def ingest_dataset(
    transactions: UploadFile = File(...),
    accounts: UploadFile | None = File(None),
    db: Session = Depends(get_db),
) -> IngestResponse:
    """Upload transactions.csv and optional accounts.csv to trigger detection pipeline."""
    try:
        txn_bytes = await transactions.read()
        acct_bytes = await accounts.read() if accounts is not None else None
        return run_pipeline(txn_bytes, acct_bytes, db)
    except Exception as e:
        logger.exception("Ingest failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/runs")
def list_runs(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """List all historical pipeline runs."""
    runs = db.query(Run).order_by(Run.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat() if hasattr(r.created_at, "isoformat") else str(r.created_at),
            "txn_count": r.txn_count,
            "acct_count": r.acct_count,
            "flagged_count": r.flagged_count,
            "duplicates_removed": r.duplicates_removed,
            "out_of_order_fixed": r.out_of_order_fixed,
            "missing_device_pct": r.missing_device_pct,
            "missing_ip_pct": r.missing_ip_pct,
            "self_transfers_dropped": r.self_transfers_dropped,
        }
        for r in runs
    ]


@router.get("/runs/{run_id}/health", response_model=DataHealthReport)
def get_run_health(run_id: str, db: Session = Depends(get_db)) -> DataHealthReport:
    """Retrieve data-health report for a specific pipeline run."""
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")

    return DataHealthReport(
        run_id=run.id,
        duplicates_removed=run.duplicates_removed or 0,
        out_of_order_fixed=run.out_of_order_fixed or 0,
        missing_device_pct=run.missing_device_pct or 0.0,
        missing_ip_pct=run.missing_ip_pct or 0.0,
        self_transfers_dropped=run.self_transfers_dropped or 0,
        total_transactions=run.txn_count or 0,
        total_accounts=run.acct_count or 0,
    )
