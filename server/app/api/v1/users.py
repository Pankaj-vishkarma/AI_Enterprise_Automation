from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_active_user,
    require_permission,
    require_org_admin,
    require_super_admin,
    MANAGE_USER_ASSIGNMENTS_PERMISSION,
    MANAGE_USER_ROLES_PERMISSION,
)
from app.schemas.pagination import PaginatedResponse
from app.schemas.user_management import (
    AssignUserDepartmentRequest,
    AssignUserTeamRequest,
    ManagedUserCreate,
    UserAssignmentResponse,
    UserListOut,
    UserOut,
    UserUpdate,
)
from app.schemas.role import ChangeUserRoleRequest
from app.services.role_service import RoleService
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


@router.get("", response_model=PaginatedResponse[UserListOut])
def list_users(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    rows, total = service.list_visible_users(current_user, limit=limit, offset=offset)
    return PaginatedResponse[UserListOut](
        items=rows,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=UserOut)
def create_user(
    payload: ManagedUserCreate,
    current_user=Depends(require_permission(MANAGE_USER_ROLES_PERMISSION)),
    db: Session = Depends(get_db),
):
    if payload.role_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="role_id is required",
        )
    service = UserService(db)
    try:
        return service.create_user_with_role(
            current_user,
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            password=payload.password,
            role_id=payload.role_id,
            department_id=payload.department_id,
            team_id=payload.team_id,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


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


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = UserService(db)

    try:
        user = service.get_user_by_id(
            current_user,
            user_id,
        )
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


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
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
        user = service.update_user(
            current_user=current_user,
            target_user_id=user_id,
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


@router.patch("/{user_id}/enable", response_model=UserOut)
def enable_user(
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
        user = service.enable_user(
            current_user,
            user_id,
        )
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


@router.patch("/{user_id}/department", response_model=UserAssignmentResponse)
def assign_user_department(
    user_id: int,
    payload: AssignUserDepartmentRequest,
    current_user=Depends(require_permission(MANAGE_USER_ASSIGNMENTS_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = UserService(db)

    try:
        user = service.assign_user_to_department(
            current_user,
            user_id,
            payload.department_id,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User or department not found",
        )

    return user


@router.patch("/{user_id}/team", response_model=UserAssignmentResponse)
def assign_user_team(
    user_id: int,
    payload: AssignUserTeamRequest,
    current_user=Depends(require_permission(MANAGE_USER_ASSIGNMENTS_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = UserService(db)

    try:
        user = service.assign_user_to_team(
            current_user,
            user_id,
            payload.team_id,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User or team not found",
        )

    return user


@router.patch("/{user_id}/role", response_model=UserAssignmentResponse)
def change_user_role(
    user_id: int,
    payload: ChangeUserRoleRequest,
    current_user=Depends(require_permission(MANAGE_USER_ROLES_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = RoleService(db)

    try:
        user = service.change_user_role(
            current_user,
            user_id,
            payload.role_id,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user
