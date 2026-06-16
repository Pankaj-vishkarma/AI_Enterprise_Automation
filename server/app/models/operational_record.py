from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class OperationalRecord(Base):
    """Organization-scoped storage for configurable automation modules."""

    __tablename__ = "operational_records"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    module = Column(String(50), nullable=False, index=True)
    record_type = Column(String(50), nullable=False, default="item")
    title = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="active", index=True)
    data_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organization = relationship("Organization")
    created_by_user = relationship("User")
