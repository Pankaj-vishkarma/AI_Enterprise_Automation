from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class KnowledgeDocumentChunk(Base):
    __tablename__ = "knowledge_document_chunks"

    id = Column(Integer, primary_key=True, index=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id"),
        nullable=False,
    )

    document_id = Column(
        Integer,
        ForeignKey("knowledge_documents.id"),
        nullable=False,
    )

    chunk_index = Column(Integer, nullable=False)

    chunk_text = Column(Text, nullable=False)

    page_number = Column(Integer, nullable=True)

    section_heading = Column(String(255), nullable=True)

    token_count = Column(Integer, nullable=True)

    embedding_status = Column(String(50), nullable=False, default="pending")

    embedding_ref = Column(String(255), nullable=True)
    # Embedding vector stored as PostgreSQL float[] (pgvector preferred if available)
    embedding = Column(ARRAY(Float), nullable=True)

    # Try to use pgvector if available, otherwise fallback to float[] stored in `embedding`
    try:
        from pgvector.sqlalchemy import Vector

        HAS_PGVECTOR = True
    except Exception:
        Vector = None
        HAS_PGVECTOR = False

    if HAS_PGVECTOR:
        embedding_vector = Column(Vector(1536), nullable=True)
    else:
        embedding_vector = None

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    organization = relationship("Organization")
    document = relationship("KnowledgeDocument", back_populates="chunks")
