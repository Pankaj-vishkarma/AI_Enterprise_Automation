from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.utils.organization_name import normalize_organization_name


class OrganizationRepository:

    def __init__(self, db: Session):
        self.db = db

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
