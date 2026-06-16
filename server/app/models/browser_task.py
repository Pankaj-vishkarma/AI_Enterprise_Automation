from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class BrowserTask(Base):
    __tablename__ = "browser_tasks"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    instruction = Column(Text, nullable=False)
    task_type = Column(String(100), nullable=False, default="general")
    target_url = Column(String(500), nullable=True)
    status = Column(String(50), nullable=False, default="completed", index=True)
    results_json = Column(Text, nullable=False, default="[]")
    logs_json = Column(Text, nullable=False, default="[]")
    errors_json = Column(Text, nullable=False, default="[]")
    pages_visited_json = Column(Text, nullable=False, default="[]")
    summary = Column(Text, nullable=True)
    report_text = Column(Text, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization")
    created_by_user = relationship("User")
