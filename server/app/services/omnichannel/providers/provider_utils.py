import hashlib
import hmac
import logging
import time
import uuid
from typing import Any, Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

DELIVERY_DELIVERED = "delivered"
DELIVERY_FAILED = "failed"
DELIVERY_PENDING = "pending"


def is_token_configured(token: Optional[str]) -> bool:
    if not token:
        return False
    normalized = token.strip()
    if not normalized:
        return False
    if normalized.startswith("dummy_"):
        return False
    return True


def log_provider_warning(channel: str, message: str) -> None:
    logger.warning("[%s provider] %s", channel, message)


def delivery_result(
    channel: str,
    thread_id: str,
    status: str,
    *,
    message_preview: str = "",
    error: Optional[str] = None,
    external_message_id: Optional[str] = None,
    **extra: Any,
) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "thread_id": thread_id,
        "channel": channel,
        "status": status,
        "message_preview": (message_preview or "")[:120],
    }
    if error:
        result["error"] = error
    if external_message_id:
        result["external_message_id"] = external_message_id
    result.update(extra)
    return result


def pending_thread(prefix: str) -> str:
    return f"{prefix}:pending:{uuid.uuid4().hex[:12]}"


def verify_slack_signature(signing_secret: str, timestamp: str, body: bytes, signature: str) -> bool:
    if not signing_secret or signing_secret.startswith("dummy_"):
        return False
    if not timestamp or not signature:
        return False
    try:
        if abs(time.time() - int(timestamp)) > 60 * 5:
            return False
    except (TypeError, ValueError):
        return False
    base = f"v0:{timestamp}:{body.decode('utf-8')}"
    digest = hmac.new(
        signing_secret.encode("utf-8"),
        base.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    expected = f"v0={digest}"
    return hmac.compare_digest(expected, signature)


def verify_telegram_secret(header_value: Optional[str]) -> bool:
    expected = settings.TELEGRAM_WEBHOOK_SECRET
    if not is_token_configured(expected):
        return True
    return hmac.compare_digest(header_value or "", expected)
