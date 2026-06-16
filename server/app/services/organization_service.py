from typing import Optional

from sqlalchemy.orm import Session

from app.repositories.organization_repository import OrganizationRepository
from app.utils.organization_name import ORGANIZATION_EXISTS_MESSAGE, normalize_organization_name


class OrganizationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = OrganizationRepository(db)

    def list_organizations(
        self,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list:
        rows = self.repo.list_paginated(
            limit=limit,
            offset=offset,
            search=search,
            status=status,
        )
        return rows

    def get_organization(self, organization_id: int):
        return self.repo.get_by_id(organization_id)

    def update_organization(self, organization_id: int, name: str | None = None, status: str | None = None):
        organization = self.repo.get_by_id(organization_id)
        if not organization:
            return None

        name_changed = False
        if name is not None:
            normalized = normalize_organization_name(name)
            current_normalized = normalize_organization_name(organization.name)
            if normalized != current_normalized:
                name_changed = True
                existing = self.repo.get_by_normalized_name(name)
                if existing and existing.id != organization_id:
                    raise ValueError(ORGANIZATION_EXISTS_MESSAGE)
            if not normalized:
                raise ValueError("Organization name is required")

        status_changed = status is not None and status != organization.status
        if not name_changed and not status_changed:
            return organization

        return self.repo.save(organization, name=name, status=status)
