from pydantic import BaseModel

from app.schemas.knowledge_document import (
    KnowledgeDocumentResponse,
    KnowledgeDocumentChunkResponse,
)


class KnowledgeSearchRequest(BaseModel):
    question_text: str
    top_k: int = 5


class KnowledgeSearchResult(BaseModel):
    answer_text: str
    matched_documents: list[KnowledgeDocumentResponse]
    matched_chunks: list[KnowledgeDocumentChunkResponse]
    query_id: int | None = None
