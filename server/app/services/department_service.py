from sqlalchemy.orm import Session

from app.core.dependencies import (
    MANAGER_ROLE,
    ORG_ADMIN_ROLE,
    SUPER_ADMIN_ROLE,
)

from app.repositories.department_repository import DepartmentRepository
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.user_repository import UserRepository
from app.utils.rbac_scope import resolve_team_member_ids


class DepartmentService:

    def __init__(self, db: Session):
        self.db = db
        self.department_repo = DepartmentRepository(db)
        self.organization_repo = OrganizationRepository(db)
        self.user_repo = UserRepository(db)

    def list_departments(self, current_user):
        all_departments = self.department_repo.list_by_organization(
            current_user.organization_id
        )
        role_name = current_user.role.name

        if role_name in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE}:
            return all_departments

        if role_name == MANAGER_ROLE:
            if not current_user.team_id:
                if current_user.department_id:
                    return [
                        department
                        for department in all_departments
                        if department.id == current_user.department_id
                    ]
                return []
            org_users = self.user_repo.list_by_organization(current_user.organization_id)
            team_member_ids = resolve_team_member_ids(org_users, current_user)
            department_ids = {
                user.department_id
                for user in org_users
                if user.id in team_member_ids and user.department_id is not None
            }
            if current_user.department_id:
                department_ids.add(current_user.department_id)
            return [
                department
                for department in all_departments
                if department.id in department_ids
            ]

        if current_user.department_id:
            return [
                department
                for department in all_departments
                if department.id == current_user.department_id
            ]
        return []

    def create_department(
        self,
        current_user,
        name: str,
        description: str | None,
    ):

        organization = self.organization_repo.get_by_id(current_user.organization_id)

        if not organization:
            raise ValueError("Organization not found")

        existing = self.department_repo.get_by_name(
            current_user.organization_id,
            name,
        )

        if existing:
            raise ValueError("Department already exists")

        return self.department_repo.create(
            organization_id=current_user.organization_id,
            name=name,
            description=description,
        )

    def update_department(
        self,
        current_user,
        department_id: int,
        name: str,
        description: str | None,
    ):

        return self.department_repo.update(
            department_id,
            current_user.organization_id,
            name,
            description,
        )

    def disable_department(
        self,
        current_user,
        department_id: int,
    ):

        return self.department_repo.update_is_active(
            department_id,
            current_user.organization_id,
            False,
        )

    def enable_department(
        self,
        current_user,
        department_id: int,
    ):

        return self.department_repo.update_is_active(
            department_id,
            current_user.organization_id,
            True,
        )