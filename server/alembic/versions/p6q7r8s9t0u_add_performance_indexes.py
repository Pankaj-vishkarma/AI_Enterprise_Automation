"""add performance indexes

Revision ID: p6q7r8s9t0u
Revises: o5p6q7r8s9t
Create Date: 2026-06-13 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

revision: str = "p6q7r8s9t0u"
down_revision: Union[str, Sequence[str], None] = "o5p6q7r8s9t"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_users_department_id", "users", ["department_id"], unique=False)
    op.create_index("ix_users_team_id", "users", ["team_id"], unique=False)
    op.create_index("ix_teams_organization_id", "teams", ["organization_id"], unique=False)
    op.create_index("ix_conversations_organization_id", "conversations", ["organization_id"], unique=False)
    op.create_index("ix_conversation_messages_conversation_id", "conversation_messages", ["conversation_id"], unique=False)
    op.create_index("ix_knowledge_documents_organization_id", "knowledge_documents", ["organization_id"], unique=False)
    op.create_index("ix_knowledge_document_chunks_document_id", "knowledge_document_chunks", ["document_id"], unique=False)
    op.create_index("ix_knowledge_document_chunks_organization_id", "knowledge_document_chunks", ["organization_id"], unique=False)
    op.create_index("ix_knowledge_queries_organization_id", "knowledge_queries", ["organization_id"], unique=False)
    op.create_index("ix_knowledge_queries_user_id", "knowledge_queries", ["user_id"], unique=False)
    op.create_index("ix_operational_records_created_by_user_id", "operational_records", ["created_by_user_id"], unique=False)
    op.create_index(
        "ix_operational_records_org_module",
        "operational_records",
        ["organization_id", "module"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_operational_records_org_module", table_name="operational_records")
    op.drop_index("ix_operational_records_created_by_user_id", table_name="operational_records")
    op.drop_index("ix_knowledge_queries_user_id", table_name="knowledge_queries")
    op.drop_index("ix_knowledge_queries_organization_id", table_name="knowledge_queries")
    op.drop_index("ix_knowledge_document_chunks_organization_id", table_name="knowledge_document_chunks")
    op.drop_index("ix_knowledge_document_chunks_document_id", table_name="knowledge_document_chunks")
    op.drop_index("ix_knowledge_documents_organization_id", table_name="knowledge_documents")
    op.drop_index("ix_conversation_messages_conversation_id", table_name="conversation_messages")
    op.drop_index("ix_conversations_organization_id", table_name="conversations")
    op.drop_index("ix_teams_organization_id", table_name="teams")
    op.drop_index("ix_users_team_id", table_name="users")
    op.drop_index("ix_users_department_id", table_name="users")
