from sqlalchemy.orm import Session

from app.core.dependencies import SUPER_ADMIN_ROLE
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository


class RoleService:

    def __init__(self, db: Session):
        self.db = db
        self.role_repo = RoleRepository(db)
        self.user_repo = UserRepository(db)

    def list_roles(self):
        return self.role_repo.list_all_with_permissions()

    def get_role_by_id(self, role_id: int):
        return self.role_repo.get_by_id_with_permissions(role_id)

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
