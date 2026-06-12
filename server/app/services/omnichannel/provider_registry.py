from app.services.omnichannel.providers.base import ChannelProvider
from app.services.omnichannel.providers.internal_messaging_provider import InternalMessagingProvider
from app.services.omnichannel.providers.slack_provider import SlackProvider
from app.services.omnichannel.providers.telegram_provider import TelegramProvider
from app.services.omnichannel.providers.website_chat_provider import WebsiteChatProvider

OMNICHANNEL_CHANNELS = [
    "Website Chat",
    "Telegram",
    "Slack",
    "Internal Messaging",
]

_PROVIDERS: dict[str, ChannelProvider] = {
    "Website Chat": WebsiteChatProvider(),
    "Telegram": TelegramProvider(),
    "Slack": SlackProvider(),
    "Internal Messaging": InternalMessagingProvider(),
}


def get_provider(channel: str) -> ChannelProvider:
    provider = _PROVIDERS.get(channel)
    if not provider:
        raise ValueError(f"Unsupported channel: {channel}")
    return provider
