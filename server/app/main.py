from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
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
from app.api.v1.organizations import router as organizations_router
from app.clients.redis_client import get_redis
from app.core.config import settings
from app.core.database import engine, Base
from app.core.exception_handlers import register_exception_handlers
from app.core.logging_config import configure_logging

configure_logging()
logger = logging.getLogger(settings.APP_NAME)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.AUTO_CREATE_TABLES:
        logger.warning(
            "AUTO_CREATE_TABLES is enabled — creating tables via create_all. "
            "Use Alembic migrations in production."
        )
        Base.metadata.create_all(bind=engine)
    else:
        logger.info("AUTO_CREATE_TABLES disabled — relying on Alembic migrations")

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

    try:
        _ = get_redis()
        logger.info("Redis client initialized")
    except Exception:
        logger.info("Redis not configured or failed to initialize")

    if settings.START_EMBEDDING_WORKER_IN_API:
        try:
            from tasks.embedding_worker import start_background_worker

            start_background_worker()
        except Exception:
            logger.exception("Failed to start in-process embedding worker")
    else:
        logger.info("Embedding worker not started in API process (use standalone worker)")

    yield


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

    register_exception_handlers(app)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
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
    app.include_router(organizations_router)

    return app


app = create_app()
