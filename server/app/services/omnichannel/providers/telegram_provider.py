import logging
from typing import Any, Dict, Optional

import requests

from app.core.config import settings
from app.services.omnichannel.providers.base import ChannelProvider
from app.services.omnichannel.providers.provider_utils import (
    DELIVERY_DELIVERED,
    DELIVERY_FAILED,
    DELIVERY_PENDING,
    delivery_result,
    is_token_configured,
    log_provider_warning,
    pending_thread,
    verify_telegram_secret,
)

logger = logging.getLogger(__name__)


class TelegramProvider(ChannelProvider):
    channel_name = "Telegram"

    def is_configured(self) -> bool:
        return is_token_configured(settings.TELEGRAM_BOT_TOKEN)

    def _api_base(self) -> str:
        return f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"

    @staticmethod
    def _thread_from_participant(participant: Dict[str, Any]) -> Optional[str]:
        chat_id = participant.get("telegram_chat_id")
        if chat_id is not None:
            return f"tg:{chat_id}"
        email = participant.get("email") or ""
        if email.startswith("telegram:chat_id:"):
            return f"tg:{email.rsplit(':', 1)[-1]}"
        return None

    def create_thread(self, participant: Dict[str, Any]) -> str:
        resolved = self._thread_from_participant(participant)
        if resolved:
            return resolved
        if not self.is_configured():
            log_provider_warning(self.channel_name, "TELEGRAM_BOT_TOKEN not configured; using pending thread")
        return pending_thread("tg")

    def send_message(self, thread_id: str, content: str) -> Dict[str, Any]:
        if ":pending:" in thread_id or not self.is_configured():
            if not self.is_configured():
                log_provider_warning(self.channel_name, "TELEGRAM_BOT_TOKEN missing; outbound message pending")
            return delivery_result(self.channel_name, thread_id, DELIVERY_PENDING, message_preview=content)

        chat_id = self._chat_id_from_thread(thread_id)
        if chat_id is None:
            return delivery_result(
                self.channel_name,
                thread_id,
                DELIVERY_FAILED,
                message_preview=content,
                error="Unable to resolve Telegram chat id for thread",
            )

        try:
            response = requests.post(
                f"{self._api_base()}/sendMessage",
                json={"chat_id": chat_id, "text": content},
                timeout=settings.HTTP_CLIENT_TIMEOUT_SECONDS,
            )
            data = response.json()
            if data.get("ok"):
                message_id = data.get("result", {}).get("message_id")
                return delivery_result(
                    self.channel_name,
                    thread_id,
                    DELIVERY_DELIVERED,
                    message_preview=content,
                    external_message_id=str(message_id) if message_id is not None else None,
                    telegram_chat_id=chat_id,
                )
            error = data.get("description", "unknown_error")
            log_provider_warning(self.channel_name, f"sendMessage failed: {error}")
            return delivery_result(
                self.channel_name,
                thread_id,
                DELIVERY_FAILED,
                message_preview=content,
                error=error,
            )
        except Exception as exc:
            log_provider_warning(self.channel_name, f"sendMessage error: {exc}")
            return delivery_result(
                self.channel_name,
                thread_id,
                DELIVERY_FAILED,
                message_preview=content,
                error=str(exc),
            )

    @staticmethod
    def _chat_id_from_thread(thread_id: str) -> Optional[str]:
        if thread_id.startswith("tg:") and ":pending:" not in thread_id:
            return thread_id.split(":", 1)[1]
        return None

    def receive_message(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if payload.get("telegram_update"):
            return self._normalize_update(payload["telegram_update"])
        if "message" in payload or "edited_message" in payload:
            return self._normalize_update(payload)
        chat_id = payload.get("telegram_chat_id") or payload.get("thread_id", "").replace("tg:", "")
        thread_id = f"tg:{chat_id}" if chat_id else payload.get("thread_id")
        return {
            "thread_id": thread_id,
            "sender_name": payload.get("sender_name", "Unknown"),
            "sender_email": payload.get("sender_email"),
            "content": payload.get("content", ""),
            "telegram_chat_id": chat_id or None,
            "telegram_user_id": payload.get("telegram_user_id"),
        }

    def _normalize_update(self, update: Dict[str, Any]) -> Dict[str, Any]:
        message = update.get("message") or update.get("edited_message") or {}
        chat = message.get("chat", {})
        sender = message.get("from", {})
        chat_id = chat.get("id")
        first = sender.get("first_name", "")
        last = sender.get("last_name", "")
        username = sender.get("username")
        display = f"{first} {last}".strip() or username or f"Telegram User {sender.get('id', 'unknown')}"
        sender_email = f"telegram:chat_id:{chat_id}" if chat_id is not None else None
        return {
            "thread_id": f"tg:{chat_id}" if chat_id is not None else None,
            "sender_name": display,
            "sender_email": sender_email,
            "content": message.get("text", ""),
            "telegram_chat_id": str(chat_id) if chat_id is not None else None,
            "telegram_user_id": str(sender.get("id")) if sender.get("id") is not None else None,
        }

    def verify_webhook(self, headers: Dict[str, str]) -> bool:
        if not is_token_configured(settings.TELEGRAM_WEBHOOK_SECRET):
            log_provider_warning(self.channel_name, "TELEGRAM_WEBHOOK_SECRET not configured; skipping verification")
            return True
        return verify_telegram_secret(headers.get("x-telegram-bot-api-secret-token"))

    def parse_webhook(self, body: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not body:
            return None
        normalized = self._normalize_update(body)
        if not normalized.get("content"):
            return None
        normalized["channel"] = self.channel_name
        return normalized
