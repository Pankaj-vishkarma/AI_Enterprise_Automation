import logging
from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import decode_token

from app.models.user import User

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

SUPER_ADMIN_ROLE = "SUPER_ADMIN"
ORG_ADMIN_ROLE = "ORG_ADMIN"
MANAGER_ROLE = "MANAGER"
EMPLOYEE_ROLE = "EMPLOYEE"


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
        .options(joinedload(User.role), joinedload(User.organization))
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


require_super_admin = require_role(SUPER_ADMIN_ROLE)
require_org_admin = require_role(ORG_ADMIN_ROLE)
require_manager = require_role(MANAGER_ROLE)
require_employee = require_role(EMPLOYEE_ROLE)
