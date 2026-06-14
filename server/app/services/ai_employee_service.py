import json
import time

from sqlalchemy.orm import Session

from app.clients.groq_client import GroqClient
from app.core.config import settings
from app.core.dependencies import MANAGER_ROLE, ORG_ADMIN_ROLE, SUPER_ADMIN_ROLE
from app.repositories.ai_employee_repository import AIEmployeeRepository
from app.schemas.ai_employee import EMPLOYEE_TYPE_PRESETS
from app.services.ai_employee_tools import AIEmployeeTools, normalize_tools


class AIEmployeeService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AIEmployeeRepository(db)

    def _assert_access(self, current_user, employee):
        if employee.organization_id != current_user.organization_id:
            raise PermissionError("Cross-organization AI employee access is not allowed")
        if employee.is_deleted:
            raise PermissionError("AI employee has been deleted")
        role_name = current_user.role.name if current_user.role else None
        if (
            role_name not in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE, MANAGER_ROLE}
            and employee.department_id
            and current_user.department_id
            and employee.department_id != current_user.department_id
        ):
            raise PermissionError("Cross-department AI employee access is not allowed")

    def _assert_manage(self, current_user):
        role_name = current_user.role.name if current_user.role else None
        if role_name not in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE, MANAGER_ROLE}:
            raise PermissionError("Insufficient permissions to manage AI employees")

    def list(self, current_user):
        employees = self.repo.list(current_user.organization_id)
        role_name = current_user.role.name if current_user.role else None
        if role_name in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE, MANAGER_ROLE}:
            return [self.repo.serialize(employee) for employee in employees]
        return [
            self.repo.serialize(employee)
            for employee in employees
            if not employee.department_id or employee.department_id == current_user.department_id
        ]

    def get(self, current_user, employee_id: int):
        employee = self.repo.get(current_user.organization_id, employee_id)
        if not employee:
            return None
        self._assert_access(current_user, employee)
        return self.repo.serialize(employee)

    def create(self, current_user, payload):
        self._assert_manage(current_user)
        data = payload.get("data", {})
        role = data.get("role", "Assistant")
        preset = EMPLOYEE_TYPE_PRESETS.get(role, {})
        if not data.get("instructions"):
            data["instructions"] = preset.get("instructions", "")
        if not data.get("tools"):
            data["tools"] = preset.get("default_tools", [])
        payload = {**payload, "data": data}
        employee = self.repo.create(current_user.organization_id, current_user.id, payload)
        return self.repo.serialize(employee)

    def update(self, current_user, employee_id: int, payload):
        self._assert_manage(current_user)
        employee = self.repo.get(current_user.organization_id, employee_id)
        if not employee:
            return None
        self._assert_access(current_user, employee)
        updated = self.repo.update(employee, payload)
        return self.repo.serialize(self.repo.get(current_user.organization_id, updated.id))

    def enable(self, current_user, employee_id: int):
        self._assert_manage(current_user)
        employee = self.repo.get(current_user.organization_id, employee_id)
        if not employee:
            return None
        self._assert_access(current_user, employee)
        return self.repo.serialize(self.repo.set_active(employee, True))

    def disable(self, current_user, employee_id: int):
        self._assert_manage(current_user)
        employee = self.repo.get(current_user.organization_id, employee_id)
        if not employee:
            return None
        self._assert_access(current_user, employee)
        return self.repo.serialize(self.repo.set_active(employee, False))

    def delete(self, current_user, employee_id: int):
        self._assert_manage(current_user)
        employee = self.repo.get(current_user.organization_id, employee_id)
        if not employee:
            return None
        self._assert_access(current_user, employee)
        self.repo.soft_delete(employee)
        return {"id": employee_id, "deleted": True}

    def list_runs(self, current_user, employee_id: int, limit: int = 50, offset: int = 0):
        employee = self.repo.get(current_user.organization_id, employee_id)
        if not employee:
            return None
        self._assert_access(current_user, employee)
        runs = self.repo.list_runs(
            current_user.organization_id, employee_id, limit=limit, offset=offset
        )
        return [self.repo.serialize_run(run) for run in runs]

    def get_metrics(self, current_user, employee_id: int):
        employee = self.repo.get(current_user.organization_id, employee_id)
        if not employee:
            return None
        self._assert_access(current_user, employee)
        return self.repo.get_metrics(current_user.organization_id, employee_id)

    def run(self, current_user, employee_id: int, task: str):
        return self.run_with_context(current_user, employee_id, task, prior_context="")

    def run_with_context(
        self, current_user, employee_id: int, task: str, prior_context: str = ""
    ):
        employee = self.repo.get(current_user.organization_id, employee_id)
        if not employee:
            return None
        self._assert_access(current_user, employee)
        if not employee.is_active:
            raise PermissionError("AI employee is disabled")

        start = time.perf_counter()
        tools = normalize_tools(json.loads(employee.tools_json or "[]"))
        knowledge_ids = json.loads(employee.knowledge_document_ids_json or "[]")

        tool_executor = AIEmployeeTools(self.db)
        tool_contexts, tools_used = tool_executor.execute_tools(
            current_user,
            task,
            tools,
            knowledge_document_ids=knowledge_ids or None,
            employee_role=employee.role,
        )

        department_name = employee.department.name if employee.department else "Unassigned"
        context_blocks = []
        if prior_context:
            context_blocks.append(f"Prior team member outputs:\n{prior_context}")
        if tool_contexts.get("knowledge"):
            context_blocks.append(f"Organizational knowledge:\n{tool_contexts['knowledge']}")
        if tool_contexts.get("research"):
            context_blocks.append(f"Research findings:\n{tool_contexts['research']}")
        if tool_contexts.get("browser"):
            context_blocks.append(f"Browser extraction results:\n{tool_contexts['browser']}")
        if tool_contexts.get("document_draft"):
            context_blocks.append(f"Document draft:\n{tool_contexts['document_draft']}")

        prompt = (
            f"You are {employee.name}, a {employee.role} in the {department_name} department.\n"
            f"Instructions: {employee.instructions}\n"
            f"Enabled tools: {', '.join(tools) if tools else 'none'}\n"
        )
        if context_blocks:
            prompt += "\n" + "\n\n".join(context_blocks) + "\n"
        if prior_context:
            prompt += (
                f"\nCollaboration objective: {task}\n"
                "Build on prior team outputs and produce your specialized contribution "
                "for the next team member."
            )
        else:
            prompt += f"\nUser task: {task}\n"
        prompt += "\nProvide a complete, professional response:"

        model = employee.model or settings.GROQ_MODEL_NAME
        status = "completed"
        token_usage = {}
        try:
            response = GroqClient().generate(prompt, model=model)
            output = response.get("output", {}).get("text", "")
            token_usage = response.get("usage", {})
        except Exception:
            status = "failed"
            output = (
                "The AI employee could not complete this task. "
                "Verify that GROQ_API_KEY is configured."
            )

        execution_time_ms = int((time.perf_counter() - start) * 1000)
        run = self.repo.create_run(
            current_user.organization_id,
            employee.id,
            current_user.id,
            task,
            output,
            status,
            tools_used,
            execution_time_ms=execution_time_ms,
            token_usage=token_usage,
        )
        return {
            "employee_id": employee.id,
            "run_id": run.id,
            "task": task,
            "output": output,
            "status": status,
            "tools_used": tools_used,
            "execution_time_ms": execution_time_ms,
            "token_usage": token_usage,
        }

    def count_active(self, organization_id: int) -> int:
        return self.repo.count_active(organization_id)
