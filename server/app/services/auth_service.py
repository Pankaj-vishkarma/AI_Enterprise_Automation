from sqlalchemy.orm import Session

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_password_reset_token,
    decode_password_reset_token,
    decode_token,
)

from app.repositories.user_repository import UserRepository
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.user_session_repository import UserSessionRepository
from app.services.rbac_service import RbacService
from app.core.dependencies import get_user_permissions
from app.utils.organization_name import ORGANIZATION_EXISTS_MESSAGE

PUBLIC_REGISTRATION_ROLE = "ORG_ADMIN"


class AuthService:

    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)
        self.organization_repo = OrganizationRepository(db)
        self.role_repo = RoleRepository(db)
        self.session_repo = UserSessionRepository(db)

    def register_user(
        self,
        organization_name: str,
        first_name: str,
        last_name: str | None,
        email: str,
        password: str,
    ):
        trimmed_org_name = organization_name.strip()

        if self.organization_repo.get_by_normalized_name(trimmed_org_name):
            raise ValueError(ORGANIZATION_EXISTS_MESSAGE)

        organization = self.organization_repo.create(trimmed_org_name)

        RbacService(self.user_repo.db).ensure_rbac_defaults()

        role = self.role_repo.get_by_name(PUBLIC_REGISTRATION_ROLE)

        if not role:
            raise ValueError(f"{PUBLIC_REGISTRATION_ROLE} role not found")

        password_hash = hash_password(password)

        return self.user_repo.create(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password_hash=password_hash,
            organization_id=organization.id,
            role_id=role.id,
        )

    def authenticate(
        self,
        email: str,
        password: str,
    ):

        user = self.user_repo.get_by_email(email)

        if not user:
            return None

        if not user.is_active:
            return None

        if not verify_password(
            password,
            user.password_hash,
        ):
            return None

        access_token = create_access_token(
            {
                "sub": str(user.id),
            }
        )

        refresh_token = create_refresh_token(
            {
                "sub": str(user.id),
            }
        )

        self.session_repo.create_session(
            user_id=user.id,
            refresh_token=refresh_token,
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }

    def refresh_access_token(
        self,
        refresh_token: str,
    ):

        session = self.session_repo.get_by_refresh_token(refresh_token)

        if not session:
            return None

        payload = decode_token(refresh_token)

        if not payload:
            return None

        user_id = payload.get("sub")

        if not user_id:
            return None

        user = self.user_repo.get_by_id(int(user_id))

        if not user or not user.is_active:
            return None

        self.session_repo.delete_by_refresh_token(refresh_token)

        new_refresh_token = create_refresh_token(
            {
                "sub": str(user.id),
            }
        )

        self.session_repo.create_session(
            user_id=user.id,
            refresh_token=new_refresh_token,
        )

        access_token = create_access_token(
            {
                "sub": str(user.id),
            }
        )

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
        }

    def logout(
        self,
        refresh_token: str,
    ):

        self.session_repo.delete_by_refresh_token(refresh_token)

        return True

    def logout_all_sessions(
        self,
        user_id: int,
    ):
        self.session_repo.delete_by_user_id(user_id)

        return True

    def request_password_reset(self, email: str) -> bool:
        """Always returns True to avoid email enumeration."""
        user = self.user_repo.get_by_email(email)
        if user and user.is_active:
            token = create_password_reset_token(user.id)
            # Token is issued; email delivery is integration-ready (not configured here).
            _ = token
        return True

    def reset_password(self, token: str, new_password: str) -> bool:
        user_id = decode_password_reset_token(token)
        if not user_id:
            return False
        user = self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            return False
        password_hash = hash_password(new_password)
        user.password_hash = password_hash
        self.user_repo.db.commit()
        self.session_repo.delete_by_user_id(user.id)
        return True

    def get_user_profile(self, user) -> dict:
        last_session = self.session_repo.get_latest_by_user_id(user.id)
        full_name = f"{user.first_name} {user.last_name or ''}".strip()

        return {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": full_name,
            "email": user.email,
            "username": None,
            "organization_id": user.organization_id,
            "organization_name": user.organization.name if user.organization else None,
            "role_id": user.role_id,
            "role": user.role.name if user.role else None,
            "department_id": user.department_id,
            "department": user.department.name if user.department else None,
            "team_id": user.team_id,
            "team": user.team.name if user.team else None,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "last_login": last_session.created_at if last_session else None,
            "permissions": sorted(get_user_permissions(user)),
        }
