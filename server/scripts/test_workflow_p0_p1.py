"""Workflow P0/P1 verification — run: python scripts/test_workflow_p0_p1.py"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import SessionLocal
from app.core.dependencies import (
    EMPLOYEE_ROLE,
    MANAGER_ROLE,
    ORG_ADMIN_ROLE,
    SUPER_ADMIN_ROLE,
    WORKFLOW_MANAGE_PERMISSION,
    user_has_permission,
)
from app.core.rbac_defaults import ROLE_DEFAULT_PERMISSIONS
from app.schemas.workflow import WORKFLOW_TEMPLATES
from app.services.workflow_service import WorkflowService


def _ok(label: str):
    print(f"  [OK] {label}")


def _fail(label: str, detail: str = ""):
    print(f"  [FAIL] {label}" + (f" — {detail}" if detail else ""))


def main():
    db = SessionLocal()
    passed = 0
    failed = 0

    print("Workflow P0/P1 verification")
    print("=" * 50)

    # P0: RBAC defaults
    employee_perms = set(ROLE_DEFAULT_PERMISSIONS[EMPLOYEE_ROLE])
    if "WORKFLOW_USE" in employee_perms and "WORKFLOW_APPROVE" in employee_perms:
        _ok("EMPLOYEE has WORKFLOW_USE and WORKFLOW_APPROVE")
        passed += 1
    else:
        _fail("EMPLOYEE workflow permissions", str(employee_perms))
        failed += 1

    if "WORKFLOW_MANAGE" not in employee_perms:
        _ok("EMPLOYEE lacks WORKFLOW_MANAGE")
        passed += 1
    else:
        _fail("EMPLOYEE should not have WORKFLOW_MANAGE")
        failed += 1

    manager_perms = set(ROLE_DEFAULT_PERMISSIONS[MANAGER_ROLE])
    if "WORKFLOW_MANAGE" not in manager_perms:
        _ok("MANAGER lacks WORKFLOW_MANAGE")
        passed += 1
    else:
        _fail("MANAGER should not have WORKFLOW_MANAGE")
        failed += 1

    # P1: Leave template
    leave = WORKFLOW_TEMPLATES.get("Leave Approval", {})
    steps = leave.get("steps", [])
    if len(steps) == 3 and steps[2]["name"] == "ORG Admin Final Approval":
        _ok("Leave template has Manager -> HR -> ORG Admin steps")
        passed += 1
    else:
        _fail("Leave template steps", str([s.get("name") for s in steps]))
        failed += 1

    # Service helpers (no DB required)
    svc = WorkflowService(db)

    class FakeRole:
        def __init__(self, name):
            self.name = name
            self.permissions = []

    class FakeUser:
        def __init__(self, uid, role_name, org_id=1, dept_id=None, team_id=None, permissions=None):
            self.id = uid
            self.role = FakeRole(role_name)
            self.role.permissions = [type("P", (), {"name": p})() for p in (permissions or [])]
            self.organization_id = org_id
            self.department_id = dept_id
            self.team_id = team_id

    manager = FakeUser(2, MANAGER_ROLE, permissions=["WORKFLOW_USE", "WORKFLOW_APPROVE"])
    if not user_has_permission(manager, WORKFLOW_MANAGE_PERMISSION):
        _ok("MANAGER fails WORKFLOW_MANAGE permission check")
        passed += 1
    else:
        _fail("MANAGER should fail WORKFLOW_MANAGE")
        failed += 1

    try:
        svc._assert_manage(manager)
        _fail("_assert_manage should block MANAGER without WORKFLOW_MANAGE")
        failed += 1
    except PermissionError:
        _ok("_assert_manage blocks MANAGER without WORKFLOW_MANAGE")
        passed += 1

    org_admin = FakeUser(3, ORG_ADMIN_ROLE, permissions=["WORKFLOW_USE", "WORKFLOW_MANAGE", "WORKFLOW_APPROVE"])
    try:
        svc._assert_manage(org_admin)
        _ok("_assert_manage allows ORG_ADMIN with WORKFLOW_MANAGE")
        passed += 1
    except PermissionError as exc:
        _fail("_assert_manage ORG_ADMIN", str(exc))
        failed += 1

    class FakeStep:
        def __init__(self, assignee_type, assignee_id, status="pending", acted_by_user_id=None):
            self.assignee_type = assignee_type
            self.assignee_id = assignee_id
            self.status = status
            self.acted_by_user_id = acted_by_user_id

    class FakeInstance:
        def __init__(self, starter_id, steps):
            self.started_by_user_id = starter_id
            self.steps = steps
            self.status = "in_progress"

    inst = FakeInstance(starter_id=10, steps=[FakeStep("user", 5, status="pending")])
    approver = FakeUser(5, EMPLOYEE_ROLE, permissions=["WORKFLOW_USE", "WORKFLOW_APPROVE"])
    if svc._can_view_instance(approver, inst):
        _ok("Assignee can view instance they must approve")
        passed += 1
    else:
        _fail("Assignee instance visibility")
        failed += 1

    outsider = FakeUser(99, EMPLOYEE_ROLE, permissions=["WORKFLOW_USE"])
    if not svc._can_view_instance(outsider, inst):
        _ok("Non-assignee non-owner cannot view instance")
        passed += 1
    else:
        _fail("Outsider should not view instance")
        failed += 1

    assigned_mgr = FakeUser(5, MANAGER_ROLE, permissions=["WORKFLOW_USE", "WORKFLOW_APPROVE"])
    inst_assigned = FakeInstance(
        starter_id=10,
        steps=[
            FakeStep("user", 5, status="pending"),
            FakeStep("user", 99, status="upcoming"),
        ],
    )
    if svc._can_view_instance(assigned_mgr, inst_assigned):
        _ok("Assigned manager can view via step assignee")
        passed += 1
    else:
        _fail("Assigned manager all_accessible visibility")
        failed += 1

    future_mgr = FakeUser(99, MANAGER_ROLE, permissions=["WORKFLOW_USE", "WORKFLOW_APPROVE"])
    if svc._can_view_instance(future_mgr, inst_assigned):
        _ok("Upcoming-step assignee can view instance in all_accessible")
        passed += 1
    else:
        _fail("Upcoming-step assignee visibility")
        failed += 1

    unrelated_mgr = FakeUser(88, MANAGER_ROLE, permissions=["WORKFLOW_USE", "WORKFLOW_APPROVE"])
    inst_unrelated = FakeInstance(
        starter_id=10,
        steps=[FakeStep("user", 5, status="pending")],
    )
    if not svc._can_view_instance(unrelated_mgr, inst_unrelated):
        _ok("Unrelated manager cannot view employee request")
        passed += 1
    else:
        _fail("Unrelated manager should not view instance")
        failed += 1

    if not svc._has_pending_step_for_user(future_mgr, inst_assigned):
        _ok("Upcoming-step assignee not in pending_approval until step is pending")
        passed += 1
    else:
        _fail("pending_approval should remain pending-step only")
        failed += 1

    manager_assignee = FakeUser(5, MANAGER_ROLE, permissions=["WORKFLOW_USE", "WORKFLOW_APPROVE"])
    if svc._can_act(manager_assignee, FakeStep("user", 5)) and not svc._can_act(
        manager_assignee, FakeStep("user", 99)
    ):
        _ok("MANAGER can act only when assignee matches (no global bypass)")
        passed += 1
    else:
        _fail("MANAGER _can_act assignee scoping")
        failed += 1

    if not svc._can_act(org_admin, FakeStep("user", 99)):
        _ok("ORG_ADMIN cannot act unless assignee matches")
        passed += 1
    else:
        _fail("ORG_ADMIN should not bypass assignee rules")
        failed += 1

    super_admin = FakeUser(1, SUPER_ADMIN_ROLE, permissions=["WORKFLOW_USE", "WORKFLOW_MANAGE", "WORKFLOW_APPROVE"])
    if not svc._can_act(super_admin, FakeStep("user", 99)):
        _ok("SUPER_ADMIN cannot act unless assignee matches")
        passed += 1
    else:
        _fail("SUPER_ADMIN should not bypass assignee rules")
        failed += 1

    if svc._can_act(org_admin, FakeStep("user", org_admin.id)):
        _ok("ORG_ADMIN can act when assigned as user approver")
        passed += 1
    else:
        _fail("ORG_ADMIN assignee match")
        failed += 1

    db.close()
    print("=" * 50)
    print(f"Results: {passed} passed, {failed} failed")
    if failed:
        sys.exit(1)
    print("All checks passed.")


if __name__ == "__main__":
    main()
