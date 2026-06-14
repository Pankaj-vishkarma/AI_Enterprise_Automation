from typing import List, Optional, Set, Tuple

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Query, Session

from app.models.user import User


class UserRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str):
        return self.db.query(User).filter(User.email == email).first()

    def create(
        self,
        first_name: str,
        last_name: Optional[str],
        email: str,
        password_hash: str,
        organization_id: int,
        role_id: int,
        department_id: Optional[int] = None,
        team_id: Optional[int] = None,
    ):

        user = User(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password_hash=password_hash,
            organization_id=organization_id,
            role_id=role_id,
            department_id=department_id,
            team_id=team_id,
        )

        self.db.add(user)
        self.db.commit()
        return user

    def get_by_id(self, user_id: int):
        return self.db.query(User).filter(User.id == user_id).first()

    def _scoped_query(
        self,
        *,
        organization_id: Optional[int] = None,
        user_ids: Optional[Set[int]] = None,
        team_id: Optional[int] = None,
        employee_role_id: Optional[int] = None,
        include_user_id: Optional[int] = None,
    ) -> Query:
        query = self.db.query(User)

        if organization_id is not None:
            query = query.filter(User.organization_id == organization_id)

        if user_ids is not None:
            query = query.filter(User.id.in_(user_ids))

        if team_id is not None and employee_role_id is not None and include_user_id is not None:
            query = query.filter(
                or_(
                    User.id == include_user_id,
                    and_(
                        User.team_id == team_id,
                        User.role_id == employee_role_id,
                    ),
                )
            )
        elif include_user_id is not None and team_id is None and employee_role_id is None:
            query = query.filter(User.id == include_user_id)

        return query

    def list_paginated(
        self,
        *,
        limit: int,
        offset: int,
        organization_id: Optional[int] = None,
        user_ids: Optional[Set[int]] = None,
        team_id: Optional[int] = None,
        employee_role_id: Optional[int] = None,
        include_user_id: Optional[int] = None,
    ) -> Tuple[list, int]:
        base = self._scoped_query(
            organization_id=organization_id,
            user_ids=user_ids,
            team_id=team_id,
            employee_role_id=employee_role_id,
            include_user_id=include_user_id,
        )
        total = base.with_entities(func.count(User.id)).scalar() or 0
        rows = (
            base.order_by(User.id.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return rows, int(total)

    def list_all(self):
        return self.db.query(User).order_by(User.id.asc()).all()

    def list_by_organization(self, organization_id: int):
        return (
            self.db.query(User)
            .filter(User.organization_id == organization_id)
            .order_by(User.id.asc())
            .all()
        )

    def list_team_member_ids(self, organization_id: int, team_id: int) -> List[int]:
        rows = (
            self.db.query(User.id)
            .filter(
                User.organization_id == organization_id,
                User.team_id == team_id,
            )
            .all()
        )
        return [row[0] for row in rows]

    def list_by_organization_and_roles(
        self,
        organization_id: int,
        role_ids: List[int],
    ):
        return (
            self.db.query(User)
            .filter(
                User.organization_id == organization_id,
                User.role_id.in_(role_ids),
            )
            .order_by(User.id.asc())
            .all()
        )

    def update_is_active(
        self,
        user_id: int,
        is_active: bool,
    ):
        user = self.get_by_id(user_id)

        if not user:
            return None

        user.is_active = is_active

        self.db.commit()
        self.db.refresh(user)

        return user

    def get_by_email_excluding_user(
        self,
        email: str,
        user_id: int,
    ):
        return (
            self.db.query(User)
            .filter(
                User.email == email,
                User.id != user_id,
            )
            .first()
        )

    def update_user(
        self,
        user_id: int,
        first_name: str,
        last_name: Optional[str],
        email: str,
    ):
        user = self.get_by_id(user_id)

        if not user:
            return None

        user.first_name = first_name
        user.last_name = last_name
        user.email = email

        self.db.commit()
        self.db.refresh(user)

        return user

    def update_department_id(
        self,
        user_id: int,
        department_id: Optional[int],
        user: User | None = None,
    ):
        if user is None:
            user = self.get_by_id(user_id)

        if not user:
            return None

        user.department_id = department_id

        self.db.commit()
        return user

    def update_team_id(
        self,
        user_id: int,
        team_id: Optional[int],
        user: User | None = None,
    ):
        if user is None:
            user = self.get_by_id(user_id)

        if not user:
            return None

        user.team_id = team_id

        self.db.commit()
        return user

    def update_role_id(
        self,
        user_id: int,
        role_id: int,
    ):
        user = self.get_by_id(user_id)

        if not user:
            return None

        user.role_id = role_id

        self.db.commit()
        self.db.refresh(user)

        return user
