"""add browser tasks table

Revision ID: l2m3n4o5p6q
Revises: k1l2m3n4o5p
Create Date: 2026-06-11 22:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "l2m3n4o5p6q"
down_revision: Union[str, Sequence[str], None] = "k1l2m3n4o5p"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "browser_tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=False),
        sa.Column("task_type", sa.String(100), nullable=False, server_default="general"),
        sa.Column("target_url", sa.String(500), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="completed"),
        sa.Column("results_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("logs_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("errors_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("pages_visited_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("report_text", sa.Text(), nullable=True),
        sa.Column("execution_time_ms", sa.Integer(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_browser_tasks_organization_id", "browser_tasks", ["organization_id"])
    op.create_index("ix_browser_tasks_status", "browser_tasks", ["status"])
    op.create_index("ix_browser_tasks_is_deleted", "browser_tasks", ["is_deleted"])


def downgrade() -> None:
    op.drop_index("ix_browser_tasks_is_deleted", table_name="browser_tasks")
    op.drop_index("ix_browser_tasks_status", table_name="browser_tasks")
    op.drop_index("ix_browser_tasks_organization_id", table_name="browser_tasks")
    op.drop_table("browser_tasks")
