from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    APP_NAME: str = "AI Enterprise Platform"

    DATABASE_URL: str

    SECRET_KEY: str

    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REDIS_URL: str | None = None
    GROQ_API_KEY: str | None = None
    GROQ_API_URL: str | None = "https://api.groq.com/v1"
    GROQ_MODEL_NAME: str = "llama-3.3-70b-versatile"
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    EMBEDDING_BATCH_SIZE: int = 64
    STORAGE_ROOT: str | None = None

    class Config:
        env_file = ".env"


settings = Settings()
