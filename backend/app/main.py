"""FastAPI entry point for MuleTrace."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import load_demo_data, router as api_router
from .db import SessionLocal, init_db
from .models import Run

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

    # Auto-seed demo dataset on fresh startup if available
    db = SessionLocal()
    try:
        run_count = db.query(Run).count()
        if run_count == 0:
            logger.info("Fresh database detected — auto-loading demo dataset...")
            try:
                load_demo_data(db)
                logger.info("Demo dataset successfully loaded!")
            except Exception as e:
                logger.warning("Could not auto-load demo data: %s", e)
    finally:
        db.close()

    yield
    logger.info("Shutting down MuleTrace backend...")


app = FastAPI(
    title="MuleTrace API",
    description="High-precision graph and ML detection engine for money-mule networks.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend dev server and production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
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
        "api": "/api",
    }
