from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class AIEmployee(Base):
    __tablename__ = "ai_employees"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    name = Column(String(255), nullable=False)
    role = Column(String(100), nullable=False)
    model = Column(String(100), nullable=True)
    instructions = Column(Text, nullable=False)
    tools_json = Column(Text, nullable=False, default="[]")
    status = Column(String(50), nullable=False, default="Active", index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization")
    created_by_user = relationship("User")
    department = relationship("Department")
    runs = relationship("AIEmployeeRun", back_populates="employee", cascade="all, delete-orphan")
