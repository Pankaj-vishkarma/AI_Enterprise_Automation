from typing import List

from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.models.permission import Permission
from app.models.role import Role


class RoleRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_by_name(self, name: str):
        return self.db.query(Role).filter(Role.name == name).first()

    def get_by_id(self, role_id: int):
        return self.db.query(Role).filter(Role.id == role_id).first()

    def get_by_id_with_permissions(self, role_id: int):
        return (
            self.db.query(Role)
            .options(joinedload(Role.permissions))
            .filter(Role.id == role_id)
            .first()
        )

    def list_all(self):
        return self.db.query(Role).order_by(Role.id.asc()).all()

    def list_all_with_permissions(self):
        return (
            self.db.query(Role)
            .options(joinedload(Role.permissions))
            .order_by(Role.id.asc())
            .all()
        )

    def create(self, name: str):

        role = Role(name=name)

        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)

        return role

    def update(self, role_id: int, name: str):
        role = self.get_by_id(role_id)

        if not role:
            return None

        role.name = name
        self.db.commit()
        self.db.refresh(role)
        return role

    def delete(self, role_id: int):
        role = self.get_by_id(role_id)

        if not role:
            return None

        self.db.delete(role)
        self.db.commit()
        return role

    def set_permissions(self, role_id: int, permissions: List[Permission]):
        role = self.get_by_id(role_id)

        if not role:
            return None

        role.permissions = permissions

        self.db.commit()

        return self.get_by_id_with_permissions(role_id)
