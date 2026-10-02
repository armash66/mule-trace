"""MuleTrace API — FastAPI application entry point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.data import router as data_router
from app.api.ingest import router as ingest_router
from app.api.workflow import health_router, router as workflow_router
from app.core.config import get_settings
from app.core.database import init_db
from app.core.middleware import setup_middleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    logger.info("Starting MuleTrace API...")
    init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down MuleTrace API")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="MuleTrace API",
        description="Fraud investigation platform — detect money-mule networks, explain every flag, trace stolen funds",
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-Id", "X-Response-Time-Ms", "ETag"],
    )

    # Custom middleware
    setup_middleware(app)

    # Routes
    api_prefix = "/api/v1"
    app.include_router(auth_router, prefix=api_prefix)
    app.include_router(ingest_router, prefix=api_prefix)
    app.include_router(data_router, prefix=api_prefix)
    app.include_router(workflow_router, prefix=api_prefix)
    app.include_router(health_router, prefix=api_prefix)

    return app


app = create_app()
