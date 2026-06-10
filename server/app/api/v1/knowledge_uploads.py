import os
import shutil
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission, KNOWLEDGE_MANAGE_PERMISSION
from app.core.config import settings
from app.services.ingest_service import IngestService
from app.tasks.ingest_worker import enqueue_ingest

from app.utils.extractors.pdf_extractor import extract_text_from_pdf
from app.utils.extractors.docx_extractor import extract_text_from_docx
from app.utils.extractors.txt_extractor import extract_text_from_txt

router = APIRouter(prefix="/api/v1/knowledge", tags=["knowledge"])


@router.post("/upload")
def upload_file(
    title: str,
    document_type: str,
    file: UploadFile = File(...),
    current_user=Depends(require_permission(KNOWLEDGE_MANAGE_PERMISSION)),
    db: Session = Depends(get_db),
):
    storage_dir = settings.STORAGE_ROOT or os.path.join(os.getcwd(), "uploads")
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
    text = ""
    lower_name = file.filename.lower()
    try:
        if lower_name.endswith(".pdf"):
            text = extract_text_from_pdf(dest)
        elif lower_name.endswith(".docx"):
            text = extract_text_from_docx(dest)
        elif lower_name.endswith(".txt"):
            text = extract_text_from_txt(dest)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type"
            )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc

    enqueue_ingest(db, current_user, document, text)

    return {"document_id": document.id, "status": "ingest_queued"}
