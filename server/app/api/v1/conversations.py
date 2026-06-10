from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    require_permission,
    KNOWLEDGE_VIEW_PERMISSION,
    KNOWLEDGE_MANAGE_PERMISSION,
)
from app.services.conversation_service import ConversationService
from app.schemas.conversation import (
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)

router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])


@router.post("", response_model=ConversationResponse)
def create_conversation(
    payload: ConversationCreate,
    current_user=Depends(require_permission(KNOWLEDGE_MANAGE_PERMISSION)),
    db: Session = Depends(get_db),
):
    svc = ConversationService(db)
    conv = svc.create_conversation(current_user, payload.title)
    return conv


@router.get("", response_model=list[ConversationResponse])
def list_conversations(
    current_user=Depends(require_permission(KNOWLEDGE_VIEW_PERMISSION)),
    db: Session = Depends(get_db),
):
    svc = ConversationService(db)
    return svc.list_conversations(current_user)


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: int,
    current_user=Depends(require_permission(KNOWLEDGE_VIEW_PERMISSION)),
    db: Session = Depends(get_db),
):
    svc = ConversationService(db)
    conv = svc.get_conversation(current_user, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    return conv


@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    current_user=Depends(require_permission(KNOWLEDGE_MANAGE_PERMISSION)),
    db: Session = Depends(get_db),
):
    svc = ConversationService(db)
    conv = svc.delete_conversation(current_user, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True}


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
def post_message(
    conversation_id: int,
    payload: MessageCreate,
    current_user=Depends(require_permission(KNOWLEDGE_MANAGE_PERMISSION)),
    db: Session = Depends(get_db),
):
    svc = ConversationService(db)
    msg = svc.post_message(
        current_user,
        conversation_id,
        payload.role,
        payload.content,
        payload.message_metadata,
    )
    if not msg:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return msg


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def list_messages(
    conversation_id: int,
    current_user=Depends(require_permission(KNOWLEDGE_VIEW_PERMISSION)),
    db: Session = Depends(get_db),
):
    svc = ConversationService(db)
    msgs = svc.list_messages(current_user, conversation_id)
    if msgs is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return msgs
