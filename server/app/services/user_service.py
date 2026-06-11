from sqlalchemy.orm import Session

from app.core.dependencies import (
    EMPLOYEE_ROLE,
    MANAGER_ROLE,
    ORG_ADMIN_ROLE,
    SUPER_ADMIN_ROLE,
)
from app.core.security import hash_password
from app.repositories.department_repository import DepartmentRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.team_repository import TeamRepository
from app.repositories.user_repository import UserRepository


class UserService:

    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)
        self.department_repo = DepartmentRepository(db)
        self.team_repo = TeamRepository(db)

    def _role_by_name(self, role_name: str):
        role = self.role_repo.get_by_name(role_name)

        if not role:
            raise ValueError(f"{role_name} role not found")

        return role

    def list_visible_users(self, current_user):
        role_name = current_user.role.name if current_user.role else None

        if role_name == SUPER_ADMIN_ROLE:
            return self.user_repo.list_all()

        if role_name == ORG_ADMIN_ROLE:
            return self.user_repo.list_by_organization(current_user.organization_id)

        if role_name == MANAGER_ROLE:
            employee_role = self._role_by_name(EMPLOYEE_ROLE)
            return self.user_repo.list_by_organization_and_roles(
                current_user.organization_id,
                [employee_role.id],
            )

        return [current_user]

    def create_user_for_org(
        self,
        *,
        organization_id: int,
        role_name: str,
        first_name: str,
        last_name: str | None,
        email: str,
        password: str,
    ):
        existing_user = self.user_repo.get_by_email(email)

        if existing_user:
            raise ValueError("Email already registered")

        role = self._role_by_name(role_name)
        password_hash = hash_password(password)

        return self.user_repo.create(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password_hash=password_hash,
            organization_id=organization_id,
            role_id=role.id,
        )

    def create_user_with_role(
        self,
        current_user,
        *,
        first_name: str,
        last_name: str | None,
        email: str,
        password: str,
        role_id: int,
        department_id: int | None = None,
        team_id: int | None = None,
    ):
        current_role = current_user.role.name if current_user.role else None
        if current_role not in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE}:
            raise PermissionError("SUPER_ADMIN or ORG_ADMIN access required")

        role = self.role_repo.get_by_id(role_id)
        if not role:
            raise ValueError("Role not found")
        if role.name == SUPER_ADMIN_ROLE and current_role != SUPER_ADMIN_ROLE:
            raise PermissionError("Only SUPER_ADMIN can create SUPER_ADMIN users")

        user = self.create_user_for_org(
            organization_id=current_user.organization_id,
            role_name=role.name,
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=password,
        )

        if department_id is not None:
            user = self.assign_user_to_department(current_user, user.id, department_id)
            if not user:
                raise ValueError("Department not found")
        if team_id is not None:
            user = self.assign_user_to_team(current_user, user.id, team_id)
            if not user:
                raise ValueError("Team not found")
        return user

    def disable_user(self, current_user, target_user_id: int):
        target_user = self.user_repo.get_by_id(target_user_id)

        if not target_user:
            return None

        current_role = current_user.role.name if current_user.role else None

        if (
            current_role != SUPER_ADMIN_ROLE
            and target_user.organization_id != current_user.organization_id
        ):
            raise PermissionError("Cross-organization user management is not allowed")

        return self.user_repo.update_is_active(
            target_user_id,
            False,
        )

    def get_user_by_id(
        self,
        current_user,
        target_user_id: int,
    ):
        target_user = self.user_repo.get_by_id(target_user_id)

        if not target_user:
            return None

        current_role = current_user.role.name if current_user.role else None

        if (
            current_role != SUPER_ADMIN_ROLE
            and target_user.organization_id != current_user.organization_id
        ):
            raise PermissionError("Cross-organization user access is not allowed")

        return target_user

    def update_user(
        self,
        current_user,
        target_user_id: int,
        first_name: str,
        last_name: str | None,
        email: str,
    ):
        target_user = self.user_repo.get_by_id(target_user_id)

        if not target_user:
            return None

        current_role = current_user.role.name if current_user.role else None

        if (
            current_role != SUPER_ADMIN_ROLE
            and target_user.organization_id != current_user.organization_id
        ):
            raise PermissionError("Cross-organization user management is not allowed")

        existing_user = self.user_repo.get_by_email_excluding_user(
            email=email,
            user_id=target_user_id,
        )

        if existing_user:
            raise ValueError("Email already registered")

        return self.user_repo.update_user(
            user_id=target_user_id,
            first_name=first_name,
            last_name=last_name,
            email=email,
        )

    def enable_user(
        self,
        current_user,
        target_user_id: int,
    ):
        target_user = self.user_repo.get_by_id(target_user_id)

        if not target_user:
            return None

        current_role = current_user.role.name if current_user.role else None

        if (
            current_role != SUPER_ADMIN_ROLE
            and target_user.organization_id != current_user.organization_id
        ):
            raise PermissionError("Cross-organization user management is not allowed")

        return self.user_repo.update_is_active(
            target_user_id,
            True,
        )

    def assign_user_to_department(
        self,
        current_user,
        target_user_id: int,
        department_id: int,
    ):
        target_user = self.user_repo.get_by_id(target_user_id)

        if not target_user:
            return None

        department = self.department_repo.get_by_id(department_id)

        if not department:
            return None

        current_role = current_user.role.name if current_user.role else None

        if (
            current_role != SUPER_ADMIN_ROLE
            and target_user.organization_id != current_user.organization_id
        ):
            raise PermissionError("Cross-organization user management is not allowed")

        if (
            current_role != SUPER_ADMIN_ROLE
            and department.organization_id != current_user.organization_id
        ):
            raise PermissionError(
                "Cross-organization department assignment is not allowed"
            )

        return self.user_repo.update_department_id(
            target_user_id,
            department_id,
        )

    def assign_user_to_team(
        self,
        current_user,
        target_user_id: int,
        team_id: int,
    ):
        target_user = self.user_repo.get_by_id(target_user_id)

        if not target_user:
            return None

        team = self.team_repo.get_by_id(team_id)

        if not team:
            return None

        current_role = current_user.role.name if current_user.role else None

        if (
            current_role != SUPER_ADMIN_ROLE
            and target_user.organization_id != current_user.organization_id
        ):
            raise PermissionError("Cross-organization user management is not allowed")

        if (
            current_role != SUPER_ADMIN_ROLE
            and team.organization_id != current_user.organization_id
        ):
            raise PermissionError("Cross-organization team assignment is not allowed")

        return self.user_repo.update_team_id(
            target_user_id,
            team_id,
        )
