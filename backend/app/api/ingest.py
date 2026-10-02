"""Ingest, runs, and SSE streaming routes."""
from __future__ import annotations

import asyncio
import io
import json
import logging
import threading
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.core.audit import append_audit_entry
from app.core.config import get_settings
from app.core.database import get_db, get_session_factory, get_engine
from app.core.middleware import envelope
from app.core.security import TokenData, get_current_user, require_role, Role
from app.engine.ingest import parse_csv
from app.engine.pipeline import run_pipeline
from app.models.models import Job, Run, gen_id
from app.schemas.schemas import RunSummary

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ingest"])

# In-memory SSE event queues per run
_event_queues: dict[str, list[asyncio.Queue]] = {}


def _get_run_queue(run_id: str) -> asyncio.Queue:
    """Get or create an SSE event queue for a run."""
    q: asyncio.Queue = asyncio.Queue()
    _event_queues.setdefault(run_id, []).append(q)
    return q


def _emit_to_queues(run_id: str, event: dict) -> None:
    """Push event to all listeners of a run."""
    for q in _event_queues.get(run_id, []):
        try:
            q.put_nowait(event)
        except Exception:
            pass


@router.post("/ingest")
async def ingest(
    file: UploadFile = File(...),
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Upload CSV and start analysis pipeline.
    
    Returns 202 with run_id. Connect to /runs/{id}/events for SSE streaming.
    """
    settings = get_settings()

    # Validate file
    if not file.filename:
        raise HTTPException(400, "No file provided")

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_upload_size_mb:
        raise HTTPException(413, f"File too large ({size_mb:.1f} MB). Max: {settings.max_upload_size_mb} MB")

    # Create run
    run_id = gen_id()
    run = Run(
        id=run_id,
        status="pending",
        created_by=user.user_id,
        filename=file.filename,
        seed=settings.seed,
    )
    db.add(run)

    job = Job(
        id=gen_id(),
        run_id=run_id,
        job_type="INGEST",
        status="PENDING",
        created_by=user.user_id,
    )
    db.add(job)
    db.commit()

    append_audit_entry(
        db, "INGEST_START", user.user_id, user.username,
        {"run_id": run_id, "filename": file.filename, "size_mb": round(size_mb, 2)},
    )

    # Start pipeline in background thread
    def _run_bg():
        # Create a new session for background thread
        factory = get_session_factory(get_engine())
        bg_db = factory()
        try:
            # Parse CSV
            df, quality = parse_csv(content, file.filename or "upload.csv")

            # Update run with quality info
            bg_run = bg_db.query(Run).filter(Run.id == run_id).first()
            if bg_run:
                bg_run.total_rows = quality.total_rows
                bg_run.valid_rows = quality.valid_rows
                bg_run.duplicate_rows = quality.duplicate_rows
                bg_run.invalid_rows = quality.invalid_rows
                bg_db.commit()

            # Define SSE emitter
            def emit(stage: str, data: dict, progress: float):
                event = {"stage": stage, "data": data, "progress": progress}
                _emit_to_queues(run_id, event)

            # Run pipeline
            result = run_pipeline(run_id, df, quality, bg_db, emit=emit)

            # Update job
            bg_job = bg_db.query(Job).filter(Job.run_id == run_id).first()
            if bg_job:
                bg_job.status = "COMPLETED"
                bg_job.progress = 1.0
                bg_job.completed_at = datetime.now(timezone.utc)
                bg_job.result_json = json.dumps({"total_alerts": result["total_alerts"]})
                bg_db.commit()

        except Exception as e:
            logger.exception(f"Pipeline failed for run {run_id}")
            bg_run = bg_db.query(Run).filter(Run.id == run_id).first()
            if bg_run:
                bg_run.status = "failed"
                bg_db.commit()
            bg_job = bg_db.query(Job).filter(Job.run_id == run_id).first()
            if bg_job:
                bg_job.status = "FAILED"
                bg_job.error_message = str(e)
                bg_db.commit()
            _emit_to_queues(run_id, {"stage": "error", "data": {"message": str(e)}, "progress": 0})
        finally:
            bg_db.close()

    thread = threading.Thread(target=_run_bg, daemon=True)
    thread.start()

    return envelope(
        data={"run_id": run_id},
        meta={"status": "accepted"},
    )


@router.get("/runs")
def list_runs(
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """List all analysis runs."""
    runs = db.query(Run).order_by(Run.created_at.desc()).limit(50).all()
    return envelope(data=[
        RunSummary.model_validate(r).model_dump() for r in runs
    ])


@router.get("/runs/{run_id}")
def get_run(
    run_id: str,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Get run details."""
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(404, "Run not found")
    
    result = RunSummary.model_validate(run).model_dump()
    if run.data_quality_json:
        result["data_quality"] = json.loads(run.data_quality_json)
    if run.timing_json:
        result["timings"] = json.loads(run.timing_json)
    
    return envelope(data=result)


@router.get("/runs/{run_id}/events")
async def run_events(
    run_id: str,
    db: Session = Depends(get_db),
):
    """SSE stream of pipeline events for a run."""
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(404, "Run not found")

    queue = _get_run_queue(run_id)

    async def event_generator():
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield {
                        "event": event.get("stage", "update"),
                        "data": json.dumps(event),
                    }
                    if event.get("stage") in ("done", "error"):
                        break
                except asyncio.TimeoutError:
                    yield {"event": "heartbeat", "data": "{}"}
        finally:
            # Clean up
            if run_id in _event_queues:
                try:
                    _event_queues[run_id].remove(queue)
                except ValueError:
                    pass
                if not _event_queues[run_id]:
                    del _event_queues[run_id]

    return EventSourceResponse(event_generator())


@router.post("/runs/{run_id}/cancel")
def cancel_run(
    run_id: str,
    user: TokenData = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(get_db),
):
    """Cancel a running analysis."""
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(404, "Run not found")
    if run.status not in ("pending", "running"):
        raise HTTPException(400, "Run is not active")
    
    run.status = "cancelled"
    job = db.query(Job).filter(Job.run_id == run_id).first()
    if job:
        job.status = "CANCELLED"
    db.commit()
    
    _emit_to_queues(run_id, {"stage": "cancelled", "data": {}, "progress": 0})
    
    return envelope(data={"status": "cancelled"})
