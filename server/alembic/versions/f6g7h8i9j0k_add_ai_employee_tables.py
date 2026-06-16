"""add ai employee tables

Revision ID: f6g7h8i9j0k
Revises: e5f6g7h8i9j
Create Date: 2026-06-11 00:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f6g7h8i9j0k"
down_revision: Union[str, Sequence[str], None] = "e5f6g7h8i9j"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_employees",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(100), nullable=False),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("tools_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(50), nullable=False, server_default="Active"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ai_employees_organization_id", "ai_employees", ["organization_id"])
    op.create_index("ix_ai_employees_status", "ai_employees", ["status"])
    op.create_table(
        "ai_employee_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("ai_employees.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("task", sa.Text(), nullable=False),
        sa.Column("output", sa.Text(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="completed"),
        sa.Column("tools_used_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ai_employee_runs_organization_id", "ai_employee_runs", ["organization_id"])
    op.create_index("ix_ai_employee_runs_employee_id", "ai_employee_runs", ["employee_id"])
    op.create_index("ix_ai_employee_runs_status", "ai_employee_runs", ["status"])


def downgrade() -> None:
    op.drop_index("ix_ai_employee_runs_status", table_name="ai_employee_runs")
    op.drop_index("ix_ai_employee_runs_employee_id", table_name="ai_employee_runs")
    op.drop_index("ix_ai_employee_runs_organization_id", table_name="ai_employee_runs")
    op.drop_table("ai_employee_runs")
    op.drop_index("ix_ai_employees_status", table_name="ai_employees")
    op.drop_index("ix_ai_employees_organization_id", table_name="ai_employees")
    op.drop_table("ai_employees")
