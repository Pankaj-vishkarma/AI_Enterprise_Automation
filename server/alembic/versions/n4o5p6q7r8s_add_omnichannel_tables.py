"""add omnichannel tables

Revision ID: n4o5p6q7r8s
Revises: m3n4o5p6q7r
Create Date: 2026-06-11 14:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "n4o5p6q7r8s"
down_revision: Union[str, Sequence[str], None] = "m3n4o5p6q7r"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "omnichannel_conversations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("channel", sa.String(50), nullable=False),
        sa.Column("participant_name", sa.String(255), nullable=False),
        sa.Column("participant_email", sa.String(255), nullable=True),
        sa.Column("participant_company", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="AI Active"),
        sa.Column("handoff_status", sa.String(50), nullable=False, server_default="ai"),
        sa.Column("assigned_to_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("assigned_to_team_id", sa.Integer(), sa.ForeignKey("teams.id"), nullable=True),
        sa.Column("assigned_to_department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("assigned_to_label", sa.String(255), nullable=True),
        sa.Column("shared_context", sa.Text(), nullable=True),
        sa.Column("ai_suggestion", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("support_ticket_id", sa.Integer(), nullable=True),
        sa.Column("external_thread_id", sa.String(255), nullable=True),
        sa.Column("handoff_history_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("participants_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("last_message_preview", sa.String(500), nullable=True),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_omnichannel_conversations_org", "omnichannel_conversations", ["organization_id"])
    op.create_index("ix_omnichannel_conversations_channel", "omnichannel_conversations", ["channel"])
    op.create_index("ix_omnichannel_conversations_status", "omnichannel_conversations", ["status"])

    op.create_table(
        "omnichannel_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("omnichannel_conversations.id"), nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("sender_type", sa.String(32), nullable=False),
        sa.Column("sender_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("delivery_status", sa.String(32), nullable=False, server_default="sent"),
        sa.Column("metadata_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_omnichannel_messages_conversation", "omnichannel_messages", ["conversation_id"])
    op.create_index("ix_omnichannel_messages_org", "omnichannel_messages", ["organization_id"])


def downgrade() -> None:
    op.drop_table("omnichannel_messages")
    op.drop_table("omnichannel_conversations")
