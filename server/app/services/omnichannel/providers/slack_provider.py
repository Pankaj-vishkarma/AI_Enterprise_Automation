import json
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
    verify_slack_signature,
)

logger = logging.getLogger(__name__)


class SlackProvider(ChannelProvider):
    channel_name = "Slack"

    def is_configured(self) -> bool:
        return is_token_configured(settings.SLACK_BOT_TOKEN)

    @staticmethod
    def _thread_from_participant(participant: Dict[str, Any]) -> Optional[str]:
        channel_id = participant.get("slack_channel_id")
        user_id = participant.get("slack_user_id")
        email = participant.get("email") or ""
        if channel_id:
            return f"slack:{channel_id}"
        if user_id:
            return f"slack:dm:{user_id}"
        if email.startswith("slack:channel:"):
            return f"slack:{email.rsplit(':', 1)[-1]}"
        if email.startswith("slack:user:"):
            return f"slack:dm:{email.rsplit(':', 1)[-1]}"
        return None

    def create_thread(self, participant: Dict[str, Any]) -> str:
        resolved = self._thread_from_participant(participant)
        if resolved:
            return resolved
        if not self.is_configured():
            log_provider_warning(self.channel_name, "SLACK_BOT_TOKEN not configured; using pending thread")
        return pending_thread("slack")

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {settings.SLACK_BOT_TOKEN}",
            "Content-Type": "application/json; charset=utf-8",
        }

    def _resolve_channel_id(self, thread_id: str) -> Optional[str]:
        if thread_id.startswith("slack:dm:"):
            user_id = thread_id.split(":", 2)[2]
            if not self.is_configured():
                return None
            try:
                response = requests.post(
                    f"{settings.SLACK_API_URL}/conversations.open",
                    headers=self._headers(),
                    json={"users": user_id},
                    timeout=settings.HTTP_CLIENT_TIMEOUT_SECONDS,
                )
                data = response.json()
                if data.get("ok"):
                    return data.get("channel", {}).get("id")
                log_provider_warning(self.channel_name, f"conversations.open failed: {data.get('error')}")
            except Exception as exc:
                log_provider_warning(self.channel_name, f"conversations.open error: {exc}")
            return None
        if thread_id.startswith("slack:") and ":pending:" not in thread_id:
            return thread_id.split(":", 1)[1]
        return None

    def send_message(self, thread_id: str, content: str) -> Dict[str, Any]:
        if ":pending:" in thread_id or not self.is_configured():
            if not self.is_configured():
                log_provider_warning(self.channel_name, "SLACK_BOT_TOKEN missing; outbound message pending")
            return delivery_result(self.channel_name, thread_id, DELIVERY_PENDING, message_preview=content)

        channel_id = self._resolve_channel_id(thread_id)
        if not channel_id:
            return delivery_result(
                self.channel_name,
                thread_id,
                DELIVERY_FAILED,
                message_preview=content,
                error="Unable to resolve Slack channel for thread",
            )

        try:
            response = requests.post(
                f"{settings.SLACK_API_URL}/chat.postMessage",
                headers=self._headers(),
                json={"channel": channel_id, "text": content},
                timeout=settings.HTTP_CLIENT_TIMEOUT_SECONDS,
            )
            data = response.json()
            if data.get("ok"):
                return delivery_result(
                    self.channel_name,
                    thread_id,
                    DELIVERY_DELIVERED,
                    message_preview=content,
                    external_message_id=data.get("ts"),
                    slack_channel_id=channel_id,
                )
            error = data.get("error", "unknown_error")
            log_provider_warning(self.channel_name, f"chat.postMessage failed: {error}")
            return delivery_result(
                self.channel_name,
                thread_id,
                DELIVERY_FAILED,
                message_preview=content,
                error=error,
            )
        except Exception as exc:
            log_provider_warning(self.channel_name, f"chat.postMessage error: {exc}")
            return delivery_result(
                self.channel_name,
                thread_id,
                DELIVERY_FAILED,
                message_preview=content,
                error=str(exc),
            )

    def receive_message(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if payload.get("slack_event"):
            return self._normalize_slack_event(payload["slack_event"])
        if payload.get("event"):
            return self._normalize_slack_event(payload)
        return {
            "thread_id": payload.get("thread_id"),
            "sender_name": payload.get("sender_name", "Unknown"),
            "sender_email": payload.get("sender_email"),
            "content": payload.get("content", ""),
            "slack_user_id": payload.get("slack_user_id"),
            "slack_channel_id": payload.get("slack_channel_id"),
        }

    def _normalize_slack_event(self, event_wrapper: Dict[str, Any]) -> Dict[str, Any]:
        event = event_wrapper.get("event", event_wrapper)
        channel_id = event.get("channel", "")
        user_id = event.get("user", "unknown")
        text = event.get("text", "")
        thread_id = f"slack:{channel_id}" if channel_id else None
        user_name = event.get("user_profile", {}).get("real_name") or f"Slack User {user_id}"
        sender_email = f"slack:channel:{channel_id}" if channel_id else f"slack:user:{user_id}"
        return {
            "thread_id": thread_id,
            "sender_name": user_name,
            "sender_email": sender_email,
            "content": text,
            "slack_user_id": user_id,
            "slack_channel_id": channel_id,
        }

    def verify_webhook(self, headers: Dict[str, str], body: bytes) -> bool:
        if not is_token_configured(settings.SLACK_SIGNING_SECRET):
            log_provider_warning(self.channel_name, "SLACK_SIGNING_SECRET not configured; skipping verification")
            return True
        signature = headers.get("x-slack-signature", "")
        timestamp = headers.get("x-slack-request-timestamp", "")
        return verify_slack_signature(settings.SLACK_SIGNING_SECRET, timestamp, body, signature)

    def parse_webhook(self, body: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if body.get("type") == "url_verification":
            return {"challenge": body.get("challenge")}
        if body.get("type") != "event_callback":
            return None
        event = body.get("event", {})
        if event.get("subtype") or event.get("bot_id"):
            return None
        if event.get("type") not in {"message", "app_mention"}:
            return None
        normalized = self._normalize_slack_event(body)
        normalized["channel"] = self.channel_name
        return normalized
