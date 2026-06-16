"""Regression tests for workflow builder save (user + department assignees, edit, start)."""

from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy.orm import joinedload

from app.core.database import SessionLocal
from app.core.dependencies import EMPLOYEE_ROLE, MANAGER_ROLE, ORG_ADMIN_ROLE
from app.models.department import Department
from app.models.role import Role
from app.models.user import User
from app.models.workflow import Workflow
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.workflow import UNASSIGNED_APPROVAL_MESSAGE
from app.services.rbac_service import RbacService
from app.services.workflow_service import WorkflowService


def _ok(msg):
    print(f"  [OK] {msg}")


def _fail(msg, detail=""):
    print(f"  [FAIL] {msg}" + (f" — {detail}" if detail else ""))


def _load_user(db, user_id):
    return (
        db.query(User)
        .options(joinedload(User.role).joinedload(Role.permissions))
        .filter(User.id == user_id)
        .first()
    )


def _pick_user(db, org_id, role_name):
    role = RoleRepository(db).get_by_name(role_name)
    if not role:
        return None
    user = next(
        (u for u in UserRepository(db).list_by_organization(org_id) if u.role_id == role.id),
        None,
    )
    return _load_user(db, user.id) if user else None


def _format_user_label(first_name, last_name, email=None, user_id=None):
    """Mirror frontend formatUserLabel for regression on null last_name."""
    parts = [first_name, last_name]
    name = " ".join(p for p in parts if p is not None and str(p).strip() != "").strip()
    if name:
        return name
    if email:
        return email
    return f"User #{user_id}"


def _parse_assignee_id_safe(raw):
    if raw == "" or raw is None:
        return None
    try:
        parsed = int(raw) if isinstance(raw, int) else int(float(str(raw)))
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def main():
    db = SessionLocal()
    passed = failed = 0
    workflow_ids = []
    org_id = None
    created_dept = False
    hr_dept = None

    print("Workflow builder save regression")
    print("=" * 50)

    try:
        RbacService(db).ensure_rbac_defaults()
        svc = WorkflowService(db)

        label = _format_user_label("manager", None, email="mgr@test.com", user_id=7)
        if label == "manager" and "null" not in label:
            _ok(f"formatUserLabel avoids literal null: {label!r}")
            passed += 1
        else:
            _fail("formatUserLabel should not render 'null'", label)
            failed += 1

        for raw, expected in [("", None), (None, None), ("null", None), ("19", 19), (19, 19)]:
            got = _parse_assignee_id_safe(raw)
            if got == expected:
                _ok(f"parseAssigneeId({raw!r}) -> {got}")
                passed += 1
            else:
                _fail(f"parseAssigneeId({raw!r})", f"expected {expected}, got {got}")
                failed += 1

        org_admin = (
            db.query(User).join(User.role).filter(User.role.has(name=ORG_ADMIN_ROLE)).first()
        )
        if not org_admin:
            print("SKIP: no ORG_ADMIN user")
            return 0

        org_admin = _load_user(db, org_admin.id)
        org_id = org_admin.organization_id
        employee = _pick_user(db, org_id, EMPLOYEE_ROLE)
        manager = _pick_user(db, org_id, MANAGER_ROLE)
        if not employee or not manager:
            print("SKIP: need employee and manager")
            return 0

        stamp = int(time.time())

        hr_dept = db.query(Department).filter(Department.organization_id == org_id).first()
        if not hr_dept:
            hr_dept = Department(
                organization_id=org_id,
                name=f"HR Test {stamp}",
                description="workflow save regression",
                is_active=True,
            )
            db.add(hr_dept)
            db.commit()
            db.refresh(hr_dept)
            created_dept = True

        user_payload = {
            "name": f"User Assignee {stamp}",
            "category": "Custom",
            "status": "draft",
            "steps": [
                {
                    "name": "Manager Sign-off",
                    "step_type": "approval",
                    "assignee_type": "user",
                    "assignee_id": manager.id,
                    "position": 0,
                }
            ],
        }
        wf_user = svc.create_workflow(org_admin, user_payload)
        workflow_ids.append(wf_user["id"])
        step = wf_user["steps"][0]
        if step["assignee_type"] == "user" and step["assignee_id"] == manager.id:
            _ok("Save workflow with User assignee")
            passed += 1
        else:
            _fail("User assignee step", f"{step}")
            failed += 1

        dept_payload = {
            "name": f"Dept Assignee {stamp}",
            "category": "Custom",
            "status": "draft",
            "steps": [
                {
                    "name": "HR Leave Record",
                    "step_type": "approval",
                    "assignee_type": "department",
                    "assignee_id": hr_dept.id,
                    "position": 0,
                }
            ],
        }
        wf_dept = svc.create_workflow(org_admin, dept_payload)
        workflow_ids.append(wf_dept["id"])
        step = wf_dept["steps"][0]
        if step["assignee_type"] == "department" and step["assignee_id"] == hr_dept.id:
            _ok("Save workflow with Department assignee")
            passed += 1
        else:
            _fail("Department assignee step", f"{step}")
            failed += 1

        updated = svc.update_workflow(
            org_admin,
            wf_user["id"],
            {
                "name": f"User Assignee Edited {stamp}",
                "description": "edited",
                "category": "Custom",
                "status": "active",
                "steps": [
                    {
                        "name": "Manager Sign-off Updated",
                        "step_type": "approval",
                        "assignee_type": "user",
                        "assignee_id": manager.id,
                        "position": 0,
                    },
                    {
                        "name": "HR Leave Record",
                        "step_type": "approval",
                        "assignee_type": "department",
                        "assignee_id": hr_dept.id,
                        "position": 1,
                    },
                ],
            },
        )
        if updated["name"].startswith("User Assignee Edited") and len(updated["steps"]) == 2:
            _ok("Edit existing workflow (update)")
            passed += 1
        else:
            _fail("Edit workflow", updated.get("name"))
            failed += 1

        inst = svc.start_instance(employee, updated["id"], f"Leave after save {stamp}")
        if inst.get("status") == "in_progress" and inst.get("workflow_id") == updated["id"]:
            _ok("Start workflow after save")
            passed += 1
        else:
            _fail("Start after save", inst.get("status"))
            failed += 1

        try:
            svc.update_workflow(
                org_admin,
                updated["id"],
                {
                    "name": f"User Assignee With Instance {stamp}",
                    "category": "Custom",
                    "status": "active",
                    "steps": [
                        {
                            "name": "Manager Sign-off",
                            "step_type": "approval",
                            "assignee_type": "user",
                            "assignee_id": manager.id,
                            "position": 0,
                        },
                        {
                            "name": "HR Leave Record",
                            "step_type": "approval",
                            "assignee_type": "department",
                            "assignee_id": hr_dept.id,
                            "position": 1,
                        },
                    ],
                },
            )
            _ok("Update workflow with active instance (no FK violation)")
            passed += 1
        except Exception as exc:
            _fail("Update workflow with active instance", str(exc))
            failed += 1

        try:
            svc.update_workflow(
                org_admin,
                wf_dept["id"],
                {
                    "name": wf_dept["name"],
                    "category": "Custom",
                    "status": "draft",
                    "steps": [
                        {
                            "name": "Unassigned",
                            "step_type": "approval",
                            "assignee_type": "user",
                            "assignee_id": None,
                            "position": 0,
                        }
                    ],
                },
            )
            _fail("Update should reject null assignee_id on approval step")
            failed += 1
        except ValueError as exc:
            if str(exc) == UNASSIGNED_APPROVAL_MESSAGE:
                _ok("Update rejects invalid assignee_id (null)")
                passed += 1
            else:
                _fail("Update validation message", str(exc))
                failed += 1

    except Exception as exc:
        _fail("Test aborted", str(exc))
        failed += 1
    finally:
        for wid in workflow_ids:
            row = db.query(Workflow).filter(Workflow.id == wid).first()
            if row:
                row.is_deleted = True
                row.status = "disabled"
        if workflow_ids:
            db.commit()
        if created_dept and hr_dept:
            db.query(Department).filter(Department.id == hr_dept.id).delete()
            db.commit()
        db.close()

    print("=" * 50)
    print(f"Results: {passed} passed, {failed} failed")
    if failed:
        sys.exit(1)
    print("All checks passed.")


if __name__ == "__main__":
    main()
