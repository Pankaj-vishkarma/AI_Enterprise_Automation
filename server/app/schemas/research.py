from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

RESEARCH_TYPES = [
    "Market Analysis",
    "Industry Trends",
    "Competitor Research",
    "Product Comparison",
    "Opportunity Analysis",
    "Business Intelligence",
]

RESEARCH_TEMPLATES: Dict[str, Dict[str, str]] = {
    "Market Analysis": {
        "description": "Analyze market size, segments, growth drivers, and competitive landscape.",
        "example": "Analyze the AI market in India.",
    },
    "Industry Trends": {
        "description": "Identify emerging trends, disruptions, and technology shifts in an industry.",
        "example": "What are the top trends shaping enterprise SaaS in 2026?",
    },
    "Competitor Research": {
        "description": "Profile competitors with positioning, strengths, weaknesses, and differentiation.",
        "example": "Research our top three competitors in the HR tech space.",
    },
    "Product Comparison": {
        "description": "Compare products across features, pricing, and target customers.",
        "example": "Compare our product with competitors.",
    },
    "Opportunity Analysis": {
        "description": "Identify growth opportunities, risks, and strategic recommendations.",
        "example": "Identify growth opportunities in healthcare technology.",
    },
    "Business Intelligence": {
        "description": "Executive-ready synthesis of findings, assumptions, and recommendations.",
        "example": "Provide a business intelligence brief on expanding into Southeast Asia.",
    },
}


class ResearchRunRequest(BaseModel):
    request_text: str = Field(min_length=3, max_length=5000)
    research_type: str = Field(default="Business Intelligence")
    title: Optional[str] = Field(default=None, max_length=255)
    use_browser: bool = Field(default=False)


class ResearchReportResponse(BaseModel):
    id: int
    organization_id: int
    created_by_user_id: int
    title: str
    research_type: str
    request_text: str
    status: str
    sources: List[Dict[str, Any]]
    intermediate_findings: List[Dict[str, Any]]
    citations: List[Dict[str, Any]]
    final_report: str
    summary: Optional[str]
    recommendations: Optional[str]
    confidence_score: Optional[float]
    execution_time_ms: Optional[int]
    agent_usage: List[Dict[str, Any]]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ResearchMetrics(BaseModel):
    total_reports: int
    completed_reports: int
    failed_reports: int
    average_execution_time_ms: Optional[float]
    success_rate: float
    most_requested_topics: List[Dict[str, Any]]
    research_type_breakdown: List[Dict[str, Any]]
