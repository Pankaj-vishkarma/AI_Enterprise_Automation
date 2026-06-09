import logging

from fastapi import FastAPI

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(settings.APP_NAME)


def create_app() -> FastAPI:

    app = FastAPI(title=settings.APP_NAME)

    app.include_router(auth_router)
    app.include_router(users_router)

    @app.on_event("startup")
    def on_startup():
        logger.info("Starting app and creating DB tables if they do not exist")

        Base.metadata.create_all(bind=engine)

    return app


app = create_app()
