import uuid
from typing import Any, Dict

from app.services.omnichannel.providers.base import ChannelProvider
from app.services.omnichannel.providers.provider_utils import DELIVERY_DELIVERED, delivery_result


class InternalMessagingProvider(ChannelProvider):
    channel_name = "Internal Messaging"

    def create_thread(self, participant: Dict[str, Any]) -> str:
        user_key = participant.get("internal_user_id") or participant.get("email") or participant.get("name")
        if user_key:
            return f"internal:{user_key}"
        return f"internal:{uuid.uuid4().hex[:12]}"

    def send_message(self, thread_id: str, content: str) -> Dict[str, Any]:
        return delivery_result(
            self.channel_name,
            thread_id,
            DELIVERY_DELIVERED,
            message_preview=content,
        )

    def receive_message(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        thread_id = payload.get("thread_id")
        if not thread_id and payload.get("internal_user_id"):
            thread_id = f"internal:{payload['internal_user_id']}"
        return {
            "thread_id": thread_id,
            "sender_name": payload.get("sender_name", "Internal User"),
            "sender_email": payload.get("sender_email"),
            "content": payload.get("content", ""),
            "internal_user_id": payload.get("internal_user_id"),
        }
