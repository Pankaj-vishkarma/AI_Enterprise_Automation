from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, default="Custom")
    status = Column(String(50), nullable=False, default="draft", index=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization")
    created_by_user = relationship("User")
    steps = relationship(
        "WorkflowStep",
        back_populates="workflow",
        cascade="all, delete-orphan",
        order_by="WorkflowStep.position",
    )
    instances = relationship("WorkflowInstance", back_populates="workflow")


class WorkflowStep(Base):
    __tablename__ = "workflow_steps"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    position = Column(Integer, nullable=False, default=0)
    name = Column(String(255), nullable=False)
    step_type = Column(String(50), nullable=False, default="approval")
    assignee_type = Column(String(50), nullable=True)
    assignee_id = Column(Integer, nullable=True)
    config_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workflow = relationship("Workflow", back_populates="steps")


class WorkflowInstance(Base):
    __tablename__ = "workflow_instances"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    started_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="in_progress", index=True)
    current_step_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    workflow = relationship("Workflow", back_populates="instances")
    started_by_user = relationship("User")
    steps = relationship(
        "WorkflowInstanceStep",
        back_populates="instance",
        cascade="all, delete-orphan",
        order_by="WorkflowInstanceStep.position",
    )
    audit_logs = relationship("WorkflowAuditLog", back_populates="instance", cascade="all, delete-orphan")


class WorkflowInstanceStep(Base):
    __tablename__ = "workflow_instance_steps"

    id = Column(Integer, primary_key=True, index=True)
    instance_id = Column(Integer, ForeignKey("workflow_instances.id", ondelete="CASCADE"), nullable=False, index=True)
    workflow_step_id = Column(Integer, ForeignKey("workflow_steps.id"), nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    position = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    step_type = Column(String(50), nullable=False)
    assignee_type = Column(String(50), nullable=True)
    assignee_id = Column(Integer, nullable=True)
    status = Column(String(50), nullable=False, default="upcoming")
    comments = Column(Text, nullable=True)
    acted_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    acted_at = Column(DateTime(timezone=True), nullable=True)
    ai_output = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    instance = relationship("WorkflowInstance", back_populates="steps")
    acted_by_user = relationship("User")


class WorkflowAuditLog(Base):
    __tablename__ = "workflow_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    instance_id = Column(Integer, ForeignKey("workflow_instances.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    message = Column(Text, nullable=True)
    details_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    instance = relationship("WorkflowInstance", back_populates="audit_logs")
    user = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    link_entity_type = Column(String(50), nullable=True)
    link_entity_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
