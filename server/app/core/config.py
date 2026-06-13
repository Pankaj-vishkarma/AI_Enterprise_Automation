from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    APP_NAME: str = "AI Enterprise Platform"

    DATABASE_URL: str

    SECRET_KEY: str

    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 1

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    REDIS_URL: str | None = None
    GROQ_API_KEY: str | None = None
    GROQ_API_URL: str | None = "https://api.groq.com/v1"
    GROQ_MODEL_NAME: str = "llama-3.3-70b-versatile"
    GROQ_REQUEST_TIMEOUT_SECONDS: int = 30

    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    EMBEDDING_BATCH_SIZE: int = 64
    EMBEDDING_WORKER_BATCH_LIMIT: int = 200
    EMBEDDING_WORKER_POLL_INTERVAL_SECONDS: float = 2.0
    EMBEDDING_WORKER_IDLE_SLEEP_SECONDS: float = 0.5

    STORAGE_ROOT: str = "./uploads"

    HTTP_CLIENT_TIMEOUT_SECONDS: int = 15
    SLACK_API_URL: str = "https://slack.com/api"

    SLACK_BOT_TOKEN: str | None = None
    SLACK_SIGNING_SECRET: str | None = None
    TELEGRAM_BOT_TOKEN: str | None = None
    TELEGRAM_WEBHOOK_SECRET: str | None = None
    OMNICHANNEL_WEBHOOK_ORG_ID: int | None = None

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
