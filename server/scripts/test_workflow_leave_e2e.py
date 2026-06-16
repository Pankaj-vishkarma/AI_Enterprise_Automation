"""Leave workflow E2E — Employee -> Manager -> HR -> ORG_ADMIN -> Completed.

Run: python scripts/test_workflow_leave_e2e.py
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy.orm import joinedload

from app.core.database import SessionLocal
from app.core.dependencies import EMPLOYEE_ROLE, MANAGER_ROLE, ORG_ADMIN_ROLE
from app.models.role import Role
from app.models.department import Department
from app.models.user import User
from app.models.workflow import Notification, Workflow, WorkflowAuditLog
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.workflow import WORKFLOW_TEMPLATES
from app.services.rbac_service import RbacService
from app.services.workflow_service import WorkflowService


def _load_user(db, user_id: int) -> User | None:
    return (
        db.query(User)
        .options(joinedload(User.role).joinedload(Role.permissions))
        .filter(User.id == user_id)
        .first()
    )


def _pick_users(db, org_id: int):
    role_repo = RoleRepository(db)
    roles = {
        EMPLOYEE_ROLE: role_repo.get_by_name(EMPLOYEE_ROLE),
        MANAGER_ROLE: role_repo.get_by_name(MANAGER_ROLE),
        ORG_ADMIN_ROLE: role_repo.get_by_name(ORG_ADMIN_ROLE),
    }
    users = UserRepository(db).list_by_organization(org_id)
    by_role = {name: next((u for u in users if u.role_id == role.id), None) for name, role in roles.items()}
    return by_role


def _ok(msg: str):
    print(f"  [OK] {msg}")


def _fail(msg: str, detail: str = ""):
    print(f"  [FAIL] {msg}" + (f" — {detail}" if detail else ""))
    return False


def main():
    db = SessionLocal()
    passed = 0
    failed = 0
    workflow_id = None
    instance_id = None
    org_id = None
    restored_dept = None

    print("Leave workflow E2E")
    print("=" * 50)

    try:
        RbacService(db).ensure_rbac_defaults()

        org_admin = (
            db.query(User)
            .join(User.role)
            .filter(User.role.has(name=ORG_ADMIN_ROLE))
            .order_by(User.id.asc())
            .first()
        )
        if not org_admin:
            print("SKIP: No ORG_ADMIN user in database. Seed users first.")
            return 0

        org_id = org_admin.organization_id
        picks = _pick_users(db, org_id)
        employee = picks.get(EMPLOYEE_ROLE)
        manager = picks.get(MANAGER_ROLE)
        org_admin = _load_user(db, org_admin.id)

        if not employee or not manager:
            print("SKIP: Need EMPLOYEE and MANAGER users in the same org as ORG_ADMIN.")
            return 0

        employee = _load_user(db, employee.id)
        manager = _load_user(db, manager.id)

        hr_dept = (
            db.query(Department)
            .filter(Department.organization_id == org_id)
            .order_by(Department.id.asc())
            .first()
        )
        if not hr_dept:
            _fail("HR department required")
            failed += 1
            return 1

        svc = WorkflowService(db)
        stamp = int(time.time())
        leave_tpl = WORKFLOW_TEMPLATES["Leave Approval"]
        payload = {
            "name": f"E2E Leave P0P1 {stamp}",
            "description": leave_tpl["description"],
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
        _ok(f"ORG_ADMIN created active leave workflow (id={workflow_id})")
        passed += 1

        inst = svc.start_instance(employee, workflow_id, f"Leave request E2E {stamp}")
        instance_id = inst["id"]
        if inst["status"] != "in_progress":
            _fail("Instance should be in_progress after start", inst["status"])
            failed += 1
        else:
            _ok("EMPLOYEE started workflow — status in_progress")
            passed += 1

        pending_mgr = svc.list_instances(manager, scope="pending_approval")
        if not any(i["id"] == instance_id for i in pending_mgr):
            _fail("MANAGER pending_approval list missing instance")
            failed += 1
        else:
            _ok("MANAGER sees instance in pending_approval list")
            passed += 1

        mgr_view = svc.get_instance(manager, instance_id)
        if not mgr_view:
            _fail("MANAGER cannot open assigned instance")
            failed += 1
        else:
            _ok("MANAGER can view assigned instance")
            passed += 1

        pending_step = next(s for s in inst["steps"] if s["status"] == "pending")
        _ok(
            "Assignee audit: "
            f"instance={instance_id}, step={pending_step['name']}, "
            f"assignee_type={pending_step['assignee_type']}, "
            f"assignee_id={pending_step['assignee_id']}, "
            f"resolved_manager_id={manager.id}"
        )
        passed += 1

        mgr_all = svc.list_instances(manager, scope="all_accessible")
        if any(i["id"] == instance_id for i in mgr_all):
            _ok("MANAGER sees instance in all_accessible")
            passed += 1
        else:
            _fail("MANAGER all_accessible list missing assigned instance")
            failed += 1

        org_all = svc.list_instances(org_admin, scope="all_accessible")
        if any(i["id"] == instance_id for i in org_all):
            _ok("ORG_ADMIN sees instance in all_accessible")
            passed += 1
        else:
            _fail("ORG_ADMIN all_accessible list missing instance")
            failed += 1

        other_employees = [
            u for u in UserRepository(db).list_by_organization(org_id)
            if u.role_id == employee.role_id and u.id != employee.id
        ]
        if other_employees:
            stranger = _load_user(db, other_employees[0].id)
            stranger_all = svc.list_instances(stranger, scope="all_accessible")
            if not any(i["id"] == instance_id for i in stranger_all):
                _ok("Unrelated employee excluded from all_accessible")
                passed += 1
            else:
                _fail("Unrelated employee should not see instance in all_accessible")
                failed += 1

        other_managers = [
            u for u in UserRepository(db).list_by_organization(org_id)
            if u.role_id == manager.role_id and u.id != manager.id
        ]
        if other_managers:
            other_mgr = _load_user(db, other_managers[0].id)
            other_mgr_all = svc.list_instances(other_mgr, scope="all_accessible")
            if not any(i["id"] == instance_id for i in other_mgr_all):
                _ok("Unrelated manager excluded from all_accessible")
                passed += 1
            else:
                _fail("Unrelated manager should not see instance in all_accessible")
                failed += 1

        employee_mine = svc.list_instances(employee, scope="mine")
        manager_mine = svc.list_instances(manager, scope="mine")
        org_admin_mine = svc.list_instances(org_admin, scope="mine")
        if any(i["id"] == instance_id for i in employee_mine):
            _ok("EMPLOYEE My Requests contains own started instance")
            passed += 1
        else:
            _fail("EMPLOYEE My Requests missing own instance")
            failed += 1
        if not any(i["id"] == instance_id for i in manager_mine):
            _ok("MANAGER My Requests excludes employee-started instance")
            passed += 1
        else:
            _fail("MANAGER My Requests should only contain manager-started instances")
            failed += 1
        if not any(i["id"] == instance_id for i in org_admin_mine):
            _ok("ORG_ADMIN My Requests excludes employee-started instance")
            passed += 1
        else:
            _fail("ORG_ADMIN My Requests should only contain org-admin-started instances")
            failed += 1

        step1 = next(s for s in inst["steps"] if s["status"] == "pending")
        try:
            svc.approve_step(org_admin, instance_id, step1["id"], "Should not work")
            _fail("ORG_ADMIN should not approve Manager step early")
            failed += 1
        except PermissionError:
            _ok("ORG_ADMIN cannot skip Manager approval step")
            passed += 1

        inst = svc.approve_step(manager, instance_id, step1["id"], "Manager approved")
        mgr_pending_after = svc.list_instances(manager, scope="pending_approval")
        if not any(i["id"] == instance_id for i in mgr_pending_after):
            _ok("MANAGER pending_approval clears after manager step approved")
            passed += 1
        else:
            _fail("MANAGER should not remain in pending_approval after approving")
            failed += 1

        mgr_all_after = svc.list_instances(manager, scope="all_accessible")
        if any(i["id"] == instance_id for i in mgr_all_after):
            _ok("MANAGER still sees instance in all_accessible after acting")
            passed += 1
        else:
            _fail("MANAGER all_accessible missing instance after prior approval")
            failed += 1

        pending_steps = [s for s in inst["steps"] if s["status"] == "pending"]
        if len(pending_steps) != 1 or pending_steps[0]["name"] != "HR Leave Record":
            _fail("After manager approval, HR step should be pending", str(inst["steps"]))
            failed += 1
        else:
            _ok("Progress advanced to HR step after Manager approval")
            passed += 1

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
        try:
            svc.approve_step(manager, instance_id, hr_step["id"], "Should not work")
            _fail("MANAGER should not approve HR step when not in HR department")
            failed += 1
        except PermissionError:
            _ok("MANAGER cannot skip HR approval step")
            passed += 1

        inst = svc.approve_step(hr_actor, instance_id, hr_step["id"], "HR recorded")
        pending_steps = [s for s in inst["steps"] if s["status"] == "pending"]
        if len(pending_steps) != 1 or pending_steps[0]["name"] != "ORG Admin Final Approval":
            _fail("After HR approval, ORG Admin step should be pending")
            failed += 1
        else:
            _ok("Progress advanced to ORG Admin step after HR approval")
            passed += 1

        org_step = pending_steps[0]
        inst = svc.approve_step(org_admin, instance_id, org_step["id"], "Final approval")
        if inst["status"] != "completed":
            _fail("Instance should be completed", inst["status"])
            failed += 1
        else:
            _ok("ORG_ADMIN final approval — status completed")
            passed += 1

        audit_actions = {log.action for log in db.query(WorkflowAuditLog).filter(
            WorkflowAuditLog.instance_id == instance_id
        ).all()}
        expected_audit = {"instance_started", "step_approved", "instance_completed"}
        if not expected_audit.issubset(audit_actions):
            _fail("Audit log actions incomplete", str(audit_actions))
            failed += 1
        else:
            _ok("Audit logs include start, approvals, and completion")
            passed += 1

        notif_count = db.query(Notification).filter(
            Notification.organization_id == org_id,
            Notification.link_entity_type == "workflow_instance",
            Notification.link_entity_id == instance_id,
        ).count()
        if notif_count < 3:
            _fail("Expected workflow notifications", str(notif_count))
            failed += 1
        else:
            _ok(f"Notifications generated ({notif_count} workflow notifications)")
            passed += 1

        outsider = _load_user(db, employee.id)
        other_employees = [
            u for u in UserRepository(db).list_by_organization(org_id)
            if u.role_id == employee.role_id and u.id != employee.id
        ]
        if other_employees:
            stranger = _load_user(db, other_employees[0].id)
            try:
                svc.get_instance(stranger, instance_id)
                _fail("Organization isolation — stranger should not view instance")
                failed += 1
            except PermissionError:
                _ok("Organization isolation — non-participant cannot view instance")
                passed += 1

    except Exception as exc:
        print(f"  [FAIL] E2E aborted — {exc}")
        failed += 1
    finally:
        if restored_dept:
            user_id, dept_id = restored_dept
            user_row = db.query(User).filter(User.id == user_id).first()
            if user_row:
                user_row.department_id = dept_id
                db.commit()
        if workflow_id and org_id:
            wf_row = db.query(Workflow).filter(Workflow.id == workflow_id).first()
            if wf_row:
                wf_row.is_deleted = True
                wf_row.status = "disabled"
                db.commit()
        db.close()

    print("=" * 50)
    print(f"Results: {passed} passed, {failed} failed")
    if failed:
        sys.exit(1)
    print("Leave workflow E2E passed.")
    return 0


if __name__ == "__main__":
    main()
