from abc import ABC, abstractmethod
from typing import Any, Dict


class ChannelProvider(ABC):
    channel_name: str

    @abstractmethod
    def create_thread(self, participant: Dict[str, Any]) -> str:
        """Create or register an external thread and return thread id."""

    @abstractmethod
    def send_message(self, thread_id: str, content: str) -> Dict[str, Any]:
        """Deliver outbound message. Returns delivery metadata."""

    def receive_message(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize inbound webhook payload into message fields."""
        return {
            "thread_id": payload.get("thread_id"),
            "sender_name": payload.get("sender_name", "Unknown"),
            "sender_email": payload.get("sender_email"),
            "content": payload.get("content", ""),
        }
