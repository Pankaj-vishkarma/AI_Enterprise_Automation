from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_active_user,
    require_permission,
    MANAGE_DEPARTMENTS_PERMISSION,
)
from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
)
from app.schemas.pagination import PaginatedResponse
from app.services.department_service import DepartmentService

router = APIRouter(
    prefix="/api/v1/departments",
    tags=["departments"],
)

require_manage_departments = require_permission(MANAGE_DEPARTMENTS_PERMISSION)


@router.get(
    "",
    response_model=PaginatedResponse[DepartmentResponse],
)
def list_departments(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = DepartmentService(db)
    rows, total = service.list_departments(current_user, limit=limit, offset=offset)
    return PaginatedResponse[DepartmentResponse](
        items=rows,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "",
    response_model=DepartmentResponse,
)
def create_department(
    payload: DepartmentCreate,
    current_user=Depends(require_manage_departments),
    db: Session = Depends(get_db),
):
    service = DepartmentService(db)
    try:
        return service.create_department(
            current_user=current_user,
            name=payload.name,
            description=payload.description,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.patch(
    "/{department_id}",
    response_model=DepartmentResponse,
)
def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    current_user=Depends(require_manage_departments),
    db: Session = Depends(get_db),
):
    service = DepartmentService(db)
    department = service.update_department(
        current_user=current_user,
        department_id=department_id,
        name=payload.name,
        description=payload.description,
    )
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )
    return department


@router.patch(
    "/{department_id}/disable",
    response_model=DepartmentResponse,
)
def disable_department(
    department_id: int,
    current_user=Depends(require_manage_departments),
    db: Session = Depends(get_db),
):
    service = DepartmentService(db)
    department = service.disable_department(current_user, department_id)
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )
    return department


@router.patch(
    "/{department_id}/enable",
    response_model=DepartmentResponse,
)
def enable_department(
    department_id: int,
    current_user=Depends(require_manage_departments),
    db: Session = Depends(get_db),
):
    service = DepartmentService(db)
    department = service.enable_department(current_user, department_id)
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )
    return department
