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
from app.api.v1.operations import router as operations_router
from app.api.v1.ai_employees import router as ai_employees_router
from app.api.v1.collaboration import router as collaboration_router
from app.api.v1.workflows import router as workflows_router
from app.api.v1.research import router as research_router
from app.api.v1.browser import router as browser_router
from app.api.v1.voice import router as voice_router
from app.api.v1.support import router as support_router
from app.api.v1.omnichannel import router as omnichannel_router
from app.api.v1.omnichannel_webhooks import router as omnichannel_webhooks_router
from app.api.v1.analytics import router as analytics_router
from app.clients.redis_client import get_redis

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(settings.APP_NAME)


def create_app() -> FastAPI:

    app = FastAPI(title=settings.APP_NAME)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
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
    app.include_router(research_router)
    app.include_router(browser_router)
    app.include_router(ai_employees_router)
    app.include_router(collaboration_router)
    app.include_router(workflows_router)
    app.include_router(operations_router)
    app.include_router(voice_router)
    app.include_router(support_router)
    app.include_router(omnichannel_router)
    app.include_router(omnichannel_webhooks_router)
    app.include_router(analytics_router)

    @app.on_event("startup")
    def on_startup():
        logger.info("Starting app and creating DB tables if they do not exist")

        Base.metadata.create_all(bind=engine)

        try:
            from app.core.database import SessionLocal
            from app.services.rbac_service import RbacService

            db = SessionLocal()
            try:
                RbacService(db).ensure_rbac_defaults()
                logger.info("RBAC defaults synchronized")
            finally:
                db.close()
        except Exception:
            logger.exception("Failed to synchronize RBAC defaults")

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
