from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class OmnichannelMessage(Base):
    __tablename__ = "omnichannel_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer,
        ForeignKey("omnichannel_conversations.id"),
        nullable=False,
        index=True,
    )
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)

    sender_type = Column(String(32), nullable=False)  # user | ai | human | system
    sender_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    content = Column(Text, nullable=False)
    delivery_status = Column(String(32), nullable=False, default="sent")
    metadata_json = Column(Text, nullable=False, default="{}")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("OmnichannelConversation", back_populates="messages")
    sender_user = relationship("User")
