"""add voice sessions

Revision ID: m3n4o5p6q7r
Revises: l2m3n4o5p6q
Create Date: 2026-06-11 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "m3n4o5p6q7r"
down_revision: Union[str, Sequence[str], None] = "l2m3n4o5p6q"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "voice_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("assistant_preference", sa.String(100), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
    )
    op.create_index("ix_voice_sessions_organization_id", "voice_sessions", ["organization_id"])
    op.create_index("ix_voice_sessions_user_id", "voice_sessions", ["user_id"])
    op.create_index("ix_voice_sessions_status", "voice_sessions", ["status"])


def downgrade() -> None:
    op.drop_table("voice_sessions")
