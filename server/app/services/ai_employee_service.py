import json

from sqlalchemy.orm import Session

from app.clients.groq_client import GroqClient
from app.core.dependencies import ORG_ADMIN_ROLE, SUPER_ADMIN_ROLE
from app.repositories.ai_employee_repository import AIEmployeeRepository
from app.services.rag_service import RAGService


class AIEmployeeService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AIEmployeeRepository(db)

    def _assert_access(self, current_user, employee):
        if employee.organization_id != current_user.organization_id:
            raise PermissionError("Cross-organization AI employee access is not allowed")
        role_name = current_user.role.name if current_user.role else None
        if (
            role_name not in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE}
            and employee.department_id
            and current_user.department_id
            and employee.department_id != current_user.department_id
        ):
            raise PermissionError("Cross-department AI employee access is not allowed")

    def list(self, current_user):
        employees = self.repo.list(current_user.organization_id)
        role_name = current_user.role.name if current_user.role else None
        if role_name in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE}:
            return [self.repo.serialize(employee) for employee in employees]
        return [
            self.repo.serialize(employee)
            for employee in employees
            if not employee.department_id or employee.department_id == current_user.department_id
        ]

    def create(self, current_user, payload):
        return self.repo.serialize(
            self.repo.create(current_user.organization_id, current_user.id, payload)
        )

    def update(self, current_user, employee_id: int, payload):
        employee = self.repo.get(current_user.organization_id, employee_id)
        if not employee:
            return None
        self._assert_access(current_user, employee)
        return self.repo.serialize(self.repo.update(employee, payload))

    def run(self, current_user, employee_id: int, task: str):
        employee = self.repo.get(current_user.organization_id, employee_id)
        if not employee:
            return None
        self._assert_access(current_user, employee)
        employee_data = self.repo.serialize(employee)["data"]
        tools = employee_data.get("tools", [])
        context = ""
        tools_used = []
        if "File Reader" in tools or "Database Access" in tools:
            try:
                query, _ = RAGService(self.db).ask(current_user, task, 5)
                context = query.answer_text
                tools_used.append("organizational_knowledge")
            except Exception:
                context = ""
        prompt = (
            f"You are {employee.name}, a {employee.role}.\n"
            f"Instructions: {employee.instructions}\n"
            f"Available tools: {', '.join(tools)}\n"
            f"Organizational knowledge: {context}\n"
            f"Task: {task}"
        )
        status = "completed"
        try:
            response = GroqClient().generate(prompt, model=employee.model)
            output = response.get("output", {}).get("text", "")
        except Exception:
            status = "failed"
            output = "The AI employee could not complete this task because no LLM provider is configured."
        self.repo.create_run(
            current_user.organization_id,
            employee.id,
            current_user.id,
            task,
            output,
            status,
            tools_used,
        )
        return {"employee_id": employee.id, "task": task, "output": output, "status": status, "tools_used": tools_used}
