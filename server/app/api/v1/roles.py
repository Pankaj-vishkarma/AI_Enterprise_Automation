from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import MANAGE_USER_ROLES_PERMISSION, VIEW_ROLES_PERMISSION, require_permission
from app.schemas.role import RoleCreate, RoleResponse, RoleUpdate
from app.services.role_service import RoleService

router = APIRouter(
    prefix="/api/v1/roles",
    tags=["roles"],
)


@router.get("", response_model=List[RoleResponse])
def list_roles(
    current_user=Depends(require_permission(VIEW_ROLES_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = RoleService(db)
    return service.list_roles()


@router.get("/{role_id}", response_model=RoleResponse)
def get_role(
    role_id: int,
    current_user=Depends(require_permission(VIEW_ROLES_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = RoleService(db)
    role = service.get_role_by_id(role_id)

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    return role


@router.post("", response_model=RoleResponse)
def create_role(
    payload: RoleCreate,
    current_user=Depends(require_permission(MANAGE_USER_ROLES_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = RoleService(db)
    try:
        return service.create_role(current_user, payload.name, payload.permission_ids)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int,
    payload: RoleUpdate,
    current_user=Depends(require_permission(MANAGE_USER_ROLES_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = RoleService(db)
    try:
        role = service.update_role(current_user, role_id, payload.name, payload.permission_ids)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return role


@router.delete("/{role_id}")
def delete_role(
    role_id: int,
    current_user=Depends(require_permission(MANAGE_USER_ROLES_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = RoleService(db)
    try:
        role = service.delete_role(current_user, role_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return {"deleted": True}
