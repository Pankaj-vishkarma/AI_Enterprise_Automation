import json

from fastapi import APIRouter, Depends, HTTPException, status
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


@router.get("/documents", response_model=list[KnowledgeDocumentResponse])
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
    response_model=list[KnowledgeDocumentChunkResponse],
)
def add_chunks(
    document_id: int,
    payload: list[KnowledgeDocumentChunkCreate],
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
    response_model=list[KnowledgeDocumentChunkResponse],
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


@router.get("/query-history", response_model=list[KnowledgeQueryHistoryResponse])
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
