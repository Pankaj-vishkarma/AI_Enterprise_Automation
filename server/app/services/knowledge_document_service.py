import os

from app.core.dependencies import KNOWLEDGE_MANAGE_PERMISSION, KNOWLEDGE_VIEW_PERMISSION
from app.repositories.knowledge_document_chunk_repository import (
    KnowledgeDocumentChunkRepository,
)
from app.repositories.knowledge_document_repository import KnowledgeDocumentRepository
from app.schemas.knowledge_document import SUPPORTED_KNOWLEDGE_DOCUMENT_TYPES


class KnowledgeDocumentService:

    def __init__(self, db):
        self.db = db
        self.document_repo = KnowledgeDocumentRepository(db)
        self.chunk_repo = KnowledgeDocumentChunkRepository(db)

    def _assert_document_type(self, document_type: str):
        if document_type not in SUPPORTED_KNOWLEDGE_DOCUMENT_TYPES:
            raise ValueError("Unsupported knowledge document type")

    def _assert_document_access(self, current_user, document):
        current_role = current_user.role.name if current_user.role else None
        if (
            current_role != "SUPER_ADMIN"
            and document.organization_id != current_user.organization_id
        ):
            raise PermissionError("Cross-organization knowledge access is not allowed")

    def create_document(self, current_user, payload):
        self._assert_document_type(payload.document_type)

        document = self.document_repo.create(
            organization_id=current_user.organization_id,
            uploaded_by_user_id=current_user.id,
            title=payload.title,
            document_type=payload.document_type,
            source_type=payload.source_type,
            file_name=payload.file_name,
            storage_path=payload.storage_path,
            mime_type=payload.mime_type,
            checksum=payload.checksum,
        )

        return self.document_repo.get_by_id(document.id)

    def list_documents(self, current_user):
        return self.document_repo.list_by_organization(current_user.organization_id)

    def get_document(self, current_user, document_id: int):
        document = self.document_repo.get_by_id(document_id)
        if not document:
            return None
        self._assert_document_access(current_user, document)
        return document

    def update_document(self, current_user, document_id: int, payload):
        document = self.get_document(current_user, document_id)
        if not document:
            return None

        self._assert_document_type(payload.document_type)

        return self.document_repo.update(
            document_id=document_id,
            title=payload.title,
            document_type=payload.document_type,
            source_type=payload.source_type,
            file_name=payload.file_name,
            storage_path=payload.storage_path,
            mime_type=payload.mime_type,
            checksum=payload.checksum,
            status=payload.status,
            is_active=payload.is_active,
        )

    def disable_document(self, current_user, document_id: int):
        document = self.get_document(current_user, document_id)
        if not document:
            return None
        return self.document_repo.update_is_active(document_id, False)

    def add_chunks(self, current_user, document_id: int, chunks):
        document = self.get_document(current_user, document_id)
        if not document:
            return None
        return self.chunk_repo.create_many(
            current_user.organization_id,
            document_id,
            [chunk.model_dump() for chunk in chunks],
        )

    def list_chunks(self, current_user, document_id: int):
        document = self.get_document(current_user, document_id)
        if not document:
            return None
        return self.chunk_repo.list_by_document(
            current_user.organization_id, document_id
        )

    def get_download_info(self, current_user, document_id: int):
        document = self.get_document(current_user, document_id)
        if not document:
            return None
        if not document.storage_path or not os.path.isfile(document.storage_path):
            raise ValueError("Document file not found on storage")
        return {
            "path": document.storage_path,
            "file_name": document.file_name or f"document-{document.id}",
            "mime_type": document.mime_type or "application/octet-stream",
        }

    def delete_document(self, current_user, document_id: int):
        if not self._user_has_manage(current_user):
            raise PermissionError(f"{KNOWLEDGE_MANAGE_PERMISSION} permission required")
        document = self.get_document(current_user, document_id)
        if not document:
            return None
        self.chunk_repo.delete_by_document(current_user.organization_id, document_id)
        if document.storage_path and os.path.isfile(document.storage_path):
            try:
                os.remove(document.storage_path)
            except OSError:
                pass
        self.document_repo.delete(document_id)
        return {"id": document_id, "deleted": True}

    def _user_has_manage(self, current_user) -> bool:
        role_name = current_user.role.name if current_user.role else None
        if role_name == "SUPER_ADMIN":
            return True
        permissions = {
            p.name for p in getattr(getattr(current_user, "role", None), "permissions", [])
        }
        return KNOWLEDGE_MANAGE_PERMISSION in permissions
