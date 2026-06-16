from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class CollaborationRun(Base):
    __tablename__ = "collaboration_runs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    team_id = Column(Integer, ForeignKey("collaboration_teams.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="completed", index=True)
    final_output = Column(Text, nullable=False, default="")
    intermediate_outputs_json = Column(Text, nullable=False, default="[]")
    participating_agents_json = Column(Text, nullable=False, default="[]")
    failure_info_json = Column(Text, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    token_usage_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization")
    team = relationship("CollaborationTeam", back_populates="runs")
    user = relationship("User")
