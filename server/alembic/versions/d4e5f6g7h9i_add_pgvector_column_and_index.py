"""add pgvector embedding column and index

Revision ID: d4e5f6g7h9i
Revises: c3d4e5f6g8h9
Create Date: 2026-06-10 00:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d4e5f6g7h9i"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6g8h9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Attempt to create pgvector extension and add vector column
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
        op.add_column(
            "knowledge_document_chunks",
            sa.Column(
                "embedding_vector",
                sa.dialect_impl(sa.types.UserDefinedType),  # type: ignore
            ),
        )
    except Exception:
        # If pgvector isn't available, skip adding embedding_vector
        pass

    # Create index using raw SQL if extension exists
    try:
        op.execute(
            "CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_vector ON knowledge_document_chunks USING ivfflat (embedding_vector vector_l2_ops) WITH (lists = 100)"
        )
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.execute("DROP INDEX IF EXISTS idx_knowledge_chunks_embedding_vector")
    except Exception:
        pass
    try:
        op.drop_column("knowledge_document_chunks", "embedding_vector")
    except Exception:
        pass
