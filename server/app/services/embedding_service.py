import numpy as np
from sentence_transformers import SentenceTransformer

from app.repositories.knowledge_document_chunk_repository import (
    KnowledgeDocumentChunkRepository,
)


class EmbeddingService:
    def __init__(self, db, model_name: str = "all-MiniLM-L6-v2"):
        self.db = db
        self.model = SentenceTransformer(model_name)
        self.chunk_repo = KnowledgeDocumentChunkRepository(db)

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        arr = self.model.encode(texts, show_progress_bar=False)
        return [list(map(float, v)) for v in arr]

    def embed_and_persist(self, organization_id: int, chunk_objs: list):
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
