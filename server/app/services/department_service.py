from sqlalchemy.orm import Session

from app.core.dependencies import (
    MANAGER_ROLE,
    ORG_ADMIN_ROLE,
    SUPER_ADMIN_ROLE,
)

from app.repositories.department_repository import DepartmentRepository
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.user_repository import UserRepository


class DepartmentService:

    def __init__(self, db: Session):
        self.db = db
        self.department_repo = DepartmentRepository(db)
        self.organization_repo = OrganizationRepository(db)
        self.user_repo = UserRepository(db)

    def _manager_department_ids(self, current_user) -> list[int] | None:
        role_name = current_user.role.name

        if role_name != MANAGER_ROLE:
            return None

        if not current_user.team_id:
            if current_user.department_id:
                return [current_user.department_id]
            return []

        return self.department_repo.list_department_ids_for_team(
            current_user.organization_id,
            current_user.team_id,
            include_department_id=current_user.department_id,
        )

    def list_departments(
        self,
        current_user,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list, int]:
        role_name = current_user.role.name
        organization_id = current_user.organization_id

        if role_name in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE}:
            return self.department_repo.list_paginated(
                organization_id,
                limit=limit,
                offset=offset,
            )

        if role_name == MANAGER_ROLE:
            department_ids = self._manager_department_ids(current_user)
            return self.department_repo.list_paginated(
                organization_id,
                limit=limit,
                offset=offset,
                department_ids=department_ids,
            )

        if current_user.department_id:
            return self.department_repo.list_paginated(
                organization_id,
                limit=limit,
                offset=offset,
                department_ids=[current_user.department_id],
            )
        return [], 0

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
