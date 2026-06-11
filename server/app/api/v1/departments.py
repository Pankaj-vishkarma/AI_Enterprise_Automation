from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_active_user,
)

from app.services.department_service import DepartmentService

from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
)

router = APIRouter(
    prefix="/api/v1/departments",
    tags=["departments"],
)


@router.get(
    "",
    response_model=List[DepartmentResponse],
)
def list_departments(
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = DepartmentService(db)

    return service.list_departments(current_user)


@router.post(
    "",
    response_model=DepartmentResponse,
)
def create_department(
    payload: DepartmentCreate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):

    role_name = current_user.role.name

    if role_name not in {"SUPER_ADMIN", "ORG_ADMIN"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPER_ADMIN or ORG_ADMIN access required",
        )

    service = DepartmentService(db)

    try:
        department = service.create_department(
            current_user=current_user,
            name=payload.name,
            description=payload.description,
        )

        return department

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
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):

    role_name = current_user.role.name

    if role_name not in {"SUPER_ADMIN", "ORG_ADMIN"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPER_ADMIN or ORG_ADMIN access required",
        )

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
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):

    role_name = current_user.role.name

    if role_name not in {"SUPER_ADMIN", "ORG_ADMIN"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPER_ADMIN or ORG_ADMIN access required",
        )

    service = DepartmentService(db)

    department = service.disable_department(
        current_user,
        department_id,
    )

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
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):

    role_name = current_user.role.name

    if role_name not in {"SUPER_ADMIN", "ORG_ADMIN"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPER_ADMIN or ORG_ADMIN access required",
        )

    service = DepartmentService(db)

    department = service.enable_department(
        current_user,
        department_id,
    )

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )

    return department
