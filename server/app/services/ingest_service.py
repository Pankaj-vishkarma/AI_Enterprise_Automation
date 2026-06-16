import os
from pathlib import Path

from app.core.config import settings
from app.utils.chunking import chunk_text
from app.repositories.knowledge_document_repository import KnowledgeDocumentRepository
from app.repositories.knowledge_document_chunk_repository import (
    KnowledgeDocumentChunkRepository,
)


class IngestService:
    def __init__(self, db, storage_root: str | None = None):
        self.db = db
        self.doc_repo = KnowledgeDocumentRepository(db)
        self.chunk_repo = KnowledgeDocumentChunkRepository(db)
        self.storage_root = storage_root or settings.STORAGE_ROOT

    def persist_file(
        self,
        current_user,
        title,
        document_type,
        source_type,
        file_path,
        mime_type=None,
        checksum=None,
    ):
        filename = Path(file_path).name
        storage_path = os.path.abspath(file_path)
        document = self.doc_repo.create(
            organization_id=current_user.organization_id,
            uploaded_by_user_id=current_user.id,
            title=title,
            document_type=document_type,
            source_type=source_type,
            file_name=filename,
            storage_path=storage_path,
            mime_type=mime_type,
            checksum=checksum,
        )
        return document

    def create_chunks_from_text(self, current_user, document_id: int, text: str):
        return self.create_chunks_for_org(current_user.organization_id, document_id, text)

    def create_chunks_for_org(self, organization_id: int, document_id: int, text: str):
        self.doc_repo.update_status(document_id, "processing")
        self.chunk_repo.delete_by_document(organization_id, document_id)
        chunks = chunk_text(text)
        created = self.chunk_repo.create_many(organization_id, document_id, chunks)
        self.doc_repo.update_status(document_id, "processed")
        return created
