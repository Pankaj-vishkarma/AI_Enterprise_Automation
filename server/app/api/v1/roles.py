from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import VIEW_ROLES_PERMISSION, require_permission
from app.schemas.role import RoleResponse
from app.services.role_service import RoleService

router = APIRouter(
    prefix="/api/v1/roles",
    tags=["roles"],
)


@router.get("", response_model=list[RoleResponse])
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
