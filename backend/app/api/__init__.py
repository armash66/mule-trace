"""MuleTrace REST API package.

Combines modular routers for runs, accounts, rings, reports, stats, and simulation.
Supports both `/api/v1` and legacy `/api` prefixes for seamless client integration.
"""

from __future__ import annotations

from fastapi import APIRouter

from .accounts import get_account_network, router as accounts_router
from .auth import router as auth_router
from .reports import router as reports_router
from .rings import router as rings_router
from .runs import ingest_dataset, router as runs_router
from .simulate import router as simulate_router
from .stats import router as stats_router
from .uploads import router as uploads_router

# Primary v1 API Router
api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth_router)
api_v1_router.include_router(runs_router)
api_v1_router.include_router(uploads_router)
api_v1_router.include_router(accounts_router)
api_v1_router.include_router(rings_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(stats_router)
api_v1_router.include_router(simulate_router)
api_v1_router.add_api_route("/graph/{account_id}", get_account_network, methods=["GET"])
api_v1_router.add_api_route("/upload", ingest_dataset, methods=["POST"])

# Legacy /api compatibility router
api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(runs_router)
api_router.include_router(uploads_router)
api_router.include_router(accounts_router)
api_router.include_router(rings_router)
api_router.include_router(reports_router)
api_router.include_router(stats_router)
api_router.include_router(simulate_router)
api_router.add_api_route("/graph/{account_id}", get_account_network, methods=["GET"])
api_router.add_api_route("/upload", ingest_dataset, methods=["POST"])

# Default export
router = api_router


__all__ = ["api_router", "api_v1_router", "router"]
