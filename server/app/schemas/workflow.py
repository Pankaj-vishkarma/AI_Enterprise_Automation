from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

WORKFLOW_CATEGORIES = [
    "Employee Onboarding",
    "Leave Approval",
    "Refund Processing",
    "Customer Complaint",
    "Vendor Approval",
    "Document Review",
    "Internal Approval",
    "Custom",
]

WORKFLOW_STATUSES = ["draft", "active", "disabled"]
INSTANCE_STATUSES = ["draft", "in_progress", "approved", "rejected", "completed", "cancelled"]
STEP_TYPES = ["approval", "review", "ai", "user"]
ASSIGNEE_TYPES = ["user", "department", "team", "ai_employee"]

UNASSIGNED_APPROVAL_MESSAGE = "Please select an assignee for all approval steps."

WORKFLOW_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "Employee Onboarding": {
        "description": "Onboard new employees through HR, IT, and manager approvals.",
        "steps": [
            {"name": "HR Document Verification", "step_type": "approval", "assignee_type": "department"},
            {"name": "IT Hardware Provisioning", "step_type": "user", "assignee_type": "department"},
            {"name": "Manager Introduction & SOPs", "step_type": "approval", "assignee_type": "user"},
        ],
    },
    "Leave Approval": {
        "description": "Process employee leave requests through manager, HR, and organization admin approval.",
        "steps": [
            {"name": "Manager Sign-off", "step_type": "approval", "assignee_type": "user"},
            {"name": "HR Leave Record", "step_type": "approval", "assignee_type": "department"},
            {"name": "ORG Admin Final Approval", "step_type": "approval", "assignee_type": "user"},
        ],
    },
    "Refund Processing": {
        "description": "Verify and approve customer refund requests.",
        "steps": [
            {"name": "Support Ticket Verification", "step_type": "review", "assignee_type": "ai_employee"},
            {"name": "Finance Refund Authorization", "step_type": "approval", "assignee_type": "department"},
            {"name": "Customer Notification", "step_type": "ai", "assignee_type": "ai_employee"},
        ],
    },
    "Customer Complaint": {
        "description": "Handle and resolve customer complaints.",
        "steps": [
            {"name": "Triage Complaint", "step_type": "review", "assignee_type": "ai_employee"},
            {"name": "Support Manager Review", "step_type": "approval", "assignee_type": "user"},
            {"name": "Resolution Confirmation", "step_type": "approval", "assignee_type": "user"},
        ],
    },
    "Vendor Approval": {
        "description": "Approve new or updated vendor relationships.",
        "steps": [
            {"name": "Procurement Review", "step_type": "approval", "assignee_type": "department"},
            {"name": "Finance Approval", "step_type": "approval", "assignee_type": "department"},
        ],
    },
    "Document Review": {
        "description": "Review and approve internal documents and policies.",
        "steps": [
            {"name": "AI Document Analysis", "step_type": "ai", "assignee_type": "ai_employee"},
            {"name": "Compliance Review", "step_type": "approval", "assignee_type": "user"},
            {"name": "Final Approval", "step_type": "approval", "assignee_type": "user"},
        ],
    },
    "Internal Approval": {
        "description": "Generic internal multi-step approval process.",
        "steps": [
            {"name": "Requester Submission", "step_type": "user", "assignee_type": "user"},
            {"name": "Department Head Approval", "step_type": "approval", "assignee_type": "department"},
            {"name": "Executive Sign-off", "step_type": "approval", "assignee_type": "user"},
        ],
    },
}


class WorkflowStepInput(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    step_type: str = Field(default="approval")
    assignee_type: Optional[str] = None
    assignee_id: Optional[int] = None
    position: int = 0
    config: Dict[str, Any] = Field(default_factory=dict)


class WorkflowCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    category: str = Field(default="Custom")
    status: str = Field(default="draft")
    steps: List[WorkflowStepInput] = Field(default_factory=list)


class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    steps: Optional[List[WorkflowStepInput]] = None


class WorkflowStepResponse(BaseModel):
    id: int
    position: int
    name: str
    step_type: str
    assignee_type: Optional[str] = None
    assignee_id: Optional[int] = None
    assignee_label: Optional[str] = None
    config: Dict[str, Any] = Field(default_factory=dict)


class WorkflowResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    description: Optional[str] = None
    category: str
    status: str
    steps: List[WorkflowStepResponse] = Field(default_factory=list)
    step_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class InstanceStartRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class StepActionRequest(BaseModel):
    comment: Optional[str] = None


class InstanceStepResponse(BaseModel):
    id: int
    position: int
    name: str
    step_type: str
    assignee_type: Optional[str] = None
    assignee_id: Optional[int] = None
    assignee_label: Optional[str] = None
    status: str
    comments: Optional[str] = None
    acted_by_user_id: Optional[int] = None
    acted_at: Optional[datetime] = None
    ai_output: Optional[str] = None


class AuditLogResponse(BaseModel):
    id: int
    action: str
    message: Optional[str] = None
    user_id: Optional[int] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None


class WorkflowInstanceResponse(BaseModel):
    id: int
    workflow_id: int
    workflow_name: Optional[str] = None
    organization_id: int
    title: str
    status: str
    current_step_index: int
    progress_percent: int = 0
    steps: List[InstanceStepResponse] = Field(default_factory=list)
    audit_logs: List[AuditLogResponse] = Field(default_factory=list)
    started_by_user_id: int
    started_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class WorkflowMetrics(BaseModel):
    total_workflows: int
    active_workflows: int
    total_instances: int
    completed_instances: int
    in_progress_instances: int
    rejected_instances: int
    completion_rate: float
