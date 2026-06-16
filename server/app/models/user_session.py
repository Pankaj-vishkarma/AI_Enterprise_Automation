from sqlalchemy import Column, Integer, String, ForeignKey, DateTime

from sqlalchemy.sql import func

from app.core.database import Base


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    refresh_token = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
