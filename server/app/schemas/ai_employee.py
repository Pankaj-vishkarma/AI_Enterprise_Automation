from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


EMPLOYEE_TYPES = [
    "HR Assistant",
    "Support Assistant",
    "Sales Assistant",
    "Research Assistant",
    "Documentation Assistant",
]

AVAILABLE_TOOLS = [
    "Knowledge Search",
    "Research Tool",
    "Browser Automation",
    "Document Generator",
]

GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
]

EMPLOYEE_TYPE_PRESETS: Dict[str, Dict[str, Any]] = {
    "HR Assistant": {
        "instructions": (
            "Help employees with leave policies, benefits information, reimbursement, "
            "and company procedures. Provide accurate, empathetic responses grounded "
            "in organizational knowledge."
        ),
        "default_tools": ["Knowledge Search"],
    },
    "Support Assistant": {
        "instructions": (
            "Handle customer inquiries, provide product guidance, and assist with "
            "troubleshooting. Escalate complex issues when appropriate."
        ),
        "default_tools": ["Knowledge Search", "Research Tool"],
    },
    "Sales Assistant": {
        "instructions": (
            "Provide product recommendations, qualify inbound leads, and deliver "
            "accurate pricing information based on available knowledge."
        ),
        "default_tools": ["Knowledge Search", "Research Tool"],
    },
    "Research Assistant": {
        "instructions": (
            "Perform market research, analyze industry trends, and monitor competitor "
            "activities. Produce structured findings with assumptions and risks."
        ),
        "default_tools": ["Knowledge Search", "Research Tool", "Browser Automation"],
    },
    "Documentation Assistant": {
        "instructions": (
            "Generate internal documentation, draft SOPs, write policy revisions, "
            "and organize guides using organizational context."
        ),
        "default_tools": ["Knowledge Search", "Document Generator"],
    },
}


class AIEmployeeData(BaseModel):
    role: str = Field(min_length=1, max_length=100)
    department_id: Optional[int] = None
    model: Optional[str] = None
    instructions: str = ""
    tools: List[str] = Field(default_factory=list)
    knowledge_document_ids: List[int] = Field(default_factory=list)


class AIEmployeeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    status: str = Field(default="Active", max_length=50)
    data: AIEmployeeData


class AIEmployeeUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    status: Optional[str] = Field(default=None, max_length=50)
    data: Optional[AIEmployeeData] = None


class AIEmployeeRunResponse(BaseModel):
    id: int
    employee_id: int
    task: str
    output: str
    status: str
    tools_used: List[str]
    execution_time_ms: Optional[int] = None
    token_usage: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None


class AIEmployeeMetrics(BaseModel):
    total_runs: int
    successful_runs: int
    failed_runs: int
    average_execution_time_ms: Optional[float] = None
    last_run_at: Optional[datetime] = None
    most_used_tools: List[Dict[str, Any]] = Field(default_factory=list)


class AIEmployeeResponse(BaseModel):
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


class AIEmployeeRunRequest(BaseModel):
    task: str = Field(min_length=1)


class AIEmployeeRunResult(BaseModel):
    employee_id: int
    run_id: int
    task: str
    output: str
    status: str
    tools_used: List[str]
    execution_time_ms: Optional[int] = None
    token_usage: Dict[str, Any] = Field(default_factory=dict)
