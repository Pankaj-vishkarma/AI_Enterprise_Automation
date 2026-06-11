from typing import List, Optional

from sqlalchemy.orm import Session

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
    ):

        user = User(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password_hash=password_hash,
            organization_id=organization_id,
            role_id=role_id,
        )

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return user

    def get_by_id(self, user_id: int):
        return self.db.query(User).filter(User.id == user_id).first()

    def list_all(self):
        return self.db.query(User).order_by(User.id.asc()).all()

    def list_by_organization(self, organization_id: int):
        return (
            self.db.query(User)
            .filter(User.organization_id == organization_id)
            .order_by(User.id.asc())
            .all()
        )

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
    ):
        user = self.get_by_id(user_id)

        if not user:
            return None

        user.department_id = department_id

        self.db.commit()
        self.db.refresh(user)

        return user

    def update_team_id(
        self,
        user_id: int,
        team_id: Optional[int],
    ):
        user = self.get_by_id(user_id)

        if not user:
            return None

        user.team_id = team_id

        self.db.commit()
        self.db.refresh(user)

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
