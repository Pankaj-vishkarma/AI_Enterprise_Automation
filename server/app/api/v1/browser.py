from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission, BROWSER_ACCESS_PERMISSION
from app.schemas.browser import BrowserMetrics, BrowserTaskResponse, BrowserTaskRunRequest
from app.services.browser_service import BrowserService

router = APIRouter(prefix="/api/v1/browser", tags=["browser"])


@router.get("/templates")
def get_templates(current_user=Depends(require_permission(BROWSER_ACCESS_PERMISSION)), db: Session = Depends(get_db)):
    return BrowserService(db).get_templates()


@router.get("/metrics", response_model=BrowserMetrics)
def get_metrics(current_user=Depends(require_permission(BROWSER_ACCESS_PERMISSION)), db: Session = Depends(get_db)):
    return BrowserService(db).get_metrics(current_user)


@router.get("/tasks", response_model=List[BrowserTaskResponse])
def list_tasks(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(require_permission(BROWSER_ACCESS_PERMISSION)),
    db: Session = Depends(get_db),
):
    return BrowserService(db).list_tasks(current_user, limit=limit, offset=offset)


@router.post("/tasks/run", response_model=BrowserTaskResponse)
def run_task(
    payload: BrowserTaskRunRequest,
    current_user=Depends(require_permission(BROWSER_ACCESS_PERMISSION)),
    db: Session = Depends(get_db),
):
    login_config = payload.login.model_dump() if payload.login else None
    steps = [step.model_dump() for step in payload.steps] if payload.steps else None
    return BrowserService(db).run_task(
        current_user,
        payload.instruction,
        payload.task_type,
        payload.title,
        payload.target_url,
        steps=steps,
        form_data=payload.form_data,
        login_config=login_config,
        submit_form=payload.submit_form,
        max_pages=payload.max_pages,
    )


@router.post("/tasks/{task_id}/retry", response_model=BrowserTaskResponse)
def retry_task(
    task_id: int,
    current_user=Depends(require_permission(BROWSER_ACCESS_PERMISSION)),
    db: Session = Depends(get_db),
):
    try:
        result = BrowserService(db).retry_task(current_user, task_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return result


@router.get("/tasks/{task_id}", response_model=BrowserTaskResponse)
def get_task(
    task_id: int,
    current_user=Depends(require_permission(BROWSER_ACCESS_PERMISSION)),
    db: Session = Depends(get_db),
):
    try:
        result = BrowserService(db).get_task(current_user, task_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return result


@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    current_user=Depends(require_permission(BROWSER_ACCESS_PERMISSION)),
    db: Session = Depends(get_db),
):
    try:
        result = BrowserService(db).delete_task(current_user, task_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return result
