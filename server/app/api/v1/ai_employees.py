from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.schemas.ai_employee import (
    AIEmployeeCreate,
    AIEmployeeMetrics,
    AIEmployeeResponse,
    AIEmployeeRunRequest,
    AIEmployeeRunResponse,
    AIEmployeeRunResult,
    AIEmployeeUpdate,
    AVAILABLE_TOOLS,
    EMPLOYEE_TYPE_PRESETS,
    EMPLOYEE_TYPES,
    GROQ_MODELS,
)
from app.services.ai_employee_service import AIEmployeeService

router = APIRouter(prefix="/api/v1/ai-employees", tags=["ai-employees"])


def _handle_permission(exc: PermissionError):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get("/meta/config")
def get_studio_config(current_user=Depends(get_current_active_user)):
    return {
        "employee_types": EMPLOYEE_TYPES,
        "presets": EMPLOYEE_TYPE_PRESETS,
        "tools": AVAILABLE_TOOLS,
        "models": GROQ_MODELS,
    }


@router.get("", response_model=List[AIEmployeeResponse])
def list_employees(current_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    return AIEmployeeService(db).list(current_user)


@router.post("", response_model=AIEmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: AIEmployeeCreate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        return AIEmployeeService(db).create(current_user, payload.model_dump())
    except PermissionError as exc:
        _handle_permission(exc)


@router.get("/{employee_id}", response_model=AIEmployeeResponse)
def get_employee(
    employee_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        result = AIEmployeeService(db).get(current_user, employee_id)
    except PermissionError as exc:
        _handle_permission(exc)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI employee not found")
    return result


@router.patch("/{employee_id}", response_model=AIEmployeeResponse)
def update_employee(
    employee_id: int,
    payload: AIEmployeeUpdate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        result = AIEmployeeService(db).update(
            current_user, employee_id, payload.model_dump(exclude_unset=True)
        )
    except PermissionError as exc:
        _handle_permission(exc)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI employee not found")
    return result


@router.post("/{employee_id}/enable", response_model=AIEmployeeResponse)
def enable_employee(
    employee_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        result = AIEmployeeService(db).enable(current_user, employee_id)
    except PermissionError as exc:
        _handle_permission(exc)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI employee not found")
    return result


@router.post("/{employee_id}/disable", response_model=AIEmployeeResponse)
def disable_employee(
    employee_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        result = AIEmployeeService(db).disable(current_user, employee_id)
    except PermissionError as exc:
        _handle_permission(exc)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI employee not found")
    return result


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        result = AIEmployeeService(db).delete(current_user, employee_id)
    except PermissionError as exc:
        _handle_permission(exc)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI employee not found")
    return result


@router.post("/{employee_id}/run", response_model=AIEmployeeRunResult)
def run_employee(
    employee_id: int,
    payload: AIEmployeeRunRequest,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        result = AIEmployeeService(db).run(current_user, employee_id, payload.task)
    except PermissionError as exc:
        _handle_permission(exc)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI employee not found")
    return result


@router.get("/{employee_id}/runs", response_model=List[AIEmployeeRunResponse])
def list_employee_runs(
    employee_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        result = AIEmployeeService(db).list_runs(current_user, employee_id, limit=limit, offset=offset)
    except PermissionError as exc:
        _handle_permission(exc)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI employee not found")
    return result


@router.get("/{employee_id}/metrics", response_model=AIEmployeeMetrics)
def get_employee_metrics(
    employee_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        result = AIEmployeeService(db).get_metrics(current_user, employee_id)
    except PermissionError as exc:
        _handle_permission(exc)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI employee not found")
    return result
