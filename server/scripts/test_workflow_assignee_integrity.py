"""Assignee integrity + requester visibility verification."""

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


def main():
    db = SessionLocal()
    passed = failed = 0
    workflow_id = None
    org_id = None
    restored_dept = None

    print("Workflow assignee integrity")
    print("=" * 50)

    try:
        RbacService(db).ensure_rbac_defaults()
        svc = WorkflowService(db)

        try:
            svc._assert_approval_assignees(
                [{"name": "Mgr", "step_type": "approval", "assignee_type": "user", "assignee_id": None}]
            )
            _fail("Should reject unassigned approval step")
            failed += 1
        except ValueError as exc:
            if str(exc) == UNASSIGNED_APPROVAL_MESSAGE:
                _ok("Validation message matches spec")
                passed += 1
            else:
                _fail("Wrong validation message", str(exc))
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

        hr_dept = db.query(Department).filter(Department.organization_id == org_id).first()
        if not hr_dept:
            print("SKIP: need department")
            return 0

        stamp = int(time.time())
        payload = {
            "name": f"Integrity Leave {stamp}",
            "description": "test",
            "category": "Leave Approval",
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
                {
                    "name": "ORG Admin Final Approval",
                    "step_type": "approval",
                    "assignee_type": "user",
                    "assignee_id": org_admin.id,
                    "position": 2,
                },
            ],
        }
        wf = svc.create_workflow(org_admin, payload)
        workflow_id = wf["id"]
        _ok("Create workflow with assigned approval steps")
        passed += 1

        inst = svc.start_instance(employee, workflow_id, f"Leave {stamp}")
        if inst.get("started_by_name"):
            _ok(f"started_by_name present: {inst['started_by_name']}")
            passed += 1
        else:
            _fail("started_by_name missing from instance response")
            failed += 1

        try:
            svc.create_workflow(
                org_admin,
                {
                    "name": f"Bad {stamp}",
                    "category": "Custom",
                    "status": "draft",
                    "steps": [
                        {
                            "name": "Bad",
                            "step_type": "approval",
                            "assignee_type": "user",
                            "assignee_id": None,
                            "position": 0,
                        }
                    ],
                },
            )
            _fail("Create should reject unassigned approval steps")
            failed += 1
        except ValueError:
            _ok("Create rejects unassigned approval steps")
            passed += 1

        try:
            svc.start_instance(employee, workflow_id, "should not duplicate")
            _ok("Start valid active workflow succeeds")
            passed += 1
        except ValueError as exc:
            _fail("Start valid workflow", str(exc))
            failed += 1

        step1 = next(s for s in inst["steps"] if s["status"] == "pending")
        inst = svc.approve_step(manager, inst["id"], step1["id"], "ok")

        hr_users = [
            u for u in UserRepository(db).list_by_organization(org_id) if u.department_id == hr_dept.id
        ]
        if hr_users:
            hr_actor = _load_user(db, hr_users[0].id)
        else:
            restored_dept = (org_admin.id, org_admin.department_id)
            org_admin.department_id = hr_dept.id
            db.commit()
            hr_actor = _load_user(db, org_admin.id)

        hr_step = next(s for s in inst["steps"] if s["status"] == "pending")
        inst = svc.approve_step(hr_actor, inst["id"], hr_step["id"], "ok")
        org_step = next(s for s in inst["steps"] if s["status"] == "pending")
        inst = svc.approve_step(org_admin, inst["id"], org_step["id"], "ok")
        if inst["status"] == "completed":
            _ok("E2E Employee -> Manager -> HR -> ORG Admin completed")
            passed += 1
        else:
            _fail("E2E completion", inst["status"])
            failed += 1

    except Exception as exc:
        _fail("Test aborted", str(exc))
        failed += 1
    finally:
        if restored_dept:
            uid, dept_id = restored_dept
            row = db.query(User).filter(User.id == uid).first()
            if row:
                row.department_id = dept_id
                db.commit()
        if workflow_id and org_id:
            row = db.query(Workflow).filter(Workflow.id == workflow_id).first()
            if row:
                row.is_deleted = True
                row.status = "disabled"
                db.commit()
        db.close()

    print("=" * 50)
    print(f"Results: {passed} passed, {failed} failed")
    if failed:
        sys.exit(1)
    print("All checks passed.")


if __name__ == "__main__":
    main()
