import threading
from queue import Queue

from app.services.ingest_service import IngestService

_queue: Queue | None = None


def get_queue() -> Queue:
    global _queue
    if _queue is None:
        _queue = Queue()
        t = threading.Thread(target=_worker_loop, daemon=True)
        t.start()
    return _queue


def _worker_loop():
    while True:
        job = _queue.get()
        try:
            fn, args, kwargs = job
            fn(*args, **kwargs)
        except Exception:
            pass
        finally:
            _queue.task_done()


def enqueue_ingest(db, current_user, document_payload, extracted_text):
    q = get_queue()
    ingest = IngestService(db)
    q.put(
        (
            ingest.create_chunks_from_text,
            (current_user, document_payload.id, extracted_text),
            {},
        )
    )
