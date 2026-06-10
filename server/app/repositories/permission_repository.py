from sqlalchemy.orm import Session

from app.models.permission import Permission


class PermissionRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        name: str,
        description: str | None,
    ):
        permission = Permission(name=name, description=description)

        self.db.add(permission)
        self.db.commit()
        self.db.refresh(permission)

        return permission

    def get_by_id(self, permission_id: int):
        return self.db.query(Permission).filter(Permission.id == permission_id).first()

    def get_by_name(self, name: str):
        return self.db.query(Permission).filter(Permission.name == name).first()

    def list_all(self):
        return self.db.query(Permission).order_by(Permission.id.asc()).all()

    def get_by_ids(self, permission_ids: list[int]):
        if not permission_ids:
            return []

        return (
            self.db.query(Permission)
            .filter(Permission.id.in_(permission_ids))
            .order_by(Permission.id.asc())
            .all()
        )
