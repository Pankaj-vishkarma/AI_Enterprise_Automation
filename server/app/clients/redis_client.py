import redis
from app.core.config import settings

_client = None


def get_redis():
    global _client
    if _client is None:
        if not settings.REDIS_URL:
            return None
        _client = redis.Redis.from_url(settings.REDIS_URL)
    return _client
