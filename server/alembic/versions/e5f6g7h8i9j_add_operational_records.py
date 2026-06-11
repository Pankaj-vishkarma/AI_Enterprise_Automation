"""add operational records

Revision ID: e5f6g7h8i9j
Revises: d4e5f6g7h9i
Create Date: 2026-06-11 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e5f6g7h8i9j"
down_revision: Union[str, Sequence[str], None] = "d4e5f6g7h9i"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "operational_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("module", sa.String(50), nullable=False),
        sa.Column("record_type", sa.String(50), nullable=False, server_default="item"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("data_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_operational_records_organization_id", "operational_records", ["organization_id"])
    op.create_index("ix_operational_records_module", "operational_records", ["module"])
    op.create_index("ix_operational_records_status", "operational_records", ["status"])


def downgrade() -> None:
    op.drop_table("operational_records")
