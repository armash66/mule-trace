"""FastAPI entry point for MuleTrace."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import api_router, api_v1_router
from .api.simulate import reset_demo
from .core.config import get_settings
from .db import SessionLocal, init_db
from .models import Run
from .pipeline import pipeline_state

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("muletrace")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context: initialize database tables and auto-seed demo data if empty."""
    logger.info("Initializing MuleTrace database...")
    init_db()

    # Auto-seed demo dataset on fresh startup or restore in-memory graph
    db = SessionLocal()
    try:
        run_count = db.query(Run).count()
        if run_count == 0 or pipeline_state.graph is None:
            logger.info("Initializing in-memory demo pipeline graph...")
            try:
                reset_demo(db)
                logger.info("Demo dataset successfully loaded!")
            except Exception as e:
                logger.warning("Could not auto-load demo data: %s", e)
    finally:
        db.close()

    yield
    logger.info("Shutting down MuleTrace backend...")


app = FastAPI(
    title="MuleTrace API",
    description="High-precision graph and ML detection engine for money-mule networks in India.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend dev server and production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount primary /api/v1 router and legacy /api router
app.include_router(api_v1_router)
app.include_router(api_router)


@app.get("/health")
@app.get("/api/v1/health")
def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "MuleTrace"}



@app.get("/")
def root() -> dict[str, str]:
    """Root endpoint."""
    return {
        "name": "MuleTrace Engine",
        "version": "1.0.0",
        "docs": "/docs",
        "api_v1": "/api/v1",
        "api": "/api",
    }
