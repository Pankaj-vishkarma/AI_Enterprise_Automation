import logging
import signal
import sys
import time

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logging_config import configure_logging
from app.repositories.knowledge_document_chunk_repository import (
    KnowledgeDocumentChunkRepository,
)
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)
_running = True


def _handle_shutdown(signum, frame):
    global _running
    logger.info("Embedding worker received signal %s — shutting down", signum)
    _running = False


def run_worker_loop():
    configure_logging()
    logger.info("Embedding worker started")
    db = SessionLocal()
    chunk_repo = KnowledgeDocumentChunkRepository(db)
    emb_svc = EmbeddingService(db)
    try:
        while _running:
            pending = chunk_repo.list_pending_embeddings(
                limit=settings.EMBEDDING_WORKER_BATCH_LIMIT
            )
            if not pending:
                time.sleep(settings.EMBEDDING_WORKER_POLL_INTERVAL_SECONDS)
                continue
            batch_size = settings.EMBEDDING_BATCH_SIZE
            batches = [
                pending[i : i + batch_size]
                for i in range(0, len(pending), batch_size)
            ]
            for batch in batches:
                if not _running:
                    break
                try:
                    emb_svc.embed_and_persist(batch[0].organization_id, batch)
                    logger.info("Embedded batch of %s chunks", len(batch))
                except Exception:
                    logger.exception(
                        "Failed to embed batch for organization %s",
                        batch[0].organization_id,
                    )
            time.sleep(settings.EMBEDDING_WORKER_IDLE_SLEEP_SECONDS)
    finally:
        db.close()
        logger.info("Embedding worker stopped")


def start_background_worker():
    """Optional in-process worker for local development only."""
    import threading

    thread = threading.Thread(target=run_worker_loop, daemon=True, name="embedding-worker")
    thread.start()
    logger.info("In-process embedding worker thread started")


if __name__ == "__main__":
    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)
    try:
        run_worker_loop()
    except KeyboardInterrupt:
        logger.info("Embedding worker interrupted")
    sys.exit(0)
