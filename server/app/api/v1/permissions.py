from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    MANAGE_PERMISSIONS_PERMISSION,
    MANAGE_ROLE_PERMISSIONS_PERMISSION,
    VIEW_PERMISSIONS_PERMISSION,
    require_permission,
)
from app.schemas.permission import (
    PermissionCreate,
    PermissionResponse,
    RolePermissionsUpdate,
)
from app.schemas.role import RoleResponse
from app.services.permission_service import PermissionService

router = APIRouter(
    prefix="/api/v1/permissions",
    tags=["permissions"],
)


@router.get("", response_model=list[PermissionResponse])
def list_permissions(
    current_user=Depends(require_permission(VIEW_PERMISSIONS_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = PermissionService(db)
    return service.list_permissions()


@router.post("", response_model=PermissionResponse)
def create_permission(
    payload: PermissionCreate,
    current_user=Depends(require_permission(MANAGE_PERMISSIONS_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = PermissionService(db)

    try:
        permission = service.create_permission(
            payload.name,
            payload.description,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return permission


@router.patch("/roles/{role_id}", response_model=RoleResponse)
def assign_permissions_to_role(
    role_id: int,
    payload: RolePermissionsUpdate,
    current_user=Depends(require_permission(MANAGE_ROLE_PERMISSIONS_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = PermissionService(db)

    try:
        role = service.assign_permissions_to_role(
            role_id,
            payload.permission_ids,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    return role
