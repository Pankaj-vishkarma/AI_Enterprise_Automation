from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.config import settings
from app.repositories.knowledge_document_chunk_repository import (
    KnowledgeDocumentChunkRepository,
)

_MODEL_CACHE: dict[str, SentenceTransformer] = {}


def get_embedding_model(model_name: str | None = None) -> SentenceTransformer:
    """Process-level singleton — load SentenceTransformer once per worker."""
    resolved = model_name or settings.EMBEDDING_MODEL_NAME
    if resolved not in _MODEL_CACHE:
        _MODEL_CACHE[resolved] = SentenceTransformer(resolved)
    return _MODEL_CACHE[resolved]


class EmbeddingService:
    def __init__(self, db, model_name: str | None = None):
        self.db = db
        self.model = get_embedding_model(model_name)
        self.chunk_repo = KnowledgeDocumentChunkRepository(db)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        arr = self.model.encode(texts, show_progress_bar=False)
        return [list(map(float, v)) for v in arr]

    def embed_and_persist(self, organization_id: int, chunk_objs: List):
        texts = [c.chunk_text for c in chunk_objs]
        vectors = self.embed_texts(texts)
        updated = []
        for chunk, vec in zip(chunk_objs, vectors):
            # update both embedding (float[]) and embedding_vector (pgvector) if available
            self.chunk_repo.update_embedding(chunk.id, vec, embedding_ref=None)
            # if model supports pgvector, also try to set embedding_vector via raw SQL
            try:
                # some DB adapters will accept setting embedding_vector via update
                self.chunk_repo.db.execute(
                    "UPDATE knowledge_document_chunks SET embedding_vector = %s WHERE id = %s",
                    (vec, chunk.id),
                )
                self.chunk_repo.db.commit()
            except Exception:
                pass
            updated.append(chunk.id)
        return updated
