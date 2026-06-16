import threading
from queue import Queue

from app.core.database import SessionLocal
from app.repositories.knowledge_document_repository import KnowledgeDocumentRepository
from app.services.ingest_service import IngestService

_queue: Queue | None = None


def get_queue() -> Queue:
    global _queue
    if _queue is None:
        _queue = Queue()
        thread = threading.Thread(target=_worker_loop, daemon=True)
        thread.start()
    return _queue


def _worker_loop():
    while True:
        organization_id, document_id, extracted_text = _queue.get()
        db = SessionLocal()
        try:
            IngestService(db).create_chunks_for_org(organization_id, document_id, extracted_text)
        except Exception:
            try:
                KnowledgeDocumentRepository(db).update_status(document_id, "failed")
            except Exception:
                db.rollback()
        finally:
            db.close()
            _queue.task_done()


def enqueue_ingest(db, current_user, document_payload, extracted_text):
    KnowledgeDocumentRepository(db).update_status(document_payload.id, "ingest_queued")
    get_queue().put((current_user.organization_id, document_payload.id, extracted_text))
