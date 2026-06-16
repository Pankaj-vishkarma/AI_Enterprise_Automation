from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ResearchReport(Base):
    __tablename__ = "research_reports"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    research_type = Column(String(100), nullable=False, default="Business Intelligence")
    request_text = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="completed", index=True)
    sources_json = Column(Text, nullable=False, default="[]")
    intermediate_findings_json = Column(Text, nullable=False, default="[]")
    citations_json = Column(Text, nullable=False, default="[]")
    final_report = Column(Text, nullable=False, default="")
    summary = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    agent_usage_json = Column(Text, nullable=False, default="[]")
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization")
    created_by_user = relationship("User")
