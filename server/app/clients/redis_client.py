import logging
import re
from typing import Literal, Optional
from urllib.parse import urlparse

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)

RedisStatus = Literal["disabled", "enabled", "connection_failed"]

_CLIENT: Optional[redis.Redis] = None
_INIT_ATTEMPTED = False
_STATUS: RedisStatus = "disabled"

_REDIS_URL_PATTERN = re.compile(r"(rediss?://\S+)", re.IGNORECASE)
_NULL_LIKE = frozenset({"none", "null", "false", "disabled", "off", "0", "no"})


def _normalize_redis_url(raw: str | None) -> str | None:
    if raw is None:
        return None
    value = raw.strip()
    if not value or value.lower() in _NULL_LIKE:
        return None
    if value.lower().startswith(("redis://", "rediss://", "unix://")):
        return value
    embedded = _REDIS_URL_PATTERN.search(value)
    if embedded:
        return embedded.group(1)
    return None


def _is_valid_redis_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    return parsed.scheme in {"redis", "rediss", "unix"}


def _mask_redis_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        host = parsed.hostname or "unknown"
        port = f":{parsed.port}" if parsed.port else ""
        return f"{parsed.scheme}://***@{host}{port}"
    except Exception:
        return "<redacted>"


def redis_url_configured() -> bool:
    return _normalize_redis_url(settings.REDIS_URL) is not None


def get_redis_status() -> RedisStatus:
    if not _INIT_ATTEMPTED:
        get_redis()
    return _STATUS


def get_redis() -> Optional[redis.Redis]:
    global _CLIENT, _INIT_ATTEMPTED, _STATUS

    if _INIT_ATTEMPTED:
        return _CLIENT

    _INIT_ATTEMPTED = True
    normalized = _normalize_redis_url(settings.REDIS_URL)

    if not normalized:
        if settings.REDIS_URL and str(settings.REDIS_URL).strip():
            logger.warning(
                "Redis disabled: REDIS_URL is set but not a valid redis://, rediss://, or unix:// URL"
            )
        else:
            logger.info("Redis disabled: REDIS_URL is not configured")
        _STATUS = "disabled"
        _CLIENT = None
        return None

    if not _is_valid_redis_url(normalized):
        logger.warning("Redis disabled: REDIS_URL has an unsupported scheme")
        _STATUS = "disabled"
        _CLIENT = None
        return None

    try:
        client = redis.Redis.from_url(normalized)
        client.ping()
    except ValueError as exc:
        logger.warning("Redis disabled: invalid REDIS_URL (%s)", exc)
        _STATUS = "disabled"
        _CLIENT = None
        return None
    except Exception as exc:
        logger.warning(
            "Redis connection failed for %s (%s)",
            _mask_redis_url(normalized),
            exc,
        )
        _STATUS = "connection_failed"
        _CLIENT = None
        return None

    _CLIENT = client
    _STATUS = "enabled"
    logger.info("Redis enabled (%s)", _mask_redis_url(normalized))
    return _CLIENT
