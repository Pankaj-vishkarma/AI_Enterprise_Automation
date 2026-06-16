import numpy as np
from typing import List, Tuple

from app.repositories.knowledge_document_chunk_repository import (
    KnowledgeDocumentChunkRepository,
)
from app.models.knowledge_document_chunk import KnowledgeDocumentChunk
from app.clients.redis_client import get_redis
import hashlib


class VectorSearchService:
    def __init__(self, db):
        self.db = db
        self.chunk_repo = KnowledgeDocumentChunkRepository(db)

    def _cosine(self, a: np.ndarray, b: np.ndarray) -> float:
        if a is None or b is None:
            return 0.0
        na = np.linalg.norm(a)
        nb = np.linalg.norm(b)
        if na == 0 or nb == 0:
            return 0.0
        return float(np.dot(a, b) / (na * nb))

    def search(
        self, organization_id: int, query_vector: List[float], top_k: int = 5
    ) -> List[Tuple[float, object]]:
        # try cache
        redis = get_redis()
        qhash = hashlib.sha256((str(query_vector) + str(top_k)).encode()).hexdigest()
        cache_key = f"vec_search:{organization_id}:{qhash}:{top_k}"
        if redis:
            cached = redis.get(cache_key)
            if cached:
                try:
                    import json

                    ids = json.loads(cached)
                    res = []
                    for cid in ids:
                        c = self.chunk_repo.db.get(KnowledgeDocumentChunk, int(cid))
                        if c:
                            res.append((1.0, c))
                    if res:
                        return res
                except Exception:
                    pass
        chunks = self.chunk_repo.list_embeddings_by_organization(organization_id)
        qv = np.array(query_vector, dtype=float)
        scored = []
        for c in chunks:
            if c.embedding is None:
                continue
            try:
                ev = np.array(c.embedding, dtype=float)
                score = self._cosine(qv, ev)
            except Exception:
                score = 0.0
            scored.append((score, c))
        scored.sort(key=lambda x: x[0], reverse=True)
        # cache ids
        if redis:
            try:
                import json

                redis.set(
                    cache_key, json.dumps([c.id for _, c in scored[:top_k]]), ex=300
                )
            except Exception:
                pass
        return scored[:top_k]
