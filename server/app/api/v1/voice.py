from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission, VOICE_ACCESS_PERMISSION
from app.schemas.voice import (
    VoiceAnalyticsResponse,
    VoiceCapabilitiesResponse,
    VoiceMeetingCreate,
    VoiceMeetingResponse,
    VoiceQueryRequest,
    VoiceQueryResponse,
    VoiceSessionCreate,
    VoiceSessionDetailResponse,
    VoiceSessionResponse,
    VoiceSpeechQueryResponse,
    VoiceSttResponse,
    VoiceTtsRequest,
)
from app.services.voice_audio_service import VoiceAudioService
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/api/v1/voice", tags=["voice"])

require_voice_access = require_permission(VOICE_ACCESS_PERMISSION)


@router.post("/sessions", response_model=VoiceSessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: VoiceSessionCreate,
    current_user=Depends(require_voice_access),
    db: Session = Depends(get_db),
):
    return VoiceService(db).create_session(current_user, payload.assistant_preference)


@router.get("/sessions", response_model=List[VoiceSessionResponse])
def list_sessions(
    limit: int = Query(default=50, ge=1, le=200),
    current_user=Depends(require_voice_access),
    db: Session = Depends(get_db),
):
    return VoiceService(db).list_sessions(current_user, limit)


@router.get("/sessions/{session_id}", response_model=VoiceSessionDetailResponse)
def get_session(
    session_id: int,
    current_user=Depends(require_voice_access),
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
    current_user=Depends(require_voice_access),
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
    current_user=Depends(require_voice_access),
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
    current_user=Depends(require_voice_access),
    db: Session = Depends(get_db),
):
    return VoiceService(db).list_interactions(current_user, limit)


@router.post("/meetings", response_model=VoiceMeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(
    payload: VoiceMeetingCreate,
    current_user=Depends(require_voice_access),
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
    current_user=Depends(require_voice_access),
    db: Session = Depends(get_db),
):
    return VoiceService(db).list_meetings(current_user, limit)


@router.get("/analytics", response_model=VoiceAnalyticsResponse)
def voice_analytics(
    current_user=Depends(require_voice_access),
    db: Session = Depends(get_db),
):
    return VoiceService(db).get_analytics(current_user)


@router.get("/capabilities", response_model=VoiceCapabilitiesResponse)
def voice_capabilities(
    current_user=Depends(require_voice_access),
):
    return VoiceAudioService().capabilities()


@router.post("/stt", response_model=VoiceSttResponse)
async def speech_to_text(
    file: UploadFile = File(...),
    current_user=Depends(require_voice_access),
):
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Audio file is empty")
    transcript, provider = VoiceAudioService().transcribe(audio_bytes, filename=file.filename or "audio.webm")
    if not transcript:
        return VoiceSttResponse(transcript="", provider="browser", fallback=True)
    return VoiceSttResponse(transcript=transcript, provider=provider, fallback=False)


@router.post("/tts")
def text_to_speech(
    payload: VoiceTtsRequest,
    current_user=Depends(require_voice_access),
):
    audio_bytes, provider, content_type = VoiceAudioService().synthesize(payload.text)
    if audio_bytes:
        return Response(content=audio_bytes, media_type=content_type)
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={"message": "Server TTS unavailable", "fallback": "browser", "provider": provider},
    )


@router.post("/speech/query", response_model=VoiceSpeechQueryResponse)
async def speech_query(
    file: UploadFile = File(None),
    transcript: Optional[str] = Query(default=None),
    session_id: Optional[int] = Query(default=None),
    employee_id: Optional[int] = Query(default=None),
    assistant_role: Optional[str] = Query(default=None),
    top_k: int = Query(default=5, ge=1, le=20),
    include_tts: bool = Query(default=True),
    current_user=Depends(require_voice_access),
    db: Session = Depends(get_db),
):
    audio_service = VoiceAudioService()
    stt_provider = "browser"
    if file is not None:
        audio_bytes = await file.read()
        if audio_bytes:
            transcript, stt_provider = audio_service.transcribe(
                audio_bytes,
                filename=file.filename or "audio.webm",
            )
    if not transcript or not transcript.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript required (upload audio or pass transcript query param)",
        )
    try:
        result = VoiceService(db).process_query(
            current_user,
            transcript.strip(),
            session_id=session_id,
            employee_id=employee_id,
            assistant_role=assistant_role,
            top_k=top_k,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    tts_provider = "browser"
    audio_base64 = None
    if include_tts:
        audio_bytes, tts_provider, _ = audio_service.synthesize(result.get("answer") or "")
        if audio_bytes:
            import base64
            audio_base64 = base64.b64encode(audio_bytes).decode("ascii")

    return VoiceSpeechQueryResponse(
        **result,
        stt_provider=stt_provider,
        tts_provider=tts_provider,
        tts_fallback=tts_provider == "browser",
        audio_base64=audio_base64,
    )
