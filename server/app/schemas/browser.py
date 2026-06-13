from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

BROWSER_TASK_TYPES = [
    "job_search",
    "competitor_research",
    "website_extraction",
    "pricing_monitoring",
    "market_data",
    "form_filling",
    "business_information",
    "login_automation",
    "multi_step_workflow",
    "general",
]

BROWSER_TEMPLATES: Dict[str, Dict[str, str]] = {
    "job_search": {
        "description": "Extract job listings from a careers or job board page.",
        "example": "Find React developer jobs at https://example.com/careers",
        "task_type": "job_search",
    },
    "competitor_research": {
        "description": "Gather competitor website information and positioning.",
        "example": "Research competitors at https://example.com/about",
        "task_type": "competitor_research",
    },
    "website_extraction": {
        "description": "Extract links, headings, and page content from a website.",
        "example": "Extract key information from https://example.com",
        "task_type": "website_extraction",
    },
    "pricing_monitoring": {
        "description": "Detect and collect pricing information from a product page.",
        "example": "Monitor pricing on https://example.com/pricing",
        "task_type": "pricing_monitoring",
    },
    "market_data": {
        "description": "Extract tabular market data from public web pages.",
        "example": "Collect market data tables from https://example.com/market-report",
        "task_type": "market_data",
    },
    "form_filling": {
        "description": "Discover and fill form fields on a public page (optional submit).",
        "example": "Fill the contact form at https://example.com/contact",
        "task_type": "form_filling",
    },
    "login_automation": {
        "description": "Automate login on a public page using provided credentials and selectors.",
        "example": "Login at https://example.com/login with username demo@example.com",
        "task_type": "login_automation",
    },
    "multi_step_workflow": {
        "description": "Run a multi-step browser workflow (navigate, click, fill, wait, extract).",
        "example": "Run workflow on https://example.com with steps to search and extract results",
        "task_type": "multi_step_workflow",
    },
    "business_information": {
        "description": "Gather company name, description, and business details.",
        "example": "Gather business information from https://example.com",
        "task_type": "business_information",
    },
}


class BrowserWorkflowStep(BaseModel):
    action: str = Field(min_length=1, max_length=50)
    selector: Optional[str] = Field(default=None, max_length=500)
    value: Optional[str] = Field(default=None, max_length=2000)
    url: Optional[str] = Field(default=None, max_length=500)
    wait_ms: Optional[int] = Field(default=None, ge=0, le=30000)


class BrowserLoginConfig(BaseModel):
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)
    username_selector: str = Field(default='input[name="username"], input[name="email"], input[type="email"]')
    password_selector: str = Field(default='input[name="password"], input[type="password"]')
    submit_selector: str = Field(default='button[type="submit"], input[type="submit"]')
    login_url: Optional[str] = Field(default=None, max_length=500)


class BrowserTaskRunRequest(BaseModel):
    instruction: str = Field(min_length=3, max_length=5000)
    task_type: str = Field(default="general")
    title: Optional[str] = Field(default=None, max_length=255)
    target_url: Optional[str] = Field(default=None, max_length=500)
    steps: Optional[List[BrowserWorkflowStep]] = None
    form_data: Optional[Dict[str, str]] = None
    login: Optional[BrowserLoginConfig] = None
    submit_form: bool = False
    max_pages: int = Field(default=2, ge=1, le=10)


class BrowserTaskResponse(BaseModel):
    id: int
    organization_id: int
    created_by_user_id: int
    title: str
    instruction: str
    task_type: str
    target_url: Optional[str]
    status: str
    results: List[Dict[str, Any]]
    logs: List[str]
    errors: List[str]
    pages_visited: List[str]
    summary: Optional[str]
    report_text: Optional[str]
    execution_time_ms: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class BrowserMetrics(BaseModel):
    total_tasks: int
    completed_tasks: int
    failed_tasks: int
    average_execution_time_ms: Optional[float]
    success_rate: float
    task_type_breakdown: List[Dict[str, Any]]
