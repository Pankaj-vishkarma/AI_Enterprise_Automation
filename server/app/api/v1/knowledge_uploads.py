import os
import shutil
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission, KNOWLEDGE_MANAGE_PERMISSION
from app.core.config import settings
from app.services.ingest_service import IngestService
from app.tasks.ingest_worker import enqueue_ingest
from app.repositories.knowledge_document_repository import KnowledgeDocumentRepository

from app.utils.extractors.pdf_extractor import extract_text_from_pdf
from app.utils.extractors.docx_extractor import extract_text_from_docx
from app.utils.extractors.txt_extractor import extract_text_from_txt

router = APIRouter(prefix="/api/v1/knowledge", tags=["knowledge"])


def _extract_text(path: str) -> str:
    lower_name = path.lower()
    if lower_name.endswith(".pdf"):
        return extract_text_from_pdf(path)
    if lower_name.endswith(".docx"):
        return extract_text_from_docx(path)
    if lower_name.endswith(".txt"):
        return extract_text_from_txt(path)
    raise ValueError("Unsupported file type")


@router.post("/upload")
def upload_file(
    title: str,
    document_type: str,
    file: UploadFile = File(...),
    current_user=Depends(require_permission(KNOWLEDGE_MANAGE_PERMISSION)),
    db: Session = Depends(get_db),
):
    storage_dir = settings.STORAGE_ROOT
    os.makedirs(storage_dir, exist_ok=True)
    dest = os.path.join(storage_dir, file.filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # persist metadata
    ingest = IngestService(db, storage_root=storage_dir)
    document = ingest.persist_file(
        current_user, title, document_type, "upload", dest, mime_type=file.content_type
    )

    # extract text
    try:
        text = _extract_text(dest)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc

    enqueue_ingest(db, current_user, document, text)

    return {"document_id": document.id, "status": "ingest_queued"}


@router.post("/documents/{document_id}/retry-ingest")
def retry_ingest(
    document_id: int,
    current_user=Depends(require_permission(KNOWLEDGE_MANAGE_PERMISSION)),
    db: Session = Depends(get_db),
):
    document = KnowledgeDocumentRepository(db).get_by_id_and_organization(
        document_id, current_user.organization_id
    )
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found"
        )
    if not os.path.exists(document.storage_path):
        KnowledgeDocumentRepository(db).update_status(document_id, "failed")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Stored file not found"
        )
    try:
        text = _extract_text(document.storage_path)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except Exception as exc:
        KnowledgeDocumentRepository(db).update_status(document_id, "failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc
    enqueue_ingest(db, current_user, document, text)
    return {"document_id": document.id, "status": "ingest_queued"}
