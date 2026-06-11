from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.dependencies import SUPER_ADMIN_ROLE
from app.models.user import User
from app.repositories.permission_repository import PermissionRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository


class RoleService:

    def __init__(self, db: Session):
        self.db = db
        self.role_repo = RoleRepository(db)
        self.permission_repo = PermissionRepository(db)
        self.user_repo = UserRepository(db)

    def list_roles(self):
        return self.role_repo.list_all_with_permissions()

    def get_role_by_id(self, role_id: int):
        return self.role_repo.get_by_id_with_permissions(role_id)

    def create_role(self, current_user, name: str, permission_ids: List[int]):
        if current_user.role.name != SUPER_ADMIN_ROLE:
            raise PermissionError("Only SUPER_ADMIN can create roles")
        if self.role_repo.get_by_name(name):
            raise ValueError("Role already exists")
        role = self.role_repo.create(name)
        permissions = self.permission_repo.get_by_ids(list(dict.fromkeys(permission_ids)))
        if len(permissions) != len(set(permission_ids)):
            raise ValueError("One or more permissions not found")
        return self.role_repo.set_permissions(role.id, permissions)

    def update_role(self, current_user, role_id: int, name: Optional[str], permission_ids: Optional[List[int]]):
        if current_user.role.name != SUPER_ADMIN_ROLE:
            raise PermissionError("Only SUPER_ADMIN can update roles")
        role = self.role_repo.get_by_id(role_id)
        if not role:
            return None
        if role.name == SUPER_ADMIN_ROLE and name and name != SUPER_ADMIN_ROLE:
            raise PermissionError("SUPER_ADMIN role cannot be renamed")
        if name:
            existing = self.role_repo.get_by_name(name)
            if existing and existing.id != role_id:
                raise ValueError("Role already exists")
            self.role_repo.update(role_id, name)
        if permission_ids is not None:
            unique_ids = list(dict.fromkeys(permission_ids))
            permissions = self.permission_repo.get_by_ids(unique_ids)
            if len(permissions) != len(unique_ids):
                raise ValueError("One or more permissions not found")
            return self.role_repo.set_permissions(role_id, permissions)
        return self.role_repo.get_by_id_with_permissions(role_id)

    def delete_role(self, current_user, role_id: int):
        if current_user.role.name != SUPER_ADMIN_ROLE:
            raise PermissionError("Only SUPER_ADMIN can delete roles")
        role = self.role_repo.get_by_id(role_id)
        if not role:
            return None
        if role.name == SUPER_ADMIN_ROLE:
            raise PermissionError("SUPER_ADMIN role cannot be deleted")
        assigned_count = self.db.query(User).filter(User.role_id == role_id).count()
        if assigned_count:
            raise ValueError("Role is assigned to users")
        return self.role_repo.delete(role_id)

    def change_user_role(
        self,
        current_user,
        target_user_id: int,
        role_id: int,
    ):
        target_user = self.user_repo.get_by_id(target_user_id)

        if not target_user:
            return None

        role = self.role_repo.get_by_id(role_id)

        if not role:
            raise ValueError("Role not found")

        current_role = current_user.role.name if current_user.role else None

        if (
            current_role != SUPER_ADMIN_ROLE
            and target_user.organization_id != current_user.organization_id
        ):
            raise PermissionError("Cross-organization role management is not allowed")

        if role.name == SUPER_ADMIN_ROLE and current_role != SUPER_ADMIN_ROLE:
            raise PermissionError("Only SUPER_ADMIN can assign the SUPER_ADMIN role")

        return self.user_repo.update_role_id(
            target_user_id,
            role_id,
        )
