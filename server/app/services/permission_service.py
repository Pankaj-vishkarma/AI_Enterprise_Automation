from typing import List, Optional

from sqlalchemy.orm import Session

from app.repositories.permission_repository import PermissionRepository
from app.repositories.role_repository import RoleRepository


class PermissionService:

    def __init__(self, db: Session):
        self.db = db
        self.permission_repo = PermissionRepository(db)
        self.role_repo = RoleRepository(db)

    def create_permission(
        self,
        name: str,
        description: Optional[str],
    ):
        existing = self.permission_repo.get_by_name(name)

        if existing:
            raise ValueError("Permission already exists")

        return self.permission_repo.create(
            name=name,
            description=description,
        )

    def list_permissions(self):
        return self.permission_repo.list_all()

    def assign_permissions_to_role(
        self,
        role_id: int,
        permission_ids: List[int],
    ):
        role = self.role_repo.get_by_id(role_id)

        if not role:
            return None

        unique_permission_ids = list(dict.fromkeys(permission_ids))
        permissions = self.permission_repo.get_by_ids(unique_permission_ids)

        if len(permissions) != len(unique_permission_ids):
            raise ValueError("One or more permissions not found")

        return self.role_repo.set_permissions(
            role_id,
            permissions,
        )
