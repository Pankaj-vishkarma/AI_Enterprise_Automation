from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class OperationalRecordCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    record_type: str = Field(default="item", max_length=50)
    status: str = Field(default="active", max_length=50)
    data: Dict[str, Any] = Field(default_factory=dict)


class OperationalRecordUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    status: Optional[str] = Field(default=None, max_length=50)
    data: Optional[Dict[str, Any]] = None


class OperationalRecordResponse(BaseModel):
    id: int
    organization_id: int
    created_by_user_id: int
    module: str
    record_type: str
    title: str
    status: str
    data: Dict[str, Any]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CollaborationRequest(BaseModel):
    prompt: str = Field(min_length=1)
    team_id: int | None = None
    team: str | None = None


class ReasoningRequest(BaseModel):
    prompt: str = Field(min_length=1)


class AgentTaskRequest(BaseModel):
    task: str = Field(min_length=1)


class VoiceQueryRequest(BaseModel):
    transcript: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)


class AnalyticsResponse(BaseModel):
    summary: Dict[str, Any]
    knowledge: Dict[str, Any]
    employees: Dict[str, Any]
    workflows: Dict[str, Any]
    support: Dict[str, Any]
