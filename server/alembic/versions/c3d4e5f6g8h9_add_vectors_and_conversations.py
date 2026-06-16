"""add embedding vector and conversations

Revision ID: c3d4e5f6g8h9
Revises: b2c3d4e5f6g7
Create Date: 2026-06-10 00:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c3d4e5f6g8h9"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6g7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # try to enable pgvector extension (harmless if already enabled or DB user lacks permission)
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    except Exception:
        # extension creation may fail in hosted DBs; continue and use float[] as fallback
        pass

    # add embedding column to chunks as float[] (compatible fallback)
    op.add_column(
        "knowledge_document_chunks",
        sa.Column("embedding", sa.dialects.postgresql.ARRAY(sa.Float()), nullable=True),
    )

    # create conversations table
    op.create_table(
        "conversations",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
    )
    op.create_index(op.f("ix_conversations_id"), "conversations", ["id"], unique=False)

    # create conversation messages table
    op.create_table(
        "conversation_messages",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("sender_user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("message_metadata", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"]),
        sa.ForeignKeyConstraint(["sender_user_id"], ["users.id"]),
    )
    op.create_index(
        op.f("ix_conversation_messages_id"),
        "conversation_messages",
        ["id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_conversation_messages_id"), table_name="conversation_messages"
    )
    op.drop_table("conversation_messages")
    op.drop_index(op.f("ix_conversations_id"), table_name="conversations")
    op.drop_table("conversations")
    op.drop_column("knowledge_document_chunks", "embedding")
