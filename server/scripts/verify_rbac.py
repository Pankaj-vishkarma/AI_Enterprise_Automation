"""Verify RBAC defaults and role permission assignments.

Usage:
    python scripts/verify_rbac.py
"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import SessionLocal
from app.core.rbac_defaults import ALL_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS
from app.models.permission import Permission
from app.services.rbac_service import RbacService
from app.repositories.role_repository import RoleRepository


def main() -> None:
    db = SessionLocal()
    try:
        RbacService(db).ensure_rbac_defaults()
        role_repo = RoleRepository(db)

        print("RBAC verification")
        print("=" * 40)

        for role_name, expected in ROLE_DEFAULT_PERMISSIONS.items():
            role = role_repo.get_by_name(role_name)
            if not role:
                print(f"[FAIL] Missing role: {role_name}")
                continue
            role = role_repo.get_by_id_with_permissions(role.id)
            assigned = {permission.name for permission in role.permissions}
            missing = set(expected) - assigned
            status = "OK" if not missing else "FAIL"
            print(f"[{status}] {role_name}: {len(assigned)} permissions")
            if missing:
                print(f"       missing: {sorted(missing)}")

        all_permissions = {permission.name for permission in db.query(Permission).all()}
        undefined = set(ALL_PERMISSIONS) - all_permissions
        if undefined:
            print(f"[FAIL] Permissions not in DB: {sorted(undefined)}")
        else:
            print(f"[OK] All {len(ALL_PERMISSIONS)} permissions exist in DB")

        print("=" * 40)
        print("Done.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
