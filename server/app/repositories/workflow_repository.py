import json
from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from app.models.workflow import (
    Workflow,
    WorkflowAuditLog,
    WorkflowInstance,
    WorkflowInstanceStep,
    WorkflowStep,
)


class WorkflowRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_workflows(self, organization_id: int):
        return (
            self.db.query(Workflow)
            .options(joinedload(Workflow.steps))
            .filter(Workflow.organization_id == organization_id, Workflow.is_deleted.is_(False))
            .order_by(Workflow.updated_at.desc())
            .all()
        )

    def get_workflow(self, organization_id: int, workflow_id: int):
        return (
            self.db.query(Workflow)
            .options(joinedload(Workflow.steps))
            .filter(
                Workflow.organization_id == organization_id,
                Workflow.id == workflow_id,
                Workflow.is_deleted.is_(False),
            )
            .first()
        )

    def create_workflow(self, organization_id: int, user_id: int, payload: dict) -> Workflow:
        workflow = Workflow(
            organization_id=organization_id,
            created_by_user_id=user_id,
            name=payload["name"],
            description=payload.get("description"),
            category=payload.get("category", "Custom"),
            status=payload.get("status", "draft"),
        )
        self.db.add(workflow)
        self.db.flush()
        for step in payload.get("steps", []):
            self.db.add(
                WorkflowStep(
                    workflow_id=workflow.id,
                    organization_id=organization_id,
                    position=step.get("position", 0),
                    name=step["name"],
                    step_type=step.get("step_type", "approval"),
                    assignee_type=step.get("assignee_type"),
                    assignee_id=step.get("assignee_id"),
                    config_json=json.dumps(step.get("config", {})),
                )
            )
        self.db.commit()
        return self.get_workflow(organization_id, workflow.id)

    def update_workflow(self, workflow: Workflow, payload: dict) -> Workflow:
        if payload.get("name") is not None:
            workflow.name = payload["name"]
        if payload.get("description") is not None:
            workflow.description = payload["description"]
        if payload.get("category") is not None:
            workflow.category = payload["category"]
        if payload.get("status") is not None:
            workflow.status = payload["status"]
        if payload.get("steps") is not None:
            self.db.query(WorkflowStep).filter(WorkflowStep.workflow_id == workflow.id).delete()
            for step in payload["steps"]:
                self.db.add(
                    WorkflowStep(
                        workflow_id=workflow.id,
                        organization_id=workflow.organization_id,
                        position=step.get("position", 0),
                        name=step["name"],
                        step_type=step.get("step_type", "approval"),
                        assignee_type=step.get("assignee_type"),
                        assignee_id=step.get("assignee_id"),
                        config_json=json.dumps(step.get("config", {})),
                    )
                )
        self.db.commit()
        return self.get_workflow(workflow.organization_id, workflow.id)

    def disable_workflow(self, workflow: Workflow):
        workflow.status = "disabled"
        self.db.commit()

    def soft_delete_workflow(self, workflow: Workflow):
        workflow.is_deleted = True
        workflow.status = "disabled"
        self.db.commit()

    def list_instances(self, organization_id: int, limit: int = 50, offset: int = 0):
        return (
            self.db.query(WorkflowInstance)
            .options(
                joinedload(WorkflowInstance.workflow),
                joinedload(WorkflowInstance.steps),
                joinedload(WorkflowInstance.audit_logs),
            )
            .filter(WorkflowInstance.organization_id == organization_id)
            .order_by(WorkflowInstance.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def get_instance(self, organization_id: int, instance_id: int):
        return (
            self.db.query(WorkflowInstance)
            .options(
                joinedload(WorkflowInstance.workflow),
                joinedload(WorkflowInstance.steps),
                joinedload(WorkflowInstance.audit_logs),
            )
            .filter(
                WorkflowInstance.organization_id == organization_id,
                WorkflowInstance.id == instance_id,
            )
            .first()
        )

    def create_instance(self, organization_id: int, user_id: int, workflow: Workflow, title: str):
        instance = WorkflowInstance(
            workflow_id=workflow.id,
            organization_id=organization_id,
            started_by_user_id=user_id,
            title=title,
            status="in_progress",
            current_step_index=0,
        )
        self.db.add(instance)
        self.db.flush()
        sorted_steps = sorted(workflow.steps or [], key=lambda s: s.position)
        for index, step in enumerate(sorted_steps):
            self.db.add(
                WorkflowInstanceStep(
                    instance_id=instance.id,
                    workflow_step_id=step.id,
                    organization_id=organization_id,
                    position=step.position,
                    name=step.name,
                    step_type=step.step_type,
                    assignee_type=step.assignee_type,
                    assignee_id=step.assignee_id,
                    status="pending" if index == 0 else "upcoming",
                )
            )
        self.db.commit()
        return self.get_instance(organization_id, instance.id)

    def add_audit(
        self,
        instance_id: int,
        organization_id: int,
        user_id: Optional[int],
        action: str,
        message: Optional[str],
        details: Optional[dict] = None,
    ):
        log = WorkflowAuditLog(
            instance_id=instance_id,
            organization_id=organization_id,
            user_id=user_id,
            action=action,
            message=message,
            details_json=json.dumps(details or {}),
        )
        self.db.add(log)
        self.db.commit()
        return log

    def complete_instance(self, instance: WorkflowInstance, status: str):
        instance.status = status
        instance.completed_at = datetime.now(timezone.utc)
        self.db.commit()

    def count_workflows(self, organization_id: int, status: Optional[str] = None) -> int:
        query = self.db.query(Workflow).filter(
            Workflow.organization_id == organization_id,
            Workflow.is_deleted.is_(False),
        )
        if status:
            query = query.filter(Workflow.status == status)
        return query.count()

    def count_instances(self, organization_id: int, status: Optional[str] = None) -> int:
        query = self.db.query(WorkflowInstance).filter(
            WorkflowInstance.organization_id == organization_id
        )
        if status:
            query = query.filter(WorkflowInstance.status == status)
        return query.count()
