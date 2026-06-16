from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.user import User


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

    def get_by_id(self, department_id: int, organization_id: int | None = None):
        query = self.db.query(Department).filter(Department.id == department_id)
        if organization_id is not None:
            query = query.filter(Department.organization_id == organization_id)
        return query.first()

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

    def list_paginated(
        self,
        organization_id: int,
        limit: int,
        offset: int,
        department_ids: Optional[List[int]] = None,
    ) -> Tuple[list, int]:
        query = self.db.query(Department).filter(
            Department.organization_id == organization_id
        )
        if department_ids is not None:
            if not department_ids:
                return [], 0
            query = query.filter(Department.id.in_(department_ids))

        total = query.with_entities(func.count(Department.id)).scalar() or 0
        rows = (
            query.order_by(Department.id.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return rows, int(total)

    def list_department_ids_for_team(
        self,
        organization_id: int,
        team_id: int,
        include_department_id: int | None = None,
    ) -> List[int]:
        rows = (
            self.db.query(User.department_id)
            .filter(
                User.organization_id == organization_id,
                User.team_id == team_id,
                User.department_id.isnot(None),
            )
            .distinct()
            .all()
        )
        ids = {row[0] for row in rows}
        if include_department_id is not None:
            ids.add(include_department_id)
        return sorted(ids)

    def update(
        self,
        department_id: int,
        organization_id: int,
        name: str,
        description: str | None,
    ):
        department = self.get_by_id(department_id, organization_id)

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
        organization_id: int,
        is_active: bool,
    ):
        department = self.get_by_id(department_id, organization_id)

        if not department:
            return None

        department.is_active = is_active

        self.db.commit()
        self.db.refresh(department)

        return department
