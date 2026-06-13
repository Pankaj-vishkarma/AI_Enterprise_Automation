from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.schemas.omnichannel import (
    OmnichannelChannelsResponse,
    OmnichannelConversationCreate,
    OmnichannelConversationResponse,
    OmnichannelConversationUpdate,
    OmnichannelHandoffRequest,
    OmnichannelInboundMessage,
    OmnichannelMessageCreate,
    OmnichannelSummaryResponse,
)
from app.services.omnichannel_service import OmnichannelService

router = APIRouter(prefix="/api/v1/omnichannel", tags=["omnichannel"])


@router.get("/channels", response_model=OmnichannelChannelsResponse)
def list_channels():
    from app.services.omnichannel.provider_registry import OMNICHANNEL_CHANNELS
    return {"channels": OMNICHANNEL_CHANNELS}


@router.get("/conversations", response_model=List[OmnichannelConversationResponse])
def list_conversations(
    channel: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return OmnichannelService(db).list_conversations(current_user, channel=channel, status=status)


@router.get("/conversations/{conversation_id}", response_model=OmnichannelConversationResponse)
def get_conversation(
    conversation_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    conv = OmnichannelService(db).get_conversation(current_user, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


@router.post("/conversations", response_model=OmnichannelConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: OmnichannelConversationCreate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        return OmnichannelService(db).create_conversation(current_user, payload.model_dump())
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/conversations/{conversation_id}", response_model=OmnichannelConversationResponse)
def update_conversation(
    conversation_id: int,
    payload: OmnichannelConversationUpdate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    conv = OmnichannelService(db).update_conversation(
        current_user, conversation_id, payload.model_dump(exclude_unset=True)
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


@router.post("/conversations/{conversation_id}/messages", response_model=OmnichannelConversationResponse)
def post_message(
    conversation_id: int,
    payload: OmnichannelMessageCreate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    conv = OmnichannelService(db).post_message(
        current_user, conversation_id, payload.model_dump(), auto_ai_reply=True
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


@router.post("/conversations/{conversation_id}/handoff", response_model=OmnichannelConversationResponse)
def handoff_conversation(
    conversation_id: int,
    payload: OmnichannelHandoffRequest,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        conv = OmnichannelService(db).handoff_to_human(
            current_user, conversation_id, payload.model_dump(exclude_unset=True)
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


@router.post("/conversations/{conversation_id}/return-to-ai", response_model=OmnichannelConversationResponse)
def return_to_ai(
    conversation_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    conv = OmnichannelService(db).return_to_ai(current_user, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


@router.post("/conversations/{conversation_id}/suggest", response_model=OmnichannelConversationResponse)
def regenerate_suggestion(
    conversation_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    conv = OmnichannelService(db).regenerate_suggestion(current_user, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


@router.post("/conversations/{conversation_id}/context", response_model=OmnichannelConversationResponse)
def refresh_context(
    conversation_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    conv = OmnichannelService(db).refresh_context(current_user, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


@router.post("/conversations/{conversation_id}/summary", response_model=OmnichannelSummaryResponse)
def generate_summary(
    conversation_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    result = OmnichannelService(db).generate_summary(current_user, conversation_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return result


@router.post("/conversations/{conversation_id}/support-ticket", response_model=OmnichannelConversationResponse)
def create_support_ticket(
    conversation_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    result = OmnichannelService(db).create_support_ticket(current_user, conversation_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return result


@router.post("/inbound", response_model=OmnichannelConversationResponse)
def ingest_inbound_message(
    payload: OmnichannelInboundMessage,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        return OmnichannelService(db).ingest_inbound(current_user, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
