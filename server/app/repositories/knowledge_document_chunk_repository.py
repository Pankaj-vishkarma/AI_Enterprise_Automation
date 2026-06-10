from sqlalchemy.orm import Session, joinedload

from app.models.knowledge_document import KnowledgeDocument
from app.models.knowledge_document_chunk import KnowledgeDocumentChunk


class KnowledgeDocumentChunkRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        organization_id: int,
        document_id: int,
        chunk_index: int,
        chunk_text: str,
        page_number: int | None,
        section_heading: str | None,
        token_count: int | None,
        embedding_status: str,
        embedding_ref: str | None,
    ):
        chunk = KnowledgeDocumentChunk(
            organization_id=organization_id,
            document_id=document_id,
            chunk_index=chunk_index,
            chunk_text=chunk_text,
            page_number=page_number,
            section_heading=section_heading,
            token_count=token_count,
            embedding_status=embedding_status,
            embedding_ref=embedding_ref,
        )

        self.db.add(chunk)
        self.db.commit()
        self.db.refresh(chunk)

        return chunk

    def create_many(self, organization_id: int, document_id: int, chunks: list[dict]):
        created_chunks = []

        for chunk_data in chunks:
            created_chunks.append(
                self.create(
                    organization_id=organization_id,
                    document_id=document_id,
                    chunk_index=chunk_data["chunk_index"],
                    chunk_text=chunk_data["chunk_text"],
                    page_number=chunk_data.get("page_number"),
                    section_heading=chunk_data.get("section_heading"),
                    token_count=chunk_data.get("token_count"),
                    embedding_status=chunk_data.get("embedding_status", "pending"),
                    embedding_ref=chunk_data.get("embedding_ref"),
                )
            )

        return created_chunks

    def list_by_document(self, organization_id: int, document_id: int):
        return (
            self.db.query(KnowledgeDocumentChunk)
            .filter(
                KnowledgeDocumentChunk.organization_id == organization_id,
                KnowledgeDocumentChunk.document_id == document_id,
            )
            .order_by(KnowledgeDocumentChunk.chunk_index.asc())
            .all()
        )

    def list_by_organization(self, organization_id: int):
        return (
            self.db.query(KnowledgeDocumentChunk)
            .options(joinedload(KnowledgeDocumentChunk.document))
            .join(
                KnowledgeDocument,
                KnowledgeDocument.id == KnowledgeDocumentChunk.document_id,
            )
            .filter(KnowledgeDocumentChunk.organization_id == organization_id)
            .filter(KnowledgeDocument.organization_id == organization_id)
            .filter(KnowledgeDocument.is_active.is_(True))
            .order_by(KnowledgeDocumentChunk.id.asc())
            .all()
        )

    def update_embedding(
        self, chunk_id: int, vector: list[float], embedding_ref: str | None = None
    ):
        chunk = (
            self.db.query(KnowledgeDocumentChunk)
            .filter(KnowledgeDocumentChunk.id == chunk_id)
            .first()
        )
        if not chunk:
            return None
        chunk.embedding = vector
        chunk.embedding_status = "ready"
        if embedding_ref:
            chunk.embedding_ref = embedding_ref
        self.db.commit()
        self.db.refresh(chunk)
        return chunk

    def list_embeddings_by_organization(self, organization_id: int):
        return (
            self.db.query(KnowledgeDocumentChunk)
            .filter(KnowledgeDocumentChunk.organization_id == organization_id)
            .filter(KnowledgeDocumentChunk.embedding.isnot(None))
            .all()
        )

    def list_pending_embeddings(self, limit: int = 100):
        return (
            self.db.query(KnowledgeDocumentChunk)
            .filter(KnowledgeDocumentChunk.embedding_status == "pending")
            .order_by(KnowledgeDocumentChunk.id.asc())
            .limit(limit)
            .all()
        )
