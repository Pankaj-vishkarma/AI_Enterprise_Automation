from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_active_user,
    require_org_admin,
    require_super_admin,
)
from app.schemas.user_management import ManagedUserCreate, UserOut
from app.services.user_service import UserService

router = APIRouter(prefix="/api/v1/users", tags=["users"])


def _serialize_user(user):
    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "organization_id": user.organization_id,
        "role_id": user.role_id,
        "is_active": user.is_active,
    }


@router.get("", response_model=list[UserOut])
def list_users(
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    return service.list_visible_users(current_user)


@router.post("/org-admins", response_model=UserOut)
def create_org_admin(
    payload: ManagedUserCreate,
    organization_id: int,
    current_user=Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    user = service.create_user_for_org(
        organization_id=organization_id,
        role_name="ORG_ADMIN",
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        password=payload.password,
    )
    return user


@router.post("/managers", response_model=UserOut)
def create_manager(
    payload: ManagedUserCreate,
    current_user=Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    user = service.create_user_for_org(
        organization_id=current_user.organization_id,
        role_name="MANAGER",
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        password=payload.password,
    )
    return user


@router.post("/employees", response_model=UserOut)
def create_employee(
    payload: ManagedUserCreate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    current_role = current_user.role.name if current_user.role else None

    if current_role not in {"SUPER_ADMIN", "ORG_ADMIN", "MANAGER"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ORG_ADMIN, MANAGER, or SUPER_ADMIN access required",
        )

    service = UserService(db)
    user = service.create_user_for_org(
        organization_id=current_user.organization_id,
        role_name="EMPLOYEE",
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        password=payload.password,
    )
    return user


@router.patch("/{user_id}/disable", response_model=UserOut)
def disable_user(
    user_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    current_role = current_user.role.name if current_user.role else None

    if current_role not in {"SUPER_ADMIN", "ORG_ADMIN"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPER_ADMIN or ORG_ADMIN access required",
        )

    service = UserService(db)
    try:
        user = service.disable_user(current_user, user_id)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user
