from sqlalchemy.orm import Session

from app.models.department import Department


class DepartmentRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        organization_id: int,
        name: str,
        description: str | None,
    ):
        department = Department(
            organization_id=organization_id,
            name=name,
            description=description,
        )

        self.db.add(department)
        self.db.commit()
        self.db.refresh(department)

        return department

    def get_by_id(self, department_id: int):
        return self.db.query(Department).filter(Department.id == department_id).first()

    def get_by_name(
        self,
        organization_id: int,
        name: str,
    ):
        return (
            self.db.query(Department)
            .filter(
                Department.organization_id == organization_id,
                Department.name == name,
            )
            .first()
        )

    def list_by_organization(
        self,
        organization_id: int,
    ):
        return (
            self.db.query(Department)
            .filter(Department.organization_id == organization_id)
            .order_by(Department.id.asc())
            .all()
        )

    def update(
        self,
        department_id: int,
        name: str,
        description: str | None,
    ):
        department = self.get_by_id(department_id)

        if not department:
            return None

        department.name = name
        department.description = description

        self.db.commit()
        self.db.refresh(department)

        return department

    def update_is_active(
        self,
        department_id: int,
        is_active: bool,
    ):
        department = self.get_by_id(department_id)

        if not department:
            return None

        department.is_active = is_active

        self.db.commit()
        self.db.refresh(department)

        return department
