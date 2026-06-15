from sqlalchemy.orm import Session, joinedload

from app.models.knowledge_document import KnowledgeDocument


class KnowledgeDocumentRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        organization_id: int,
        uploaded_by_user_id: int,
        title: str,
        document_type: str,
        source_type: str,
        file_name: str,
        storage_path: str,
        mime_type: str | None,
        checksum: str | None,
        status: str = "uploaded",
        is_active: bool = True,
    ):
        document = KnowledgeDocument(
            organization_id=organization_id,
            uploaded_by_user_id=uploaded_by_user_id,
            title=title,
            document_type=document_type,
            source_type=source_type,
            file_name=file_name,
            storage_path=storage_path,
            mime_type=mime_type,
            checksum=checksum,
            status=status,
            is_active=is_active,
        )

        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)

        return document

    def get_by_id(self, document_id: int):
        return (
            self.db.query(KnowledgeDocument)
            .options(joinedload(KnowledgeDocument.chunks))
            .filter(KnowledgeDocument.id == document_id)
            .first()
        )

    def get_by_id_and_organization(self, document_id: int, organization_id: int):
        return (
            self.db.query(KnowledgeDocument)
            .options(joinedload(KnowledgeDocument.chunks))
            .filter(
                KnowledgeDocument.id == document_id,
                KnowledgeDocument.organization_id == organization_id,
            )
            .first()
        )

    def list_by_organization(self, organization_id: int):
        return (
            self.db.query(KnowledgeDocument)
            .filter(KnowledgeDocument.organization_id == organization_id)
            .order_by(KnowledgeDocument.id.asc())
            .all()
        )

    def update(
        self,
        document_id: int,
        title: str,
        document_type: str,
        source_type: str,
        file_name: str,
        storage_path: str,
        mime_type: str | None,
        checksum: str | None,
        status: str,
        is_active: bool,
    ):
        document = self.get_by_id(document_id)

        if not document:
            return None

        document.title = title
        document.document_type = document_type
        document.source_type = source_type
        document.file_name = file_name
        document.storage_path = storage_path
        document.mime_type = mime_type
        document.checksum = checksum
        document.status = status
        document.is_active = is_active

        self.db.commit()
        self.db.refresh(document)

        return document

    def update_is_active(self, document_id: int, is_active: bool):
        document = self.get_by_id(document_id)

        if not document:
            return None

        document.is_active = is_active

        self.db.commit()
        self.db.refresh(document)

        return document

    def update_status(self, document_id: int, status: str):
        document = self.get_by_id(document_id)

        if not document:
            return None

        document.status = status
        self.db.commit()
        self.db.refresh(document)

        return document

    def delete(self, document_id: int):
        document = self.get_by_id(document_id)
        if not document:
            return None
        self.db.delete(document)
        self.db.commit()
        return document
