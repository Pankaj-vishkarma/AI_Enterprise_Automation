import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.departments import router as departments_router
from app.api.v1.teams import router as teams_router
from app.api.v1.roles import router as roles_router
from app.api.v1.permissions import router as permissions_router
from app.api.v1.knowledge import router as knowledge_router
from app.api.v1.knowledge_uploads import router as knowledge_uploads_router
from app.api.v1.conversations import router as conversations_router
from app.clients.redis_client import get_redis

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(settings.APP_NAME)


def create_app() -> FastAPI:

    app = FastAPI(title=settings.APP_NAME)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router)
    app.include_router(users_router)
    app.include_router(departments_router)
    app.include_router(teams_router)
    app.include_router(roles_router)
    app.include_router(permissions_router)
    app.include_router(knowledge_router)
    app.include_router(knowledge_uploads_router)
    app.include_router(conversations_router)

    @app.on_event("startup")
    def on_startup():
        logger.info("Starting app and creating DB tables if they do not exist")

        Base.metadata.create_all(bind=engine)
        # initialize redis if configured
        try:
            _ = get_redis()
            logger.info("Redis client initialized")
        except Exception:
            logger.info("Redis not configured or failed to initialize")

            # start embedding worker
        try:
            from tasks.embedding_worker import start_background_worker

            start_background_worker()
        except Exception:
            logger.info("Embedding worker not started")

    return app


app = create_app()
