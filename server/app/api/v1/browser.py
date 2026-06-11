from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.schemas.browser import BrowserMetrics, BrowserTaskResponse, BrowserTaskRunRequest
from app.services.browser_service import BrowserService

router = APIRouter(prefix="/api/v1/browser", tags=["browser"])


@router.get("/templates")
def get_templates(current_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    return BrowserService(db).get_templates()


@router.get("/metrics", response_model=BrowserMetrics)
def get_metrics(current_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    return BrowserService(db).get_metrics(current_user)


@router.get("/tasks", response_model=List[BrowserTaskResponse])
def list_tasks(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return BrowserService(db).list_tasks(current_user, limit=limit, offset=offset)


@router.post("/tasks/run", response_model=BrowserTaskResponse)
def run_task(
    payload: BrowserTaskRunRequest,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return BrowserService(db).run_task(
        current_user,
        payload.instruction,
        payload.task_type,
        payload.title,
        payload.target_url,
    )


@router.get("/tasks/{task_id}", response_model=BrowserTaskResponse)
def get_task(
    task_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    result = BrowserService(db).get_task(current_user, task_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return result


@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    result = BrowserService(db).delete_task(current_user, task_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return result
