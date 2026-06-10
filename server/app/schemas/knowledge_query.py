from pydantic import BaseModel

from app.schemas.knowledge_document import KnowledgeDocumentResponse
from app.schemas.knowledge_document import KnowledgeDocumentChunkResponse


class KnowledgeQueryRequest(BaseModel):
    question_text: str
    top_k: int = 5


class KnowledgeQueryResponse(BaseModel):
    id: int
    organization_id: int
    user_id: int
    question_text: str
    answer_text: str
    matched_document_ids: list[int]
    matched_chunk_ids: list[int]
    query_status: str

    class Config:
        from_attributes = True


class KnowledgeQueryHistoryResponse(BaseModel):
    id: int
    organization_id: int
    user_id: int
    question_text: str
    answer_text: str
    matched_document_ids: list[int]
    matched_chunk_ids: list[int]
    query_status: str

    class Config:
        from_attributes = True
