import json
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.dependencies import MANAGER_ROLE, ORG_ADMIN_ROLE, SUPER_ADMIN_ROLE
from app.models.ai_employee import AIEmployee
from app.models.department import Department
from app.models.team import Team
from app.models.user import User
from app.models.workflow import WorkflowInstance, WorkflowInstanceStep
from app.repositories.workflow_repository import WorkflowRepository
from app.schemas.workflow import WORKFLOW_TEMPLATES
from app.services.ai_employee_service import AIEmployeeService
from app.services.notification_service import NotificationService


class WorkflowService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = WorkflowRepository(db)
        self.notifications = NotificationService(db)
        self.ai_employees = AIEmployeeService(db)

    def _assert_manage(self, current_user):
        role_name = current_user.role.name if current_user.role else None
        if role_name not in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE, MANAGER_ROLE}:
            raise PermissionError("Insufficient permissions to manage workflows")

    def get_templates(self):
        return WORKFLOW_TEMPLATES

    def list_workflows(self, current_user):
        return [self._serialize_workflow(wf) for wf in self.repo.list_workflows(current_user.organization_id)]

    def get_workflow(self, current_user, workflow_id: int):
        workflow = self.repo.get_workflow(current_user.organization_id, workflow_id)
        if not workflow:
            return None
        return self._serialize_workflow(workflow)

    def create_workflow(self, current_user, payload: dict):
        self._assert_manage(current_user)
        steps = payload.get("steps", [])
        for index, step in enumerate(steps):
            step["position"] = step.get("position", index)
        workflow = self.repo.create_workflow(current_user.organization_id, current_user.id, payload)
        return self._serialize_workflow(workflow)

    def update_workflow(self, current_user, workflow_id: int, payload: dict):
        self._assert_manage(current_user)
        workflow = self.repo.get_workflow(current_user.organization_id, workflow_id)
        if not workflow:
            return None
        if payload.get("steps") is not None:
            for index, step in enumerate(payload["steps"]):
                step["position"] = step.get("position", index)
        updated = self.repo.update_workflow(workflow, payload)
        return self._serialize_workflow(updated)

    def disable_workflow(self, current_user, workflow_id: int):
        self._assert_manage(current_user)
        workflow = self.repo.get_workflow(current_user.organization_id, workflow_id)
        if not workflow:
            return None
        self.repo.disable_workflow(workflow)
        return self._serialize_workflow(self.repo.get_workflow(current_user.organization_id, workflow_id))

    def delete_workflow(self, current_user, workflow_id: int):
        self._assert_manage(current_user)
        workflow = self.repo.get_workflow(current_user.organization_id, workflow_id)
        if not workflow:
            return None
        self.repo.soft_delete_workflow(workflow)
        return {"id": workflow_id, "deleted": True}

    def list_instances(self, current_user, limit: int = 50, offset: int = 0):
        instances = self.repo.list_instances(current_user.organization_id, limit, offset)
        return [self._serialize_instance(inst) for inst in instances]

    def get_instance(self, current_user, instance_id: int):
        instance = self.repo.get_instance(current_user.organization_id, instance_id)
        if not instance:
            return None
        return self._serialize_instance(instance)

    def start_instance(self, current_user, workflow_id: int, title: str):
        workflow = self.repo.get_workflow(current_user.organization_id, workflow_id)
        if not workflow:
            return None
        if workflow.status != "active":
            raise ValueError("Workflow must be active before starting an instance")
        if not workflow.steps:
            raise ValueError("Workflow has no steps defined")
        instance = self.repo.create_instance(
            current_user.organization_id, current_user.id, workflow, title
        )
        self.repo.add_audit(
            instance.id,
            current_user.organization_id,
            current_user.id,
            "instance_started",
            f"Workflow instance started: {title}",
            {"workflow_id": workflow_id},
        )
        instance = self.repo.get_instance(current_user.organization_id, instance.id)
        self._process_current_step(current_user, instance)
        return self._serialize_instance(self.repo.get_instance(current_user.organization_id, instance.id))

    def approve_step(self, current_user, instance_id: int, step_id: int, comment: Optional[str] = None):
        return self._act_on_step(current_user, instance_id, step_id, "approved", comment)

    def reject_step(self, current_user, instance_id: int, step_id: int, comment: Optional[str] = None):
        instance = self.repo.get_instance(current_user.organization_id, instance_id)
        if not instance:
            return None
        step = self._get_step(instance, step_id)
        if not step or step.status != "pending":
            raise ValueError("Step is not pending")
        if not self._can_act(current_user, step):
            raise PermissionError("You are not authorized to act on this step")
        step.status = "rejected"
        step.comments = comment
        step.acted_by_user_id = current_user.id
        step.acted_at = datetime.now(timezone.utc)
        instance.status = "rejected"
        instance.completed_at = datetime.now(timezone.utc)
        self.db.commit()
        self.repo.add_audit(
            instance_id,
            current_user.organization_id,
            current_user.id,
            "step_rejected",
            comment or f"Step '{step.name}' rejected",
            {"step_id": step_id},
        )
        self._notify(
            instance.started_by_user_id,
            current_user.organization_id,
            "workflow_rejected",
            "Workflow Rejected",
            f"'{instance.title}' was rejected at step '{step.name}'.",
            "workflow_instance",
            instance_id,
        )
        return self._serialize_instance(self.repo.get_instance(current_user.organization_id, instance_id))

    def cancel_instance(self, current_user, instance_id: int):
        instance = self.repo.get_instance(current_user.organization_id, instance_id)
        if not instance:
            return None
        role_name = current_user.role.name if current_user.role else None
        if (
            instance.started_by_user_id != current_user.id
            and role_name not in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE, MANAGER_ROLE}
        ):
            raise PermissionError("Only the initiator or an admin can cancel this workflow")
        instance.status = "cancelled"
        instance.completed_at = datetime.now(timezone.utc)
        self.db.commit()
        self.repo.add_audit(
            instance_id,
            current_user.organization_id,
            current_user.id,
            "instance_cancelled",
            "Workflow instance cancelled",
        )
        return self._serialize_instance(self.repo.get_instance(current_user.organization_id, instance_id))

    def get_metrics(self, current_user):
        org_id = current_user.organization_id
        total_instances = self.repo.count_instances(org_id)
        completed = self.repo.count_instances(org_id, "completed")
        in_progress = self.repo.count_instances(org_id, "in_progress")
        rejected = self.repo.count_instances(org_id, "rejected")
        return {
            "total_workflows": self.repo.count_workflows(org_id),
            "active_workflows": self.repo.count_workflows(org_id, "active"),
            "total_instances": total_instances,
            "completed_instances": completed,
            "in_progress_instances": in_progress,
            "rejected_instances": rejected,
            "completion_rate": round(completed * 100 / total_instances, 1) if total_instances else 0.0,
        }

    def _act_on_step(
        self, current_user, instance_id: int, step_id: int, action: str, comment: Optional[str]
    ):
        instance = self.repo.get_instance(current_user.organization_id, instance_id)
        if not instance:
            return None
        if instance.status not in {"in_progress", "approved"}:
            raise ValueError("Workflow instance is not actionable")
        step = self._get_step(instance, step_id)
        if not step or step.status != "pending":
            raise ValueError("Step is not pending")
        if step.step_type in {"approval", "review", "user"} and not self._can_act(current_user, step):
            raise PermissionError("You are not authorized to approve this step")
        step.status = "approved" if action == "approved" else action
        step.comments = comment
        step.acted_by_user_id = current_user.id
        step.acted_at = datetime.now(timezone.utc)
        self.db.commit()
        self.repo.add_audit(
            instance_id,
            current_user.organization_id,
            current_user.id,
            f"step_{action}",
            comment or f"Step '{step.name}' {action}",
            {"step_id": step_id},
        )
        instance = self.repo.get_instance(current_user.organization_id, instance_id)
        return self._advance_instance(current_user, instance)

    def _advance_instance(self, current_user, instance: WorkflowInstance):
        sorted_steps = sorted(instance.steps or [], key=lambda s: s.position)
        pending = [s for s in sorted_steps if s.status == "pending"]
        if pending:
            return self._serialize_instance(instance)
        upcoming = [s for s in sorted_steps if s.status == "upcoming"]
        if upcoming:
            next_step = upcoming[0]
            next_step.status = "pending"
            instance.current_step_index = next_step.position
            self.db.commit()
            instance = self.repo.get_instance(current_user.organization_id, instance.id)
            self._notify_assignee(instance, next_step)
            return self._serialize_instance(self._process_current_step(current_user, instance))
        instance.status = "completed"
        instance.completed_at = datetime.now(timezone.utc)
        self.db.commit()
        self.repo.add_audit(
            instance.id,
            current_user.organization_id,
            current_user.id,
            "instance_completed",
            "Workflow completed successfully",
        )
        self._notify(
            instance.started_by_user_id,
            instance.organization_id,
            "workflow_completed",
            "Workflow Completed",
            f"'{instance.title}' has been completed.",
            "workflow_instance",
            instance.id,
        )
        return self._serialize_instance(self.repo.get_instance(current_user.organization_id, instance.id))

    def _process_current_step(self, current_user, instance: WorkflowInstance):
        sorted_steps = sorted(instance.steps or [], key=lambda s: s.position)
        pending = next((s for s in sorted_steps if s.status == "pending"), None)
        if not pending:
            return instance
        if pending.step_type == "ai" and pending.assignee_type == "ai_employee" and pending.assignee_id:
            try:
                result = self.ai_employees.run_with_context(
                    current_user,
                    pending.assignee_id,
                    f"Workflow step: {pending.name}. Context: {instance.title}",
                )
                if result:
                    pending.ai_output = result.get("output", "")
                    pending.status = "approved"
                    pending.acted_at = datetime.now(timezone.utc)
                    self.db.commit()
                    self.repo.add_audit(
                        instance.id,
                        instance.organization_id,
                        current_user.id,
                        "ai_step_completed",
                        f"AI employee completed step '{pending.name}'",
                        {"step_id": pending.id, "employee_id": pending.assignee_id},
                    )
                    instance = self.repo.get_instance(current_user.organization_id, instance.id)
                    return self._advance_instance(current_user, instance)
            except Exception as exc:
                pending.status = "rejected"
                pending.comments = str(exc)
                instance.status = "rejected"
                instance.completed_at = datetime.now(timezone.utc)
                self.db.commit()
                return instance
        else:
            self._notify_assignee(instance, pending)
        return instance

    def _notify_assignee(self, instance: WorkflowInstance, step: WorkflowInstanceStep):
        user_ids = self._resolve_assignee_user_ids(instance.organization_id, step)
        for user_id in user_ids:
            self._notify(
                user_id,
                instance.organization_id,
                "workflow_assignment",
                "Workflow Task Assigned",
                f"You have a pending step '{step.name}' on '{instance.title}'.",
                "workflow_instance",
                instance.id,
            )

    def _notify(
        self,
        user_id: int,
        organization_id: int,
        notification_type: str,
        title: str,
        body: str,
        entity_type: str,
        entity_id: int,
    ):
        if user_id:
            self.notifications.create(
                organization_id, user_id, notification_type, title, body, entity_type, entity_id
            )

    def _resolve_assignee_user_ids(self, organization_id: int, step: WorkflowInstanceStep) -> List[int]:
        if step.assignee_type == "user" and step.assignee_id:
            return [step.assignee_id]
        if step.assignee_type == "department" and step.assignee_id:
            users = (
                self.db.query(User)
                .filter(
                    User.organization_id == organization_id,
                    User.department_id == step.assignee_id,
                    User.is_active.is_(True),
                )
                .limit(5)
                .all()
            )
            return [u.id for u in users]
        if step.assignee_type == "team" and step.assignee_id:
            users = (
                self.db.query(User)
                .filter(
                    User.organization_id == organization_id,
                    User.team_id == step.assignee_id,
                    User.is_active.is_(True),
                )
                .limit(5)
                .all()
            )
            return [u.id for u in users]
        return []

    def _can_act(self, current_user, step: WorkflowInstanceStep) -> bool:
        role_name = current_user.role.name if current_user.role else None
        if role_name in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE, MANAGER_ROLE}:
            return True
        if step.assignee_type == "user" and step.assignee_id == current_user.id:
            return True
        if step.assignee_type == "department" and step.assignee_id == current_user.department_id:
            return True
        if step.assignee_type == "team" and step.assignee_id == current_user.team_id:
            return True
        return False

    @staticmethod
    def _get_step(instance: WorkflowInstance, step_id: int) -> Optional[WorkflowInstanceStep]:
        return next((s for s in (instance.steps or []) if s.id == step_id), None)

    def _resolve_assignee_label(self, organization_id: int, assignee_type: Optional[str], assignee_id: Optional[int]) -> Optional[str]:
        if not assignee_type or not assignee_id:
            return None
        if assignee_type == "user":
            user = self.db.query(User).filter(User.id == assignee_id, User.organization_id == organization_id).first()
            return f"{user.first_name} {user.last_name}" if user else f"User #{assignee_id}"
        if assignee_type == "department":
            dept = self.db.query(Department).filter(Department.id == assignee_id).first()
            return dept.name if dept else f"Department #{assignee_id}"
        if assignee_type == "team":
            team = self.db.query(Team).filter(Team.id == assignee_id).first()
            return team.name if team else f"Team #{assignee_id}"
        if assignee_type == "ai_employee":
            emp = self.db.query(AIEmployee).filter(AIEmployee.id == assignee_id).first()
            return emp.name if emp else f"AI Employee #{assignee_id}"
        return None

    def _serialize_workflow(self, workflow) -> dict:
        steps = sorted(workflow.steps or [], key=lambda s: s.position)
        return {
            "id": workflow.id,
            "organization_id": workflow.organization_id,
            "name": workflow.name,
            "description": workflow.description,
            "category": workflow.category,
            "status": workflow.status,
            "step_count": len(steps),
            "steps": [
                {
                    "id": s.id,
                    "position": s.position,
                    "name": s.name,
                    "step_type": s.step_type,
                    "assignee_type": s.assignee_type,
                    "assignee_id": s.assignee_id,
                    "assignee_label": self._resolve_assignee_label(
                        workflow.organization_id, s.assignee_type, s.assignee_id
                    ),
                    "config": json.loads(s.config_json or "{}"),
                }
                for s in steps
            ],
            "created_at": workflow.created_at,
            "updated_at": workflow.updated_at,
        }

    def _serialize_instance(self, instance) -> dict:
        steps = sorted(instance.steps or [], key=lambda s: s.position)
        completed = sum(1 for s in steps if s.status in {"approved", "completed"})
        progress = round(completed * 100 / len(steps)) if steps else 0
        audit_logs = sorted(instance.audit_logs or [], key=lambda a: a.id)
        return {
            "id": instance.id,
            "workflow_id": instance.workflow_id,
            "workflow_name": instance.workflow.name if instance.workflow else None,
            "organization_id": instance.organization_id,
            "title": instance.title,
            "status": instance.status,
            "current_step_index": instance.current_step_index,
            "progress_percent": progress,
            "started_by_user_id": instance.started_by_user_id,
            "steps": [
                {
                    "id": s.id,
                    "position": s.position,
                    "name": s.name,
                    "step_type": s.step_type,
                    "assignee_type": s.assignee_type,
                    "assignee_id": s.assignee_id,
                    "assignee_label": self._resolve_assignee_label(
                        instance.organization_id, s.assignee_type, s.assignee_id
                    ),
                    "status": s.status,
                    "comments": s.comments,
                    "acted_by_user_id": s.acted_by_user_id,
                    "acted_at": s.acted_at,
                    "ai_output": s.ai_output,
                }
                for s in steps
            ],
            "audit_logs": [
                {
                    "id": a.id,
                    "action": a.action,
                    "message": a.message,
                    "user_id": a.user_id,
                    "details": json.loads(a.details_json or "{}"),
                    "created_at": a.created_at,
                }
                for a in audit_logs
            ],
            "created_at": instance.created_at,
            "updated_at": instance.updated_at,
            "completed_at": instance.completed_at,
        }
