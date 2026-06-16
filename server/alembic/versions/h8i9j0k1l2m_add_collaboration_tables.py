"""add collaboration tables

Revision ID: h8i9j0k1l2m
Revises: g7h8i9j0k1l
Create Date: 2026-06-11 14:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "h8i9j0k1l2m"
down_revision: Union[str, Sequence[str], None] = "g7h8i9j0k1l"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "collaboration_teams",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_collaboration_teams_organization_id", "collaboration_teams", ["organization_id"])

    op.create_table(
        "collaboration_team_members",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("collaboration_teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ai_employee_id", sa.Integer(), sa.ForeignKey("ai_employees.id"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_collaboration_team_members_team_id", "collaboration_team_members", ["team_id"])
    op.create_index("ix_collaboration_team_members_organization_id", "collaboration_team_members", ["organization_id"])

    op.create_table(
        "collaboration_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("collaboration_teams.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("task", sa.Text(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="completed"),
        sa.Column("final_output", sa.Text(), nullable=False, server_default=""),
        sa.Column("intermediate_outputs_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("participating_agents_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("failure_info_json", sa.Text(), nullable=True),
        sa.Column("execution_time_ms", sa.Integer(), nullable=True),
        sa.Column("token_usage_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_collaboration_runs_organization_id", "collaboration_runs", ["organization_id"])
    op.create_index("ix_collaboration_runs_team_id", "collaboration_runs", ["team_id"])
    op.create_index("ix_collaboration_runs_status", "collaboration_runs", ["status"])


def downgrade() -> None:
    op.drop_index("ix_collaboration_runs_status", table_name="collaboration_runs")
    op.drop_index("ix_collaboration_runs_team_id", table_name="collaboration_runs")
    op.drop_index("ix_collaboration_runs_organization_id", table_name="collaboration_runs")
    op.drop_table("collaboration_runs")
    op.drop_index("ix_collaboration_team_members_organization_id", table_name="collaboration_team_members")
    op.drop_index("ix_collaboration_team_members_team_id", table_name="collaboration_team_members")
    op.drop_table("collaboration_team_members")
    op.drop_index("ix_collaboration_teams_organization_id", table_name="collaboration_teams")
    op.drop_table("collaboration_teams")
