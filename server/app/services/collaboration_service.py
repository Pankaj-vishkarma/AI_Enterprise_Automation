import time
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.clients.groq_client import GroqClient
from app.core.dependencies import MANAGER_ROLE, ORG_ADMIN_ROLE, SUPER_ADMIN_ROLE
from app.repositories.ai_employee_repository import AIEmployeeRepository
from app.repositories.collaboration_repository import CollaborationRepository
from app.services.ai_employee_service import AIEmployeeService
from app.repositories.user_repository import UserRepository
from app.utils.rbac_scope import (
    assert_can_view_user_owned_record,
    filter_user_owned_records,
    resolve_team_member_ids,
)


class CollaborationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CollaborationRepository(db)
        self.ai_employee_service = AIEmployeeService(db)
        self.ai_employee_repo = AIEmployeeRepository(db)

    def _assert_manage(self, current_user):
        role_name = current_user.role.name if current_user.role else None
        if role_name not in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE, MANAGER_ROLE}:
            raise PermissionError("Insufficient permissions to manage collaboration teams")

    def _team_member_ids(self, current_user):
        users = UserRepository(self.db).list_by_organization(current_user.organization_id)
        return resolve_team_member_ids(users, current_user)

    def _assert_run_access(self, current_user, run) -> None:
        assert_can_view_user_owned_record(
            current_user,
            run.user_id,
            self._team_member_ids(current_user),
        )

    def list_teams(self, current_user):
        teams = self.repo.list_teams(current_user.organization_id)
        return [self.repo.serialize_team(team) for team in teams]

    def get_team(self, current_user, team_id: int):
        team = self.repo.get_team(current_user.organization_id, team_id)
        if not team:
            return None
        return self.repo.serialize_team(team)

    def create_team(self, current_user, payload: dict):
        self._assert_manage(current_user)
        members = payload.get("members", [])
        self._validate_members(current_user.organization_id, members)
        team = self.repo.create_team(
            current_user.organization_id,
            current_user.id,
            payload["name"],
            payload.get("description"),
            members,
        )
        return self.repo.serialize_team(team)

    def update_team(self, current_user, team_id: int, payload: dict):
        self._assert_manage(current_user)
        team = self.repo.get_team(current_user.organization_id, team_id)
        if not team:
            return None
        members = payload.get("members")
        if members is not None:
            self._validate_members(current_user.organization_id, members)
        updated = self.repo.update_team(
            team,
            payload.get("name"),
            payload.get("description"),
            members,
        )
        return self.repo.serialize_team(updated)

    def delete_team(self, current_user, team_id: int):
        self._assert_manage(current_user)
        team = self.repo.get_team(current_user.organization_id, team_id)
        if not team:
            return None
        self.repo.soft_delete_team(team)
        return {"id": team_id, "deleted": True}

    def _validate_members(self, organization_id: int, members: List[Dict]):
        if not members:
            return
        for member in members:
            employee = self.ai_employee_repo.get(organization_id, member["ai_employee_id"])
            if not employee or employee.is_deleted:
                raise ValueError(f"AI employee {member['ai_employee_id']} not found or inactive")

    def _execute_agent_step(
        self,
        current_user,
        employee_id: int,
        task: str,
        prior_context: str,
        position: int,
        *,
        employee_name: Optional[str] = None,
        employee_role: Optional[str] = None,
    ) -> Dict[str, Any]:
        result = self.ai_employee_service.run_with_context(
            current_user, employee_id, task, prior_context=prior_context
        )
        if not result:
            raise RuntimeError(f"AI employee {employee_id} not found")
        return {
            "employee_id": employee_id,
            "employee_name": employee_name or f"Agent {employee_id}",
            "employee_role": employee_role or "Assistant",
            "position": position,
            "status": result["status"],
            "output": result["output"],
            "tools_used": result.get("tools_used", []),
            "execution_time_ms": result.get("execution_time_ms"),
            "token_usage": result.get("token_usage", {}),
        }

    def _aggregate_tokens(self, steps: List[Dict]) -> Dict[str, int]:
        totals = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        for step in steps:
            usage = step.get("token_usage") or {}
            totals["prompt_tokens"] += usage.get("prompt_tokens", 0)
            totals["completion_tokens"] += usage.get("completion_tokens", 0)
            totals["total_tokens"] += usage.get("total_tokens", 0)
        return totals

    def _run_sequential(
        self, current_user, members: List, task: str
    ) -> tuple[List[Dict], str, Optional[Dict], str]:
        logs: List[Dict] = []
        previous = ""
        failure_info = None
        status = "completed"

        for member in members:
            employee = member.ai_employee
            if not employee or not employee.is_active:
                failure_info = {
                    "employee_id": member.ai_employee_id,
                    "employee_name": employee.name if employee else None,
                    "reason": "AI employee is disabled or unavailable",
                    "partial_outputs": logs,
                }
                status = "partial" if logs else "failed"
                break
            try:
                step = self._execute_agent_step(
                    current_user,
                    member.ai_employee_id,
                    task,
                    previous,
                    member.position,
                    employee_name=employee.name if employee else None,
                    employee_role=employee.role if employee else None,
                )
                logs.append(step)
                if step["status"] == "failed":
                    failure_info = {
                        "employee_id": step["employee_id"],
                        "employee_name": step["employee_name"],
                        "reason": step["output"],
                        "partial_outputs": logs,
                    }
                    status = "partial" if len(logs) > 1 else "failed"
                    break
                previous = self._format_prior_context(logs)
            except Exception as exc:
                failure_info = {
                    "employee_id": member.ai_employee_id,
                    "employee_name": employee.name if employee else None,
                    "reason": str(exc),
                    "partial_outputs": logs,
                }
                status = "partial" if logs else "failed"
                break

        return logs, previous, failure_info, status

    def _run_langgraph(
        self, current_user, members: List, task: str
    ) -> tuple[List[Dict], str, Optional[Dict], str]:
        from langgraph.graph import END, StateGraph

        service = self
        member_specs = [
            (
                m.ai_employee_id,
                m.position,
                m.ai_employee.name if m.ai_employee else f"Agent {m.ai_employee_id}",
                m.ai_employee.role if m.ai_employee else "Assistant",
            )
            for m in members
        ]
        node_names = [f"agent_{emp_id}" for emp_id, _, _, _ in member_specs]

        def make_node(emp_id: int, position: int, emp_name: str, emp_role: str):
            def run_node(state: dict) -> dict:
                if state.get("failed"):
                    return state
                prior = state.get("previous", "")
                try:
                    step = service._execute_agent_step(
                        current_user,
                        emp_id,
                        task,
                        prior,
                        position,
                        employee_name=emp_name,
                        employee_role=emp_role,
                    )
                    logs = state.get("logs", []) + [step]
                    if step["status"] == "failed":
                        return {
                            "previous": prior,
                            "logs": logs,
                            "failed": {
                                "employee_id": emp_id,
                                "employee_name": emp_name,
                                "reason": step["output"],
                                "partial_outputs": logs,
                            },
                            "status": "partial" if len(logs) > 1 else "failed",
                        }
                    return {
                        "previous": service._format_prior_context(logs),
                        "logs": logs,
                        "failed": None,
                        "status": "completed",
                    }
                except Exception as exc:
                    logs = state.get("logs", [])
                    return {
                        "previous": prior,
                        "logs": logs,
                        "failed": {
                            "employee_id": emp_id,
                            "employee_name": emp_name,
                            "reason": str(exc),
                            "partial_outputs": logs,
                        },
                        "status": "partial" if logs else "failed",
                    }

            return run_node

        graph = StateGraph(dict)
        for index, (emp_id, position, emp_name, emp_role) in enumerate(member_specs):
            graph.add_node(node_names[index], make_node(emp_id, position, emp_name, emp_role))
            if index:
                graph.add_edge(node_names[index - 1], node_names[index])
        graph.set_entry_point(node_names[0])
        graph.add_edge(node_names[-1], END)

        state = graph.compile().invoke(
            {"previous": "", "logs": [], "failed": None, "status": "completed"}
        )
        logs = state.get("logs", [])
        failure_info = state.get("failed")
        status = state.get("status", "completed")
        if failure_info:
            status = failure_info.get("status", status) if isinstance(failure_info, dict) and "status" in failure_info else status
        if failure_info and status == "completed":
            status = "partial" if logs else "failed"
        return logs, state.get("previous", ""), failure_info, status

    @staticmethod
    def _format_prior_context(logs: List[Dict]) -> str:
        parts = []
        for entry in logs:
            parts.append(
                f"### {entry['employee_name']} ({entry['employee_role']})\n{entry['output']}"
            )
        return "\n\n".join(parts)

    def _synthesize_final_report(self, task: str, logs: List[Dict], previous: str) -> str:
        contributions = self._format_prior_context(logs) if logs else previous
        prompt = (
            "Produce one professional final report that synthesizes all team member contributions.\n"
            f"Original objective: {task}\n\n"
            f"Team contributions:\n{contributions}\n\n"
            "Deliver a polished, cohesive final report with clear sections."
        )
        try:
            response = GroqClient().generate(prompt)
            return response.get("output", {}).get("text", contributions)
        except Exception:
            return f"# Final Report\n\n{contributions}"

    def run_collaboration(self, current_user, team_id: int, task: str):
        start = time.perf_counter()
        team = self.repo.get_team(current_user.organization_id, team_id)
        if not team:
            return None
        members = sorted(team.members or [], key=lambda m: m.position)
        if not members:
            raise ValueError("Collaboration team has no AI employee members")

        participating_agents = [
            {
                "employee_id": m.ai_employee_id,
                "employee_name": m.ai_employee.name if m.ai_employee else None,
                "employee_role": m.ai_employee.role if m.ai_employee else None,
                "position": m.position,
            }
            for m in members
        ]

        try:
            logs, previous, failure_info, status = self._run_langgraph(current_user, members, task)
        except Exception:
            logs, previous, failure_info, status = self._run_sequential(current_user, members, task)

        if logs and status in {"completed", "partial"}:
            final_output = self._synthesize_final_report(task, logs, previous)
        elif failure_info and logs:
            final_output = self._synthesize_final_report(task, logs, previous)
            status = "partial"
        else:
            final_output = failure_info.get("reason", "Collaboration failed") if failure_info else "No output produced"
            if not logs:
                status = "failed"

        execution_time_ms = int((time.perf_counter() - start) * 1000)
        token_usage = self._aggregate_tokens(logs)

        run = self.repo.create_run(
            organization_id=current_user.organization_id,
            team_id=team_id,
            user_id=current_user.id,
            task=task,
            status=status,
            final_output=final_output,
            intermediate_outputs=logs,
            participating_agents=participating_agents,
            failure_info=failure_info,
            execution_time_ms=execution_time_ms,
            token_usage=token_usage,
        )
        return self.repo.serialize_run(run)

    def list_runs(self, current_user, limit: int = 50, offset: int = 0):
        runs = self.repo.list_runs(current_user.organization_id, limit=limit, offset=offset)
        runs = filter_user_owned_records(
            current_user,
            runs,
            owner_attr="user_id",
            member_ids=self._team_member_ids(current_user),
        )
        return [self.repo.serialize_run(run) for run in runs]

    def get_run(self, current_user, run_id: int):
        run = self.repo.get_run(current_user.organization_id, run_id)
        if not run:
            return None
        self._assert_run_access(current_user, run)
        return self.repo.serialize_run(run)

    def get_metrics(self, current_user):
        return self.repo.get_metrics(current_user.organization_id)
