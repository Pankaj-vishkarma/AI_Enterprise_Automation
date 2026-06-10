from sqlalchemy.orm import Session

from app.core.dependencies import (
    ORG_ADMIN_ROLE,
    SUPER_ADMIN_ROLE,
)

from app.repositories.department_repository import DepartmentRepository
from app.repositories.organization_repository import OrganizationRepository


class DepartmentService:

    def __init__(self, db: Session):
        self.db = db
        self.department_repo = DepartmentRepository(db)
        self.organization_repo = OrganizationRepository(db)

    def list_departments(self, current_user):

        role_name = current_user.role.name

        if role_name == SUPER_ADMIN_ROLE:
            return self.department_repo.list_by_organization(
                current_user.organization_id
            )

        return self.department_repo.list_by_organization(current_user.organization_id)

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
        department_id: int,
        name: str,
        description: str | None,
    ):

        return self.department_repo.update(
            department_id,
            name,
            description,
        )

    def disable_department(
        self,
        department_id: int,
    ):

        return self.department_repo.update_is_active(
            department_id,
            False,
        )
