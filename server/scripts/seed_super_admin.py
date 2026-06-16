"""Seed a single SUPER_ADMIN user.

Usage:
    python scripts/seed_super_admin.py
"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.organization import Organization
from app.models.role import Role
from app.models.user import User
from app.services.rbac_service import RbacService

SUPER_ADMIN_EMAIL = "superadmin@example.com"
LEGACY_SUPER_ADMIN_EMAILS = ("superadmin@local",)
SUPER_ADMIN_PASSWORD = "ChangeMe123!"
SUPER_ADMIN_FIRST_NAME = "Super"
SUPER_ADMIN_LAST_NAME = "Admin"
SUPER_ADMIN_ORG_NAME = "Platform"
SUPER_ADMIN_ROLE_NAME = "SUPER_ADMIN"


def main() -> None:
    db = SessionLocal()

    try:
        RbacService(db).ensure_rbac_defaults()
        role = db.query(Role).filter(Role.name == SUPER_ADMIN_ROLE_NAME).first()

        super_admin_users = (
            db.query(User).filter(User.role_id == role.id).order_by(User.id.asc()).all()
        )

        existing_user = next(
            (user for user in super_admin_users if user.email == SUPER_ADMIN_EMAIL),
            None,
        )

        if existing_user:
            for user in super_admin_users:
                if user.id != existing_user.id:
                    db.delete(user)

            db.commit()
            print(f"SUPER_ADMIN already exists: {SUPER_ADMIN_EMAIL}")
            return

        if super_admin_users:
            primary_user = super_admin_users[0]
            primary_user.email = SUPER_ADMIN_EMAIL
            primary_user.password_hash = hash_password(SUPER_ADMIN_PASSWORD)
            primary_user.role_id = role.id
            primary_user.is_active = True

            for extra_user in super_admin_users[1:]:
                db.delete(extra_user)

            db.commit()
            print(f"SUPER_ADMIN migrated: {SUPER_ADMIN_EMAIL}")
            return

        organization = (
            db.query(Organization)
            .filter(Organization.name == SUPER_ADMIN_ORG_NAME)
            .first()
        )
        if not organization:
            organization = Organization(name=SUPER_ADMIN_ORG_NAME)
            db.add(organization)
            db.commit()
            db.refresh(organization)

        user = User(
            first_name=SUPER_ADMIN_FIRST_NAME,
            last_name=SUPER_ADMIN_LAST_NAME,
            email=SUPER_ADMIN_EMAIL,
            password_hash=hash_password(SUPER_ADMIN_PASSWORD),
            organization_id=organization.id,
            role_id=role.id,
            is_active=True,
        )

        db.add(user)
        db.commit()

        print(f"Created SUPER_ADMIN: {SUPER_ADMIN_EMAIL}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
