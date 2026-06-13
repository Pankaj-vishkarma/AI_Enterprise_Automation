import logging

from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.clients.redis_client import get_redis
from app.core.config import settings
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


def _check_database() -> dict:
    db: Session = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:
        logger.exception("Database health check failed")
        return {"status": "error", "message": str(exc)}
    finally:
        db.close()


def _check_redis() -> dict:
    if not settings.REDIS_URL:
        return {"status": "skipped", "message": "Redis not configured"}
    try:
        client = get_redis()
        if client is None:
            return {"status": "skipped", "message": "Redis not configured"}
        client.ping()
        return {"status": "ok"}
    except Exception as exc:
        logger.exception("Redis health check failed")
        return {"status": "error", "message": str(exc)}


@router.get("/health")
def health():
    return {
        "success": True,
        "status": "ok",
        "service": settings.APP_NAME,
        "checks": {
            "database": _check_database(),
            "redis": _check_redis(),
        },
    }


@router.get("/ready")
def ready():
    db_check = _check_database()
    redis_check = _check_redis()
    redis_ok = redis_check["status"] in {"ok", "skipped"}
    ready_status = db_check["status"] == "ok" and redis_ok
    return {
        "success": ready_status,
        "status": "ready" if ready_status else "not_ready",
        "service": settings.APP_NAME,
        "checks": {
            "database": db_check,
            "redis": redis_check,
        },
    }
