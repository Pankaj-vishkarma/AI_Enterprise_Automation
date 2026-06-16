from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.services.omnichannel.provider_registry import OMNICHANNEL_CHANNELS


class OmnichannelMessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_type: str
    sender_user_id: Optional[int] = None
    content: str
    delivery_status: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None


class OmnichannelConversationCreate(BaseModel):
    channel: str = Field(default="Website Chat")
    participant_name: str = Field(min_length=1, max_length=255)
    participant_email: Optional[str] = None
    participant_company: Optional[str] = None
    initial_message: Optional[str] = None
    status: str = Field(default="AI Active")


class OmnichannelConversationUpdate(BaseModel):
    participant_name: Optional[str] = None
    participant_email: Optional[str] = None
    participant_company: Optional[str] = None
    status: Optional[str] = None


class OmnichannelMessageCreate(BaseModel):
    content: str = Field(min_length=1)
    sender_type: str = Field(default="human", max_length=32)


class OmnichannelHandoffRequest(BaseModel):
    reason: str = Field(default="Customer requested human agent", max_length=500)
    user_id: Optional[int] = None
    team_id: Optional[int] = None
    department_id: Optional[int] = None


class OmnichannelInboundMessage(BaseModel):
    channel: str
    thread_id: Optional[str] = None
    sender_name: str = Field(default="Guest")
    sender_email: Optional[str] = None
    sender_company: Optional[str] = None
    content: str = Field(min_length=1)


class OmnichannelConversationResponse(BaseModel):
    id: int
    organization_id: int
    channel: str
    participant_name: str
    participant_email: Optional[str] = None
    participant_company: Optional[str] = None
    status: str
    handoff_status: str
    assigned_to_user_id: Optional[int] = None
    assigned_to_team_id: Optional[int] = None
    assigned_to_department_id: Optional[int] = None
    assigned_to_label: Optional[str] = None
    shared_context: Optional[str] = None
    ai_suggestion: Optional[str] = None
    summary: Optional[str] = None
    support_ticket_id: Optional[int] = None
    external_thread_id: Optional[str] = None
    handoff_history: List[Dict[str, Any]] = Field(default_factory=list)
    participants: List[Dict[str, Any]] = Field(default_factory=list)
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None
    messages: List[OmnichannelMessageResponse] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class OmnichannelSummaryResponse(BaseModel):
    conversation_id: int
    summary: str


class OmnichannelChannelsResponse(BaseModel):
    channels: List[str] = OMNICHANNEL_CHANNELS
