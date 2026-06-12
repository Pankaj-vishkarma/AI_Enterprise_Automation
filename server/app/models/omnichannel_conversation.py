from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class OmnichannelConversation(Base):
    __tablename__ = "omnichannel_conversations"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    channel = Column(String(50), nullable=False, index=True)
    participant_name = Column(String(255), nullable=False)
    participant_email = Column(String(255), nullable=True)
    participant_company = Column(String(255), nullable=True)

    status = Column(String(50), nullable=False, default="AI Active", index=True)
    handoff_status = Column(String(50), nullable=False, default="ai")

    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    assigned_to_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    assigned_to_label = Column(String(255), nullable=True)

    shared_context = Column(Text, nullable=True)
    ai_suggestion = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    support_ticket_id = Column(Integer, nullable=True)

    external_thread_id = Column(String(255), nullable=True, index=True)
    handoff_history_json = Column(Text, nullable=False, default="[]")
    participants_json = Column(Text, nullable=False, default="[]")

    last_message_preview = Column(String(500), nullable=True)
    last_message_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    organization = relationship("Organization")
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    assigned_user = relationship("User", foreign_keys=[assigned_to_user_id])
    messages = relationship(
        "OmnichannelMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="OmnichannelMessage.created_at",
    )
