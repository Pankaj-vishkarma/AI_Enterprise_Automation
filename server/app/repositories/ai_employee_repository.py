import json
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from app.models.ai_employee import AIEmployee
from app.models.ai_employee_run import AIEmployeeRun


class AIEmployeeRepository:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def serialize(employee: AIEmployee, include_runs: bool = True) -> dict:
        runs = sorted(employee.runs or [], key=lambda item: item.id, reverse=True) if include_runs else []
        knowledge_ids = json.loads(employee.knowledge_document_ids_json or "[]")
        return {
            "id": employee.id,
            "organization_id": employee.organization_id,
            "created_by_user_id": employee.created_by_user_id,
            "module": "ai-employees",
            "record_type": "ai_employee",
            "title": employee.name,
            "status": employee.status,
            "data": {
                "role": employee.role,
                "department_id": employee.department_id,
                "department": employee.department.name if employee.department else None,
                "model": employee.model,
                "instructions": employee.instructions,
                "tools": json.loads(employee.tools_json or "[]"),
                "knowledge_document_ids": knowledge_ids,
                "is_active": employee.is_active,
                "runs": [
                    {
                        "id": run.id,
                        "task": run.task,
                        "output": run.output,
                        "status": run.status,
                        "tools_used": json.loads(run.tools_used_json or "[]"),
                        "execution_time_ms": run.execution_time_ms,
                        "token_usage": json.loads(run.token_usage_json or "{}"),
                        "created_at": run.created_at,
                    }
                    for run in runs[:20]
                ],
                "metrics": AIEmployeeRepository._compute_metrics_from_runs(runs),
            },
            "created_at": employee.created_at,
            "updated_at": employee.updated_at,
        }

    @staticmethod
    def _compute_metrics_from_runs(runs: List[AIEmployeeRun]) -> dict:
        if not runs:
            return {
                "total_runs": 0,
                "successful_runs": 0,
                "failed_runs": 0,
                "average_execution_time_ms": None,
                "last_run_at": None,
                "most_used_tools": [],
            }
        tool_counter: Counter = Counter()
        execution_times = []
        for run in runs:
            for tool in json.loads(run.tools_used_json or "[]"):
                tool_counter[tool] += 1
            if run.execution_time_ms is not None:
                execution_times.append(run.execution_time_ms)
        completed = sum(1 for run in runs if run.status == "completed")
        failed = sum(1 for run in runs if run.status == "failed")
        return {
            "total_runs": len(runs),
            "successful_runs": completed,
            "failed_runs": failed,
            "average_execution_time_ms": (
                round(sum(execution_times) / len(execution_times), 1) if execution_times else None
            ),
            "last_run_at": runs[0].created_at if runs else None,
            "most_used_tools": [
                {"tool": tool, "count": count} for tool, count in tool_counter.most_common(10)
            ],
        }

    def list(self, organization_id: int, include_deleted: bool = False):
        query = (
            self.db.query(AIEmployee)
            .options(joinedload(AIEmployee.department), joinedload(AIEmployee.runs))
            .filter(AIEmployee.organization_id == organization_id)
        )
        if not include_deleted:
            query = query.filter(AIEmployee.is_deleted.is_(False))
        return query.order_by(AIEmployee.updated_at.desc(), AIEmployee.id.desc()).all()

    def get(self, organization_id: int, employee_id: int, include_deleted: bool = False):
        query = (
            self.db.query(AIEmployee)
            .options(joinedload(AIEmployee.department), joinedload(AIEmployee.runs))
            .filter(
                AIEmployee.organization_id == organization_id,
                AIEmployee.id == employee_id,
            )
        )
        if not include_deleted:
            query = query.filter(AIEmployee.is_deleted.is_(False))
        return query.first()

    def create(self, organization_id: int, user_id: int, payload: Dict[str, Any]):
        data = payload.get("data", {})
        employee = AIEmployee(
            organization_id=organization_id,
            created_by_user_id=user_id,
            department_id=data.get("department_id"),
            name=payload["title"],
            role=data.get("role", "Assistant"),
            model=data.get("model"),
            instructions=data.get("instructions", ""),
            tools_json=json.dumps(data.get("tools", [])),
            knowledge_document_ids_json=json.dumps(data.get("knowledge_document_ids", [])),
            status=payload.get("status", "Active"),
            is_active=payload.get("status", "Active").lower() not in {"inactive", "disabled"},
        )
        self.db.add(employee)
        self.db.commit()
        self.db.refresh(employee)
        return self.get(organization_id, employee.id)

    def update(self, employee: AIEmployee, payload: Dict[str, Any]):
        data = payload.get("data") or {}
        if payload.get("title") is not None:
            employee.name = payload["title"]
        if payload.get("status") is not None:
            employee.status = payload["status"]
            employee.is_active = payload["status"].lower() not in {"inactive", "disabled"}
        if "role" in data:
            employee.role = data["role"]
        if "department_id" in data:
            employee.department_id = data["department_id"]
        if "model" in data:
            employee.model = data["model"]
        if "instructions" in data:
            employee.instructions = data["instructions"]
        if "tools" in data:
            employee.tools_json = json.dumps(data["tools"])
        if "knowledge_document_ids" in data:
            employee.knowledge_document_ids_json = json.dumps(data["knowledge_document_ids"])
        self.db.commit()
        self.db.refresh(employee)
        return employee

    def set_active(self, employee: AIEmployee, active: bool):
        employee.is_active = active
        employee.status = "Active" if active else "Inactive"
        self.db.commit()
        self.db.refresh(employee)
        return employee

    def soft_delete(self, employee: AIEmployee):
        employee.is_deleted = True
        employee.is_active = False
        employee.status = "Deleted"
        employee.deleted_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(employee)
        return employee

    def count_active(self, organization_id: int) -> int:
        return (
            self.db.query(AIEmployee)
            .filter(
                AIEmployee.organization_id == organization_id,
                AIEmployee.is_deleted.is_(False),
                AIEmployee.is_active.is_(True),
                AIEmployee.status == "Active",
            )
            .count()
        )

    def count_total(self, organization_id: int) -> int:
        return (
            self.db.query(AIEmployee)
            .filter(
                AIEmployee.organization_id == organization_id,
                AIEmployee.is_deleted.is_(False),
            )
            .count()
        )

    def employee_name_map(self, organization_id: int) -> dict[int, str]:
        rows = (
            self.db.query(AIEmployee.id, AIEmployee.name)
            .filter(
                AIEmployee.organization_id == organization_id,
                AIEmployee.is_deleted.is_(False),
            )
            .all()
        )
        return {row[0]: row[1] for row in rows}

    def list_runs(self, organization_id: int, employee_id: int, limit: int = 50, offset: int = 0):
        return (
            self.db.query(AIEmployeeRun)
            .filter(
                AIEmployeeRun.organization_id == organization_id,
                AIEmployeeRun.employee_id == employee_id,
            )
            .order_by(AIEmployeeRun.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def serialize_run(self, run: AIEmployeeRun) -> dict:
        return {
            "id": run.id,
            "employee_id": run.employee_id,
            "task": run.task,
            "output": run.output,
            "status": run.status,
            "tools_used": json.loads(run.tools_used_json or "[]"),
            "execution_time_ms": run.execution_time_ms,
            "token_usage": json.loads(run.token_usage_json or "{}"),
            "created_at": run.created_at,
        }

    def create_run(
        self,
        organization_id: int,
        employee_id: int,
        user_id: int,
        task: str,
        output: str,
        status: str,
        tools_used: List[str],
        execution_time_ms: Optional[int] = None,
        token_usage: Optional[Dict[str, Any]] = None,
    ):
        run = AIEmployeeRun(
            organization_id=organization_id,
            employee_id=employee_id,
            user_id=user_id,
            task=task,
            output=output,
            status=status,
            tools_used_json=json.dumps(tools_used),
            execution_time_ms=execution_time_ms,
            token_usage_json=json.dumps(token_usage or {}),
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def get_metrics(self, organization_id: int, employee_id: int) -> dict:
        runs = (
            self.db.query(AIEmployeeRun)
            .filter(
                AIEmployeeRun.organization_id == organization_id,
                AIEmployeeRun.employee_id == employee_id,
            )
            .order_by(AIEmployeeRun.id.desc())
            .all()
        )
        return self._compute_metrics_from_runs(runs)
