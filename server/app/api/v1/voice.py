from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.schemas.voice import (
    VoiceAnalyticsResponse,
    VoiceMeetingCreate,
    VoiceMeetingResponse,
    VoiceQueryRequest,
    VoiceQueryResponse,
    VoiceSessionCreate,
    VoiceSessionDetailResponse,
    VoiceSessionResponse,
)
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/api/v1/voice", tags=["voice"])


@router.post("/sessions", response_model=VoiceSessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: VoiceSessionCreate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return VoiceService(db).create_session(current_user, payload.assistant_preference)


@router.get("/sessions", response_model=List[VoiceSessionResponse])
def list_sessions(
    limit: int = Query(default=50, ge=1, le=200),
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return VoiceService(db).list_sessions(current_user, limit)


@router.get("/sessions/{session_id}", response_model=VoiceSessionDetailResponse)
def get_session(
    session_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        return VoiceService(db).get_session(current_user, session_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/sessions/{session_id}/close", response_model=VoiceSessionResponse)
def close_session(
    session_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        return VoiceService(db).close_session(current_user, session_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/query", response_model=VoiceQueryResponse)
def voice_query(
    payload: VoiceQueryRequest,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        return VoiceService(db).process_query(
            current_user,
            payload.transcript,
            session_id=payload.session_id,
            employee_id=payload.employee_id,
            assistant_role=payload.assistant_role,
            top_k=payload.top_k,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/interactions")
def list_interactions(
    limit: int = Query(default=100, ge=1, le=500),
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return VoiceService(db).list_interactions(current_user, limit)


@router.post("/meetings", response_model=VoiceMeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(
    payload: VoiceMeetingCreate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return VoiceService(db).create_meeting(
        current_user,
        payload.model_dump(),
        session_id=payload.session_id,
    )


@router.get("/meetings", response_model=List[VoiceMeetingResponse])
def list_meetings(
    limit: int = Query(default=50, ge=1, le=200),
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return VoiceService(db).list_meetings(current_user, limit)


@router.get("/analytics", response_model=VoiceAnalyticsResponse)
def voice_analytics(
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return VoiceService(db).get_analytics(current_user)
