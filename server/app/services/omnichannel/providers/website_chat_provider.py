import uuid
from typing import Any, Dict

from app.services.omnichannel.providers.base import ChannelProvider
from app.services.omnichannel.providers.provider_utils import (
    DELIVERY_DELIVERED,
    DELIVERY_PENDING,
    delivery_result,
)


class WebsiteChatProvider(ChannelProvider):
    """Website chat uses platform session ids for inbound/outbound mapping."""

    channel_name = "Website Chat"

    def create_thread(self, participant: Dict[str, Any]) -> str:
        session_id = participant.get("session_id") or participant.get("website_session_id")
        if session_id:
            return f"web:{session_id}"
        return f"web:{uuid.uuid4().hex}"

    def send_message(self, thread_id: str, content: str) -> Dict[str, Any]:
        # Outbound website chat is delivered to the embedded session via platform APIs.
        status = DELIVERY_DELIVERED if thread_id.startswith("web:") else DELIVERY_PENDING
        return delivery_result(
            self.channel_name,
            thread_id,
            status,
            message_preview=content,
            session_id=thread_id.replace("web:", "", 1),
        )

    def receive_message(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        session_id = payload.get("session_id") or payload.get("website_session_id")
        thread_id = payload.get("thread_id")
        if not thread_id and session_id:
            thread_id = f"web:{session_id}"
        return {
            "thread_id": thread_id,
            "sender_name": payload.get("sender_name", "Website Visitor"),
            "sender_email": payload.get("sender_email"),
            "content": payload.get("content", ""),
            "session_id": session_id or (thread_id.replace("web:", "", 1) if thread_id else None),
        }
