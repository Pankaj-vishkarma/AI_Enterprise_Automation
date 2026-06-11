from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TeamMemberInput(BaseModel):
    ai_employee_id: int
    position: int = 0


class CollaborationTeamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    members: List[TeamMemberInput] = Field(default_factory=list)


class CollaborationTeamUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    members: Optional[List[TeamMemberInput]] = None


class TeamMemberResponse(BaseModel):
    id: int
    ai_employee_id: int
    position: int
    employee_name: Optional[str] = None
    employee_role: Optional[str] = None
    employee_status: Optional[str] = None


class CollaborationTeamResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    description: Optional[str] = None
    members: List[TeamMemberResponse] = Field(default_factory=list)
    member_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CollaborationRunRequest(BaseModel):
    team_id: int
    task: str = Field(min_length=1)


class AgentStepOutput(BaseModel):
    employee_id: int
    employee_name: str
    employee_role: str
    position: int
    status: str
    output: str
    tools_used: List[str] = Field(default_factory=list)
    execution_time_ms: Optional[int] = None
    token_usage: Dict[str, Any] = Field(default_factory=dict)


class FailureInfo(BaseModel):
    employee_id: Optional[int] = None
    employee_name: Optional[str] = None
    reason: str
    partial_outputs: List[AgentStepOutput] = Field(default_factory=list)


class CollaborationRunResponse(BaseModel):
    id: int
    organization_id: int
    team_id: int
    team_name: Optional[str] = None
    task: str
    status: str
    final_output: str
    intermediate_outputs: List[AgentStepOutput] = Field(default_factory=list)
    participating_agents: List[Dict[str, Any]] = Field(default_factory=list)
    failure_info: Optional[FailureInfo] = None
    execution_time_ms: Optional[int] = None
    token_usage: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None


class CollaborationMetrics(BaseModel):
    total_runs: int
    successful_runs: int
    failed_runs: int
    partial_runs: int
    success_rate: float
    average_execution_time_ms: Optional[float] = None
    most_used_teams: List[Dict[str, Any]] = Field(default_factory=list)
    most_used_agents: List[Dict[str, Any]] = Field(default_factory=list)
