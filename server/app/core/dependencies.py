import logging
from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import decode_token

from app.models.role import Role
from app.models.user import User

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

SUPER_ADMIN_ROLE = "SUPER_ADMIN"
ORG_ADMIN_ROLE = "ORG_ADMIN"
MANAGER_ROLE = "MANAGER"
EMPLOYEE_ROLE = "EMPLOYEE"

VIEW_ROLES_PERMISSION = "VIEW_ROLES"
MANAGE_USER_ROLES_PERMISSION = "MANAGE_USER_ROLES"
VIEW_TEAMS_PERMISSION = "VIEW_TEAMS"
MANAGE_TEAMS_PERMISSION = "MANAGE_TEAMS"
VIEW_PERMISSIONS_PERMISSION = "VIEW_PERMISSIONS"
MANAGE_PERMISSIONS_PERMISSION = "MANAGE_PERMISSIONS"
MANAGE_ROLE_PERMISSIONS_PERMISSION = "MANAGE_ROLE_PERMISSIONS"
MANAGE_USER_ASSIGNMENTS_PERMISSION = "MANAGE_USER_ASSIGNMENTS"
KNOWLEDGE_VIEW_PERMISSION = "KNOWLEDGE_VIEW"
KNOWLEDGE_MANAGE_PERMISSION = "KNOWLEDGE_MANAGE"
KNOWLEDGE_ASK_PERMISSION = "KNOWLEDGE_ASK"
MANAGE_DEPARTMENTS_PERMISSION = "MANAGE_DEPARTMENTS"
AI_EMPLOYEE_USE_PERMISSION = "AI_EMPLOYEE_USE"
AI_EMPLOYEE_MANAGE_PERMISSION = "AI_EMPLOYEE_MANAGE"
COLLABORATION_USE_PERMISSION = "COLLABORATION_USE"
COLLABORATION_MANAGE_PERMISSION = "COLLABORATION_MANAGE"
WORKFLOW_USE_PERMISSION = "WORKFLOW_USE"
WORKFLOW_MANAGE_PERMISSION = "WORKFLOW_MANAGE"
WORKFLOW_APPROVE_PERMISSION = "WORKFLOW_APPROVE"
RESEARCH_ACCESS_PERMISSION = "RESEARCH_ACCESS"
BROWSER_ACCESS_PERMISSION = "BROWSER_ACCESS"
VOICE_ACCESS_PERMISSION = "VOICE_ACCESS"
SUPPORT_VIEW_PERMISSION = "SUPPORT_VIEW"
SUPPORT_MANAGE_PERMISSION = "SUPPORT_MANAGE"
OMNICHANNEL_VIEW_PERMISSION = "OMNICHANNEL_VIEW"
OMNICHANNEL_MANAGE_PERMISSION = "OMNICHANNEL_MANAGE"
ANALYTICS_VIEW_PERMISSION = "ANALYTICS_VIEW"

ELEVATED_ROLES = frozenset({SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE, MANAGER_ROLE})

# Roles that organization admins may assign when creating or editing users.
ORG_ASSIGNABLE_ROLE_NAMES = frozenset({ORG_ADMIN_ROLE, MANAGER_ROLE, EMPLOYEE_ROLE})


def get_user_permissions(user) -> set[str]:
    role_name = getattr(getattr(user, "role", None), "name", None)
    if role_name == SUPER_ADMIN_ROLE:
        return {
            permission.name
            for permission in getattr(getattr(user, "role", None), "permissions", [])
        } | {
            VIEW_ROLES_PERMISSION,
            MANAGE_USER_ROLES_PERMISSION,
            VIEW_TEAMS_PERMISSION,
            MANAGE_TEAMS_PERMISSION,
            VIEW_PERMISSIONS_PERMISSION,
            MANAGE_PERMISSIONS_PERMISSION,
            MANAGE_ROLE_PERMISSIONS_PERMISSION,
            MANAGE_USER_ASSIGNMENTS_PERMISSION,
            MANAGE_DEPARTMENTS_PERMISSION,
            KNOWLEDGE_VIEW_PERMISSION,
            KNOWLEDGE_MANAGE_PERMISSION,
            KNOWLEDGE_ASK_PERMISSION,
            AI_EMPLOYEE_USE_PERMISSION,
            AI_EMPLOYEE_MANAGE_PERMISSION,
            COLLABORATION_USE_PERMISSION,
            COLLABORATION_MANAGE_PERMISSION,
            WORKFLOW_USE_PERMISSION,
            WORKFLOW_MANAGE_PERMISSION,
            WORKFLOW_APPROVE_PERMISSION,
            RESEARCH_ACCESS_PERMISSION,
            BROWSER_ACCESS_PERMISSION,
            VOICE_ACCESS_PERMISSION,
            SUPPORT_VIEW_PERMISSION,
            SUPPORT_MANAGE_PERMISSION,
            OMNICHANNEL_VIEW_PERMISSION,
            OMNICHANNEL_MANAGE_PERMISSION,
            ANALYTICS_VIEW_PERMISSION,
        }
    return {
        permission.name
        for permission in getattr(getattr(user, "role", None), "permissions", [])
    }


def user_has_permission(user, permission_name: str) -> bool:
    return permission_name in get_user_permissions(user)


def _role_guard(*allowed_roles: str) -> Callable:
    allowed = set(allowed_roles)

    def dependency(user=Depends(get_current_active_user)):
        role_name = getattr(getattr(user, "role", None), "name", None)

        if role_name not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{', '.join(sorted(allowed))} access required",
            )

        return user

    return dependency


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):

    if credentials is None:
        logger.debug("Authorization header missing on protected route")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    payload = decode_token(credentials.credentials)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = (
        db.query(User)
        .options(
            joinedload(User.role).joinedload(Role.permissions),
            joinedload(User.organization),
            joinedload(User.department),
            joinedload(User.team),
        )
        .filter(User.id == int(user_id))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


def get_current_active_user(
    user=Depends(get_current_user),
):
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    if not getattr(user, "role", None):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not assigned",
        )

    return user


def require_role(*allowed_roles: str):
    return _role_guard(*allowed_roles)


def require_permission(*allowed_permissions: str):
    allowed = set(allowed_permissions)

    def dependency(user=Depends(get_current_active_user)):
        role_name = getattr(getattr(user, "role", None), "name", None)

        if role_name == SUPER_ADMIN_ROLE:
            return user

        permissions = {
            permission.name
            for permission in getattr(getattr(user, "role", None), "permissions", [])
        }

        if not permissions.intersection(allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{', '.join(sorted(allowed))} permission required",
            )

        return user

    return dependency


require_super_admin = require_role(SUPER_ADMIN_ROLE)
require_org_admin = require_role(ORG_ADMIN_ROLE)
require_manager = require_role(MANAGER_ROLE)
require_employee = require_role(EMPLOYEE_ROLE)
require_elevated_role = require_role(SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE, MANAGER_ROLE)
