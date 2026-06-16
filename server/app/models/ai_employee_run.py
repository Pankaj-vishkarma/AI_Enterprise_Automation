from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class AIEmployeeRun(Base):
    __tablename__ = "ai_employee_runs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("ai_employees.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task = Column(Text, nullable=False)
    output = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="completed", index=True)
    tools_used_json = Column(Text, nullable=False, default="[]")
    execution_time_ms = Column(Integer, nullable=True)
    token_usage_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization")
    employee = relationship("AIEmployee", back_populates="runs")
    user = relationship("User")
