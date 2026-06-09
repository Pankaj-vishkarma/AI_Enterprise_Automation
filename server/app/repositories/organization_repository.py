from sqlalchemy.orm import Session

from app.models.organization import Organization


class OrganizationRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_by_name(self, name: str):
        return self.db.query(Organization).filter(Organization.name == name).first()

    def get_by_id(self, organization_id: int):
        return (
            self.db.query(Organization)
            .filter(Organization.id == organization_id)
            .first()
        )

    def create(self, name: str):

        organization = Organization(name=name)

        self.db.add(organization)
        self.db.commit()
        self.db.refresh(organization)

        return organization
