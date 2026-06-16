from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class VoiceSessionCreate(BaseModel):
    assistant_preference: Optional[str] = Field(default=None, max_length=100)


class VoiceSessionClose(BaseModel):
    pass


class VoiceSessionResponse(BaseModel):
    id: int
    organization_id: int
    user_id: int
    status: str
    assistant_preference: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    interaction_count: int = 0


class VoiceSessionDetailResponse(VoiceSessionResponse):
    interactions: List[Dict[str, Any]] = Field(default_factory=list)


class VoiceQueryRequest(BaseModel):
    transcript: str = Field(min_length=1)
    session_id: Optional[int] = None
    employee_id: Optional[int] = None
    assistant_role: Optional[str] = None
    top_k: int = Field(default=5, ge=1, le=20)


class VoiceQueryResponse(BaseModel):
    id: int
    session_id: Optional[int] = None
    transcript: str
    answer: str
    intent: str
    module_invoked: str
    assistant_used: Optional[str] = None
    duration_ms: Optional[int] = None
    created_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class VoiceMeetingCreate(BaseModel):
    notes: str = Field(min_length=1)
    session_id: Optional[int] = None
    title: Optional[str] = Field(default=None, max_length=255)


class VoiceMeetingResponse(BaseModel):
    id: int
    title: str
    status: str
    notes: str
    summary: str
    action_items: List[str]
    follow_up_recommendations: str
    session_id: Optional[int] = None
    created_at: Optional[datetime] = None


class VoiceAnalyticsResponse(BaseModel):
    total_interactions: int
    total_sessions: int
    active_sessions: int
    most_used_assistants: List[Dict[str, Any]]
    most_used_commands: List[Dict[str, Any]]
    most_used_modules: List[Dict[str, Any]]
    average_session_duration_seconds: Optional[float] = None


class VoiceCapabilitiesResponse(BaseModel):
    stt: Dict[str, Any]
    tts: Dict[str, Any]
    fallback: Dict[str, str]


class VoiceSttResponse(BaseModel):
    transcript: str
    provider: str
    fallback: bool = False


class VoiceTtsRequest(BaseModel):
    text: str = Field(min_length=1)


class VoiceSpeechQueryResponse(VoiceQueryResponse):
    stt_provider: str = "browser"
    tts_provider: str = "browser"
    tts_fallback: bool = True
    audio_base64: Optional[str] = None
