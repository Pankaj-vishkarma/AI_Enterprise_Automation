from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, index=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id"),
        nullable=False,
    )

    uploaded_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    title = Column(String(255), nullable=False)

    document_type = Column(String(100), nullable=False)

    source_type = Column(String(50), nullable=False, default="upload")

    file_name = Column(String(255), nullable=False)

    storage_path = Column(String(500), nullable=False)

    mime_type = Column(String(100), nullable=True)

    checksum = Column(String(128), nullable=True)

    status = Column(String(50), nullable=False, default="uploaded")

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    organization = relationship("Organization")
    uploaded_by_user = relationship("User")
    chunks = relationship(
        "KnowledgeDocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )
