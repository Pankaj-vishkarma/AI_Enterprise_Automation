import json
from collections import Counter
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    KNOWLEDGE_ASK_PERMISSION,
    KNOWLEDGE_MANAGE_PERMISSION,
    KNOWLEDGE_VIEW_PERMISSION,
    require_permission,
)
from app.schemas.knowledge_document import (
    KnowledgeDocumentChunkCreate,
    KnowledgeDocumentChunkResponse,
    KnowledgeDocumentCreate,
    KnowledgeDocumentResponse,
    KnowledgeDocumentUpdate,
)
from app.schemas.knowledge_query import (
    KnowledgeQueryHistoryResponse,
    KnowledgeQueryRequest,
    KnowledgeQueryResponse,
)
from app.schemas.knowledge_search import KnowledgeSearchRequest, KnowledgeSearchResult
from app.services.knowledge_document_service import KnowledgeDocumentService
from app.services.rag_service import RAGService
from app.services.knowledge_search_service import KnowledgeSearchService
from app.models.knowledge_document import KnowledgeDocument
from app.models.knowledge_document_chunk import KnowledgeDocumentChunk
from app.models.knowledge_query import KnowledgeQuery

router = APIRouter(prefix="/api/v1/knowledge", tags=["knowledge"])


@router.post("/documents", response_model=KnowledgeDocumentResponse)
def create_document(
    payload: KnowledgeDocumentCreate,
    current_user=Depends(require_permission(KNOWLEDGE_MANAGE_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = KnowledgeDocumentService(db)
    try:
        return service.create_document(current_user, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.get("/documents", response_model=List[KnowledgeDocumentResponse])
def list_documents(
    current_user=Depends(require_permission(KNOWLEDGE_VIEW_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = KnowledgeDocumentService(db)
    return service.list_documents(current_user)


@router.get("/documents/{document_id}", response_model=KnowledgeDocumentResponse)
def get_document(
    document_id: int,
    current_user=Depends(require_permission(KNOWLEDGE_VIEW_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = KnowledgeDocumentService(db)
    try:
        document = service.get_document(current_user, document_id)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)
        ) from exc
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found"
        )
    return document


@router.patch("/documents/{document_id}", response_model=KnowledgeDocumentResponse)
def update_document(
    document_id: int,
    payload: KnowledgeDocumentUpdate,
    current_user=Depends(require_permission(KNOWLEDGE_MANAGE_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = KnowledgeDocumentService(db)
    try:
        document = service.update_document(current_user, document_id, payload)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found"
        )
    return document


@router.patch(
    "/documents/{document_id}/disable", response_model=KnowledgeDocumentResponse
)
def disable_document(
    document_id: int,
    current_user=Depends(require_permission(KNOWLEDGE_MANAGE_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = KnowledgeDocumentService(db)
    try:
        document = service.disable_document(current_user, document_id)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)
        ) from exc
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found"
        )
    return document


@router.post(
    "/documents/{document_id}/chunks",
    response_model=List[KnowledgeDocumentChunkResponse],
)
def add_chunks(
    document_id: int,
    payload: List[KnowledgeDocumentChunkCreate],
    current_user=Depends(require_permission(KNOWLEDGE_MANAGE_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = KnowledgeDocumentService(db)
    try:
        chunks = service.add_chunks(current_user, document_id, payload)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)
        ) from exc
    if chunks is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found"
        )
    return chunks


@router.get(
    "/documents/{document_id}/chunks",
    response_model=List[KnowledgeDocumentChunkResponse],
)
def list_chunks(
    document_id: int,
    current_user=Depends(require_permission(KNOWLEDGE_VIEW_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = KnowledgeDocumentService(db)
    try:
        chunks = service.list_chunks(current_user, document_id)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)
        ) from exc
    if chunks is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found"
        )
    return chunks


@router.get("/search", response_model=KnowledgeSearchResult)
def search_knowledge(
    q: str = Query(min_length=1),
    top_k: int = 5,
    current_user=Depends(require_permission(KNOWLEDGE_ASK_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = KnowledgeSearchService(db)
    query, chunks = service.ask(current_user, q, top_k)
    documents_by_id = {}
    for chunk in chunks:
        if getattr(chunk, "document", None):
            documents_by_id[chunk.document.id] = chunk.document
    return KnowledgeSearchResult(
        answer_text=query.answer_text,
        matched_documents=list(documents_by_id.values()),
        matched_chunks=chunks,
        query_id=query.id,
    )


@router.post("/query", response_model=KnowledgeQueryResponse)
def ask_question(
    payload: KnowledgeQueryRequest,
    current_user=Depends(require_permission(KNOWLEDGE_ASK_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = RAGService(db)
    query, _ = service.ask(current_user, payload.question_text, payload.top_k)
    return KnowledgeQueryResponse(
        id=query.id,
        organization_id=query.organization_id,
        user_id=query.user_id,
        question_text=query.question_text,
        answer_text=query.answer_text,
        matched_document_ids=json.loads(query.matched_document_ids or "[]"),
        matched_chunk_ids=json.loads(query.matched_chunk_ids or "[]"),
        query_status=query.query_status,
    )


@router.get("/query-history", response_model=List[KnowledgeQueryHistoryResponse])
def query_history(
    current_user=Depends(require_permission(KNOWLEDGE_VIEW_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = KnowledgeSearchService(db)
    history = service.list_history(current_user)
    return [
        KnowledgeQueryHistoryResponse(
            id=item.id,
            organization_id=item.organization_id,
            user_id=item.user_id,
            question_text=item.question_text,
            answer_text=item.answer_text,
            matched_document_ids=json.loads(item.matched_document_ids or "[]"),
            matched_chunk_ids=json.loads(item.matched_chunk_ids or "[]"),
            query_status=item.query_status,
        )
        for item in history
    ]


@router.get("/statistics")
def knowledge_statistics(
    current_user=Depends(require_permission(KNOWLEDGE_VIEW_PERMISSION)),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id
    documents = (
        db.query(KnowledgeDocument)
        .filter(KnowledgeDocument.organization_id == org_id)
        .all()
    )
    chunks_count = (
        db.query(KnowledgeDocumentChunk)
        .filter(KnowledgeDocumentChunk.organization_id == org_id)
        .count()
    )
    queries = (
        db.query(KnowledgeQuery)
        .filter(KnowledgeQuery.organization_id == org_id)
        .all()
    )

    type_counts = Counter(document.document_type for document in documents)
    status_counts = Counter(document.status for document in documents)
    topic_counts = Counter(query.question_text for query in queries)
    accessed_document_ids = Counter()
    gap_topics = Counter()
    for query in queries:
        matched_document_ids = json.loads(query.matched_document_ids or "[]")
        if not matched_document_ids:
            gap_topics[query.question_text] += 1
        for document_id in matched_document_ids:
            accessed_document_ids[document_id] += 1

    document_titles = {document.id: document.title for document in documents}
    return {
        "documents_total": len(documents),
        "documents_active": sum(1 for document in documents if document.is_active),
        "chunks_total": chunks_count,
        "queries_total": len(queries),
        "document_types": dict(type_counts),
        "processing_status": dict(status_counts),
        "most_searched_topics": [
            {"topic": topic, "count": count}
            for topic, count in topic_counts.most_common(10)
        ],
        "most_accessed_documents": [
            {
                "document_id": document_id,
                "title": document_titles.get(document_id, f"Document {document_id}"),
                "count": count,
            }
            for document_id, count in accessed_document_ids.most_common(10)
        ],
        "knowledge_gaps": [
            {"topic": topic, "count": count}
            for topic, count in gap_topics.most_common(10)
        ],
    }
