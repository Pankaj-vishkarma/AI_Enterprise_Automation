from sqlalchemy.orm import Session

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

from app.repositories.user_repository import UserRepository
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.user_session_repository import UserSessionRepository

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

        organization = self.organization_repo.get_by_name(organization_name)

        if not organization:
            organization = self.organization_repo.create(organization_name)

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
