from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    WORKFLOW_APPROVE_PERMISSION,
    WORKFLOW_MANAGE_PERMISSION,
    WORKFLOW_USE_PERMISSION,
    require_permission,
)
from app.schemas.workflow import (
    InstanceStartRequest,
    StepActionRequest,
    WorkflowCreate,
    WorkflowInstanceResponse,
    WorkflowMetrics,
    WorkflowResponse,
    WorkflowUpdate,
)
from app.services.notification_service import NotificationService
from app.services.workflow_service import WorkflowService

router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])

require_workflow_use = require_permission(WORKFLOW_USE_PERMISSION)
require_workflow_manage = require_permission(WORKFLOW_MANAGE_PERMISSION)
require_workflow_approve = require_permission(WORKFLOW_APPROVE_PERMISSION)


def _permission_error(exc: PermissionError):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get("/templates")
def get_templates(current_user=Depends(require_workflow_use), db: Session = Depends(get_db)):
    return WorkflowService(db).get_templates()


@router.get("/metrics", response_model=WorkflowMetrics)
def get_metrics(current_user=Depends(require_workflow_use), db: Session = Depends(get_db)):
    return WorkflowService(db).get_metrics(current_user)


@router.get("/instances/list", response_model=List[WorkflowInstanceResponse])
def list_instances(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    scope: Optional[str] = Query(
        default=None,
        description="Filter: mine (default), pending_approval, or all_accessible",
    ),
    current_user=Depends(require_workflow_use),
    db: Session = Depends(get_db),
):
    return WorkflowService(db).list_instances(
        current_user, limit=limit, offset=offset, scope=scope
    )


@router.get("/instances/{instance_id}", response_model=WorkflowInstanceResponse)
def get_instance(
    instance_id: int,
    current_user=Depends(require_workflow_use),
    db: Session = Depends(get_db),
):
    try:
        result = WorkflowService(db).get_instance(current_user, instance_id)
    except PermissionError as exc:
        _permission_error(exc)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instance not found")
    return result


@router.post("/instances/{instance_id}/steps/{step_id}/approve", response_model=WorkflowInstanceResponse)
def approve_step(
    instance_id: int,
    step_id: int,
    payload: StepActionRequest,
    current_user=Depends(require_workflow_approve),
    db: Session = Depends(get_db),
):
    try:
        result = WorkflowService(db).approve_step(
            current_user, instance_id, step_id, payload.comment
        )
    except PermissionError as exc:
        _permission_error(exc)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instance not found")
    return result


@router.post("/instances/{instance_id}/steps/{step_id}/reject", response_model=WorkflowInstanceResponse)
def reject_step(
    instance_id: int,
    step_id: int,
    payload: StepActionRequest,
    current_user=Depends(require_workflow_approve),
    db: Session = Depends(get_db),
):
    try:
        result = WorkflowService(db).reject_step(
            current_user, instance_id, step_id, payload.comment
        )
    except PermissionError as exc:
        _permission_error(exc)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instance not found")
    return result


@router.post("/instances/{instance_id}/cancel", response_model=WorkflowInstanceResponse)
def cancel_instance(
    instance_id: int,
    current_user=Depends(require_workflow_use),
    db: Session = Depends(get_db),
):
    try:
        result = WorkflowService(db).cancel_instance(current_user, instance_id)
    except PermissionError as exc:
        _permission_error(exc)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instance not found")
    return result


@router.get("/notifications/me")
def list_my_notifications(
    unread_only: bool = False,
    current_user=Depends(require_workflow_use),
    db: Session = Depends(get_db),
):
    return NotificationService(db).list_for_user(
        current_user.organization_id, current_user.id, unread_only=unread_only
    )


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user=Depends(require_workflow_use),
    db: Session = Depends(get_db),
):
    ok = NotificationService(db).mark_read(
        current_user.organization_id, current_user.id, notification_id
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return {"read": True}


@router.get("", response_model=List[WorkflowResponse])
def list_workflows(current_user=Depends(require_workflow_use), db: Session = Depends(get_db)):
    return WorkflowService(db).list_workflows(current_user)


@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
def create_workflow(
    payload: WorkflowCreate,
    current_user=Depends(require_workflow_manage),
    db: Session = Depends(get_db),
):
    try:
        return WorkflowService(db).create_workflow(current_user, payload.model_dump())
    except PermissionError as exc:
        _permission_error(exc)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(
    workflow_id: int,
    current_user=Depends(require_workflow_use),
    db: Session = Depends(get_db),
):
    result = WorkflowService(db).get_workflow(current_user, workflow_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    return result


@router.patch("/{workflow_id}", response_model=WorkflowResponse)
def update_workflow(
    workflow_id: int,
    payload: WorkflowUpdate,
    current_user=Depends(require_workflow_manage),
    db: Session = Depends(get_db),
):
    try:
        result = WorkflowService(db).update_workflow(
            current_user, workflow_id, payload.model_dump(exclude_unset=True)
        )
    except PermissionError as exc:
        _permission_error(exc)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    return result


@router.post("/{workflow_id}/disable", response_model=WorkflowResponse)
def disable_workflow(
    workflow_id: int,
    current_user=Depends(require_workflow_manage),
    db: Session = Depends(get_db),
):
    try:
        result = WorkflowService(db).disable_workflow(current_user, workflow_id)
    except PermissionError as exc:
        _permission_error(exc)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    return result


@router.delete("/{workflow_id}")
def delete_workflow(
    workflow_id: int,
    current_user=Depends(require_workflow_manage),
    db: Session = Depends(get_db),
):
    try:
        result = WorkflowService(db).delete_workflow(current_user, workflow_id)
    except PermissionError as exc:
        _permission_error(exc)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    return result


@router.post("/{workflow_id}/start", response_model=WorkflowInstanceResponse)
def start_workflow(
    workflow_id: int,
    payload: InstanceStartRequest,
    current_user=Depends(require_workflow_use),
    db: Session = Depends(get_db),
):
    try:
        result = WorkflowService(db).start_instance(current_user, workflow_id, payload.title)
    except (ValueError, PermissionError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    return result
