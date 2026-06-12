from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


SUPPORT_CATEGORIES = [
    "Billing Issues",
    "Technical Problems",
    "Account Requests",
    "Complaints",
    "Feature Requests",
    "General Questions",
]

SUPPORT_STATUSES = ["New", "In Progress", "Resolved", "Closed"]
SUPPORT_PRIORITIES = ["low", "medium", "high", "urgent"]
SUPPORT_SENTIMENTS = ["Positive", "Neutral", "Negative"]


class SupportTicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    customer: str = Field(min_length=3, max_length=255)
    message: str = Field(min_length=1)
    category: Optional[str] = None
    priority: str = Field(default="medium", max_length=20)
    status: str = Field(default="New", max_length=50)


class SupportTicketUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    status: Optional[str] = Field(default=None, max_length=50)
    priority: Optional[str] = Field(default=None, max_length=20)
    category: Optional[str] = None
    message: Optional[str] = None
    customer: Optional[str] = None


class SupportAssignRequest(BaseModel):
    user_id: Optional[int] = None
    team_id: Optional[int] = None
    department_id: Optional[int] = None


class SupportEscalateRequest(BaseModel):
    reason: str = Field(default="Manual escalation", max_length=500)


class SupportTicketResponse(BaseModel):
    id: int
    ticket_number: str
    organization_id: int
    created_by_user_id: int
    title: str
    status: str
    priority: str
    category: str
    customer: str
    message: str
    sentiment: str
    ai_recommendation: str
    escalated: bool
    escalation_history: List[Dict[str, Any]] = Field(default_factory=list)
    assigned_to_user_id: Optional[int] = None
    assigned_to_team_id: Optional[int] = None
    assigned_to_department_id: Optional[int] = None
    assigned_to_label: Optional[str] = None
    resolved_at: Optional[str] = None
    reopened_at: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SupportMetricsResponse(BaseModel):
    total_tickets: int
    open_tickets: int
    resolved_tickets: int
    closed_tickets: int
    resolution_rate: float
    escalation_rate: float
    average_resolution_hours: Optional[float] = None
    category_distribution: Dict[str, int]
    sentiment_distribution: Dict[str, int]
    priority_distribution: Dict[str, int]
