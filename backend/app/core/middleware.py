"""Middleware: request IDs, idempotency, ETag, error handling, structured logging."""
from __future__ import annotations

import hashlib
import json
import time
import uuid
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.errors import MuleTraceError


def envelope(data: Any = None, error: Any = None, meta: dict | None = None) -> dict:
    """Standard API response envelope."""
    return {"data": data, "error": error, "meta": meta}


def error_envelope(code: str, message: str, meta: dict | None = None) -> dict:
    """Error response envelope."""
    return envelope(error={"code": code, "message": message}, meta=meta)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Add X-Request-Id to every request/response."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
        request.state.request_id = request_id

        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        response.headers["X-Request-Id"] = request_id
        response.headers["X-Response-Time-Ms"] = str(elapsed_ms)
        return response


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Catch MuleTraceError and return proper envelopes."""

    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except MuleTraceError as e:
            return JSONResponse(
                status_code=e.status_code,
                content=error_envelope(e.code, e.message),
            )
        except Exception as e:
            return JSONResponse(
                status_code=500,
                content=error_envelope("INTERNAL_ERROR", "An unexpected error occurred. Please try again."),
            )


# In-memory idempotency store (replace with Redis in production)
_idempotency_store: dict[str, dict] = {}


class IdempotencyMiddleware(BaseHTTPMiddleware):
    """Handle Idempotency-Key on POST requests."""

    async def dispatch(self, request: Request, call_next):
        if request.method == "POST":
            idem_key = request.headers.get("Idempotency-Key")
            if idem_key:
                cached = _idempotency_store.get(idem_key)
                if cached:
                    return JSONResponse(
                        status_code=cached["status_code"],
                        content=cached["body"],
                        headers={"X-Idempotency-Replay": "true"},
                    )

        response = await call_next(request)

        # Cache POST responses with idempotency key
        if request.method == "POST":
            idem_key = request.headers.get("Idempotency-Key")
            if idem_key and 200 <= response.status_code < 300:
                body = b""
                async for chunk in response.body_iterator:
                    body += chunk if isinstance(chunk, bytes) else chunk.encode()
                try:
                    body_json = json.loads(body)
                except json.JSONDecodeError:
                    body_json = body.decode()
                _idempotency_store[idem_key] = {
                    "status_code": response.status_code,
                    "body": body_json,
                }
                # Limit store size
                if len(_idempotency_store) > 10000:
                    oldest = next(iter(_idempotency_store))
                    del _idempotency_store[oldest]
                return JSONResponse(
                    status_code=response.status_code,
                    content=body_json,
                    headers=dict(response.headers),
                )

        return response


def compute_etag(data: Any) -> str:
    """Compute ETag from response data."""
    raw = json.dumps(data, sort_keys=True, default=str)
    return f'W/"{hashlib.md5(raw.encode()).hexdigest()}"'


def setup_middleware(app: FastAPI) -> None:
    """Register all middleware."""
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(ErrorHandlerMiddleware)
    app.add_middleware(IdempotencyMiddleware)
