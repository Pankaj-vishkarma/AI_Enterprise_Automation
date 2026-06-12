from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AnalyticsDateRange(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class AnalyticsSummaryResponse(BaseModel):
    knowledge_queries: int = 0
    active_ai_employees: int = 0
    workflow_completion_rate: float = 0.0
    resolved_support_tickets: int = 0
    total_conversations: int = 0
    total_voice_sessions: int = 0
    total_research_reports: int = 0
    active_users: int = 0


class AnalyticsDashboardResponse(BaseModel):
    summary: AnalyticsSummaryResponse
    knowledge: Dict[str, Any]
    employees: Dict[str, Any]
    workflows: Dict[str, Any]
    support: Dict[str, Any]
    research: Dict[str, Any]
    browser: Dict[str, Any]
    voice: Dict[str, Any]
    omnichannel: Dict[str, Any]
    organization: Dict[str, Any]
    collaboration: Dict[str, Any]
    generated_at: datetime
    date_range: Dict[str, Optional[datetime]]


class AnalyticsReportResponse(BaseModel):
    report_type: str
    format: str
    title: str
    content: str
    data: Dict[str, Any] = Field(default_factory=dict)
    generated_at: datetime


# Backward-compatible overview shape used by operations API
class AnalyticsOverviewResponse(BaseModel):
    summary: Dict[str, Any]
    knowledge: Dict[str, Any]
    employees: Dict[str, Any]
    workflows: Dict[str, Any]
    support: Dict[str, Any]
