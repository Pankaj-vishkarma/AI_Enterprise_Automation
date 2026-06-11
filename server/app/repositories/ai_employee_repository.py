import json
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.ai_employee import AIEmployee
from app.models.ai_employee_run import AIEmployeeRun


class AIEmployeeRepository:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def serialize(employee: AIEmployee) -> dict:
        runs = sorted(employee.runs or [], key=lambda item: item.id, reverse=True)
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
                "runs": [
                    {
                        "id": run.id,
                        "task": run.task,
                        "output": run.output,
                        "status": run.status,
                        "tools_used": json.loads(run.tools_used_json or "[]"),
                        "created_at": run.created_at,
                    }
                    for run in runs[:20]
                ],
                "metrics": {
                    "total_runs": len(runs),
                    "completed_runs": sum(1 for run in runs if run.status == "completed"),
                    "failed_runs": sum(1 for run in runs if run.status == "failed"),
                },
            },
            "created_at": employee.created_at,
            "updated_at": employee.updated_at,
        }

    def list(self, organization_id: int):
        return (
            self.db.query(AIEmployee)
            .filter(AIEmployee.organization_id == organization_id)
            .order_by(AIEmployee.updated_at.desc(), AIEmployee.id.desc())
            .all()
        )

    def get(self, organization_id: int, employee_id: int):
        return (
            self.db.query(AIEmployee)
            .filter(AIEmployee.organization_id == organization_id, AIEmployee.id == employee_id)
            .first()
        )

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
            status=payload.get("status", "Active"),
            is_active=payload.get("status", "Active").lower() != "inactive",
        )
        self.db.add(employee)
        self.db.commit()
        self.db.refresh(employee)
        return employee

    def update(self, employee: AIEmployee, payload: Dict[str, Any]):
        data = payload.get("data") or {}
        if payload.get("title") is not None:
            employee.name = payload["title"]
        if payload.get("status") is not None:
            employee.status = payload["status"]
            employee.is_active = payload["status"].lower() != "inactive"
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
        self.db.commit()
        self.db.refresh(employee)
        return employee

    def create_run(
        self,
        organization_id: int,
        employee_id: int,
        user_id: int,
        task: str,
        output: str,
        status: str,
        tools_used: List[str],
    ):
        run = AIEmployeeRun(
            organization_id=organization_id,
            employee_id=employee_id,
            user_id=user_id,
            task=task,
            output=output,
            status=status,
            tools_used_json=json.dumps(tools_used),
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run
