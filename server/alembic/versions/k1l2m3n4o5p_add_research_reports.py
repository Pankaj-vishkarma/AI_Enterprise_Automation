"""add research reports table

Revision ID: k1l2m3n4o5p
Revises: j0k1l2m3n4o
Create Date: 2026-06-11 20:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "k1l2m3n4o5p"
down_revision: Union[str, Sequence[str], None] = "j0k1l2m3n4o"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "research_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("research_type", sa.String(100), nullable=False, server_default="Business Intelligence"),
        sa.Column("request_text", sa.Text(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="completed"),
        sa.Column("sources_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("intermediate_findings_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("citations_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("final_report", sa.Text(), nullable=False, server_default=""),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("recommendations", sa.Text(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("execution_time_ms", sa.Integer(), nullable=True),
        sa.Column("agent_usage_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_research_reports_organization_id", "research_reports", ["organization_id"])
    op.create_index("ix_research_reports_status", "research_reports", ["status"])
    op.create_index("ix_research_reports_is_deleted", "research_reports", ["is_deleted"])


def downgrade() -> None:
    op.drop_index("ix_research_reports_is_deleted", table_name="research_reports")
    op.drop_index("ix_research_reports_status", table_name="research_reports")
    op.drop_index("ix_research_reports_organization_id", table_name="research_reports")
    op.drop_table("research_reports")
