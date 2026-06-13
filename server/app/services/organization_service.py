from sqlalchemy.orm import Session

from app.repositories.organization_repository import OrganizationRepository
from app.utils.organization_name import ORGANIZATION_EXISTS_MESSAGE, normalize_organization_name


class OrganizationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = OrganizationRepository(db)

    def list_organizations(self):
        return self.repo.list_all()

    def get_organization(self, organization_id: int):
        return self.repo.get_by_id(organization_id)

    def update_organization(self, organization_id: int, name: str | None = None, status: str | None = None):
        organization = self.repo.get_by_id(organization_id)
        if not organization:
            return None
        if name is not None:
            normalized = normalize_organization_name(name)
            existing = self.repo.get_by_normalized_name(name)
            if existing and existing.id != organization_id:
                raise ValueError(ORGANIZATION_EXISTS_MESSAGE)
            if not normalized:
                raise ValueError("Organization name is required")
        return self.repo.update(organization_id, name=name, status=status)
