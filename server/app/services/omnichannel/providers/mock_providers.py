"""
Legacy mock providers — superseded by channel-specific implementations.
Kept for reference and local testing only; not registered in provider_registry.
"""

import uuid
from typing import Any, Dict

from app.services.omnichannel.providers.base import ChannelProvider
from app.services.omnichannel.providers.provider_utils import DELIVERY_DELIVERED, delivery_result


class MockChannelProvider(ChannelProvider):
    def __init__(self, channel_name: str, prefix: str):
        self.channel_name = channel_name
        self.prefix = prefix

    def create_thread(self, participant: Dict[str, Any]) -> str:
        return f"{self.prefix}-{uuid.uuid4().hex[:12]}"

    def send_message(self, thread_id: str, content: str) -> Dict[str, Any]:
        return delivery_result(
            self.channel_name,
            thread_id,
            DELIVERY_DELIVERED,
            message_preview=content,
        )


class MockWebsiteChatProvider(MockChannelProvider):
    def __init__(self):
        super().__init__("Website Chat", "web")


class MockTelegramProvider(MockChannelProvider):
    def __init__(self):
        super().__init__("Telegram", "tg")


class MockSlackProvider(MockChannelProvider):
    def __init__(self):
        super().__init__("Slack", "slack")


class MockInternalMessagingProvider(MockChannelProvider):
    def __init__(self):
        super().__init__("Internal Messaging", "internal")
