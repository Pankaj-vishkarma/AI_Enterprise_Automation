"""add workflow tables

Revision ID: i9j0k1l2m3n
Revises: h8i9j0k1l2m
Create Date: 2026-06-11 16:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "i9j0k1l2m3n"
down_revision: Union[str, Sequence[str], None] = "h8i9j0k1l2m"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workflows",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(100), nullable=False, server_default="Custom"),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_workflows_organization_id", "workflows", ["organization_id"])
    op.create_index("ix_workflows_status", "workflows", ["status"])

    op.create_table(
        "workflow_steps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("workflow_id", sa.Integer(), sa.ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("step_type", sa.String(50), nullable=False, server_default="approval"),
        sa.Column("assignee_type", sa.String(50), nullable=True),
        sa.Column("assignee_id", sa.Integer(), nullable=True),
        sa.Column("config_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_workflow_steps_workflow_id", "workflow_steps", ["workflow_id"])

    op.create_table(
        "workflow_instances",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("workflow_id", sa.Integer(), sa.ForeignKey("workflows.id"), nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("started_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="in_progress"),
        sa.Column("current_step_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_workflow_instances_organization_id", "workflow_instances", ["organization_id"])
    op.create_index("ix_workflow_instances_status", "workflow_instances", ["status"])

    op.create_table(
        "workflow_instance_steps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("instance_id", sa.Integer(), sa.ForeignKey("workflow_instances.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workflow_step_id", sa.Integer(), sa.ForeignKey("workflow_steps.id"), nullable=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("step_type", sa.String(50), nullable=False),
        sa.Column("assignee_type", sa.String(50), nullable=True),
        sa.Column("assignee_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="upcoming"),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column("acted_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("acted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ai_output", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_workflow_instance_steps_instance_id", "workflow_instance_steps", ["instance_id"])

    op.create_table(
        "workflow_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("instance_id", sa.Integer(), sa.ForeignKey("workflow_instances.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("details_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_workflow_audit_logs_instance_id", "workflow_audit_logs", ["instance_id"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("notification_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("link_entity_type", sa.String(50), nullable=True),
        sa.Column("link_entity_id", sa.Integer(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_workflow_audit_logs_instance_id", table_name="workflow_audit_logs")
    op.drop_table("workflow_audit_logs")
    op.drop_index("ix_workflow_instance_steps_instance_id", table_name="workflow_instance_steps")
    op.drop_table("workflow_instance_steps")
    op.drop_index("ix_workflow_instances_status", table_name="workflow_instances")
    op.drop_index("ix_workflow_instances_organization_id", table_name="workflow_instances")
    op.drop_table("workflow_instances")
    op.drop_index("ix_workflow_steps_workflow_id", table_name="workflow_steps")
    op.drop_table("workflow_steps")
    op.drop_index("ix_workflows_status", table_name="workflows")
    op.drop_index("ix_workflows_organization_id", table_name="workflows")
    op.drop_table("workflows")
