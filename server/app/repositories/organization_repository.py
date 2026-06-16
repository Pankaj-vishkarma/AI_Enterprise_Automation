from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.utils.organization_name import normalize_organization_name


class OrganizationRepository:

    def __init__(self, db: Session):
        self.db = db

    def _filtered_query(self, search: Optional[str] = None, status: Optional[str] = None):
        query = self.db.query(Organization)
        if search:
            term = search.strip()
            if term:
                query = query.filter(Organization.name.ilike(f"%{term}%"))
        if status:
            query = query.filter(Organization.status == status)
        return query

    def get_by_name(self, name: str):
        return self.db.query(Organization).filter(Organization.name == name).first()

    def get_by_normalized_name(self, name: str):
        normalized = normalize_organization_name(name)
        return (
            self.db.query(Organization)
            .filter(func.lower(func.trim(Organization.name)) == normalized)
            .first()
        )

    def get_by_id(self, organization_id: int):
        return (
            self.db.query(Organization)
            .filter(Organization.id == organization_id)
            .first()
        )

    def create(self, name: str):
        trimmed_name = name.strip()

        organization = Organization(name=trimmed_name)

        self.db.add(organization)
        self.db.commit()
        self.db.refresh(organization)

        return organization

    def list_all(self):
        return (
            self.db.query(Organization)
            .order_by(Organization.id.asc())
            .all()
        )

    def list_paginated(
        self,
        limit: int,
        offset: int,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list:
        return (
            self._filtered_query(search=search, status=status)
            .order_by(Organization.id.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def save(self, organization: Organization, name: str | None = None, status: str | None = None):
        if name is not None:
            organization.name = name.strip()
        if status is not None:
            organization.status = status
        self.db.commit()
        return organization

    def update(self, organization_id: int, name: str | None = None, status: str | None = None):
        organization = self.get_by_id(organization_id)
        if not organization:
            return None
        return self.save(organization, name=name, status=status)
