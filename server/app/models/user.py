from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime

from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)

    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)

    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)

    first_name = Column(String(100), nullable=False)

    last_name = Column(String(100))

    email = Column(String(255), unique=True, nullable=False)

    password_hash = Column(String(255), nullable=False)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organization = relationship("Organization")
    role = relationship("Role")
    department = relationship("Department")
    team = relationship("Team")
