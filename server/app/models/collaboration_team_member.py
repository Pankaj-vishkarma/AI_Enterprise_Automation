from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class CollaborationTeamMember(Base):
    __tablename__ = "collaboration_team_members"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    team_id = Column(Integer, ForeignKey("collaboration_teams.id", ondelete="CASCADE"), nullable=False, index=True)
    ai_employee_id = Column(Integer, ForeignKey("ai_employees.id"), nullable=False)
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    team = relationship("CollaborationTeam", back_populates="members")
    ai_employee = relationship("AIEmployee")
