import threading
import time
from app.core.config import settings
from app.core.database import SessionLocal
from app.services.embedding_service import EmbeddingService
from app.repositories.knowledge_document_chunk_repository import (
    KnowledgeDocumentChunkRepository,
)

_running = False


def _loop():
    db = SessionLocal()
    chunk_repo = KnowledgeDocumentChunkRepository(db)
    emb_svc = EmbeddingService(db)
    try:
        while _running:
            pending = chunk_repo.list_pending_embeddings(limit=settings.EMBEDDING_WORKER_BATCH_LIMIT)
            if not pending:
                time.sleep(settings.EMBEDDING_WORKER_POLL_INTERVAL_SECONDS)
                continue
            batch_size = settings.EMBEDDING_BATCH_SIZE
            batches = [pending[i : i + batch_size] for i in range(0, len(pending), batch_size)]
            for batch in batches:
                try:
                    emb_svc.embed_and_persist(batch[0].organization_id, batch)
                except Exception:
                    pass
            time.sleep(settings.EMBEDDING_WORKER_IDLE_SLEEP_SECONDS)
    finally:
        db.close()


def start_background_worker():
    global _running
    if _running:
        return
    _running = True
    t = threading.Thread(target=_loop, daemon=True)
    t.start()


def stop_background_worker():
    global _running
    _running = False
