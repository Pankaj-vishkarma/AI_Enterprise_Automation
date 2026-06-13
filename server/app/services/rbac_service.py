from sqlalchemy.orm import Session

from app.core.rbac_defaults import ALL_PERMISSIONS, BUILTIN_ROLES, ROLE_DEFAULT_PERMISSIONS
from app.models.permission import Permission
from app.models.role import Role
from app.repositories.permission_repository import PermissionRepository
from app.repositories.role_repository import RoleRepository


class RbacService:

    def __init__(self, db: Session):
        self.db = db
        self.role_repo = RoleRepository(db)
        self.permission_repo = PermissionRepository(db)

    def ensure_rbac_defaults(self) -> None:
        """Create built-in roles/permissions and assign default grants (idempotent)."""
        permission_map: dict[str, Permission] = {}

        for permission_name in ALL_PERMISSIONS:
            permission = self.permission_repo.get_by_name(permission_name)
            if not permission:
                permission = Permission(name=permission_name)
                self.db.add(permission)
                self.db.commit()
                self.db.refresh(permission)
            permission_map[permission_name] = permission

        for role_name in BUILTIN_ROLES:
            role = self.role_repo.get_by_name(role_name)
            if not role:
                role = Role(name=role_name)
                self.db.add(role)
                self.db.commit()
                self.db.refresh(role)

            desired = [
                permission_map[name]
                for name in ROLE_DEFAULT_PERMISSIONS[role_name]
                if name in permission_map
            ]
            existing_ids = {permission.id for permission in role.permissions}
            changed = False
            for permission in desired:
                if permission.id not in existing_ids:
                    role.permissions.append(permission)
                    changed = True
            if changed:
                self.db.commit()
