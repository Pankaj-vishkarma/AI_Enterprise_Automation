import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)


def _error_payload(code: str, message: str, details=None) -> dict:
    payload = {
        "success": False,
        "message": message,
        "code": code,
    }
    if details is not None:
        payload["details"] = details
    return payload


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        detail = exc.detail
        if isinstance(detail, dict):
            message = detail.get("message") or str(detail)
            details = detail
        elif isinstance(detail, list):
            message = "Request failed"
            details = detail
        else:
            message = str(detail)
            details = None
        code = f"HTTP_{exc.status_code}"
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(code, message, details),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_payload(
                "VALIDATION_ERROR",
                "Validation failed",
                exc.errors(),
            ),
        )

    @app.exception_handler(PermissionError)
    async def permission_exception_handler(request: Request, exc: PermissionError):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content=_error_payload("PERMISSION_DENIED", str(exc)),
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_exception_handler(request: Request, exc: SQLAlchemyError):
        logger.exception("Database error on %s", request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_payload("DATABASE_ERROR", "A database error occurred"),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s", request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_payload("INTERNAL_ERROR", "An unexpected error occurred"),
        )
