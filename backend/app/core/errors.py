"""Error taxonomy — user-fixable vs system errors with human-friendly messages."""
from __future__ import annotations

from fastapi import HTTPException, status


class MuleTraceError(Exception):
    """Base application error."""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class ValidationError(MuleTraceError):
    """User-fixable validation error."""
    def __init__(self, message: str, code: str = "VALIDATION_ERROR"):
        super().__init__(message, code, status_code=422)


class NotFoundError(MuleTraceError):
    """Resource not found."""
    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            f"{resource} '{resource_id}' not found",
            code="NOT_FOUND",
            status_code=404,
        )


class ConflictError(MuleTraceError):
    """Duplicate or conflicting operation."""
    def __init__(self, message: str):
        super().__init__(message, code="CONFLICT", status_code=409)


class ForbiddenError(MuleTraceError):
    """Operation not allowed for this role."""
    def __init__(self, message: str = "You don't have permission for this action"):
        super().__init__(message, code="FORBIDDEN", status_code=403)


class FileTooLargeError(ValidationError):
    """Upload exceeds size limit."""
    def __init__(self, max_mb: int):
        super().__init__(
            f"File exceeds the maximum size of {max_mb} MB. Try splitting it.",
            code="FILE_TOO_LARGE",
        )


class InvalidCSVError(ValidationError):
    """CSV parsing or schema issue."""
    def __init__(self, message: str):
        super().__init__(message, code="INVALID_CSV")


class DetectorError(MuleTraceError):
    """Detection engine internal error."""
    def __init__(self, detector: str, message: str):
        super().__init__(
            f"Detector '{detector}' failed: {message}",
            code="DETECTOR_ERROR",
            status_code=500,
        )


class JobNotFoundError(NotFoundError):
    """Background job not found."""
    def __init__(self, job_id: str):
        super().__init__("Job", job_id)


class RunNotFoundError(NotFoundError):
    """Run not found."""
    def __init__(self, run_id: str):
        super().__init__("Run", run_id)


def to_http_exception(err: MuleTraceError) -> HTTPException:
    """Convert a MuleTraceError to a FastAPI HTTPException."""
    return HTTPException(
        status_code=err.status_code,
        detail={"code": err.code, "message": err.message},
    )
