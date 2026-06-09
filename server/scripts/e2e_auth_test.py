import json
import subprocess
import time
from urllib import error, request
from urllib.parse import urlencode

BASE_URL = "http://127.0.0.1:8000"
SERVER_PYTHON = r".\\venv\\Scripts\\python.exe"
SUPER_ADMIN_EMAIL = "superadmin@example.com"
SUPER_ADMIN_PASSWORD = "ChangeMe123!"


def http_json(method, path, token=None, body=None, params=None):
    url = BASE_URL + path
    if params:
        url += "?" + urlencode(params)

    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")

    req = request.Request(url, data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode("utf-8")
            payload = json.loads(raw) if raw else None
            return resp.status, payload
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = raw
        return exc.code, payload


def assert_status(label, actual, expected, payload=None):
    if actual != expected:
        raise AssertionError(
            f"{label} failed: expected {expected}, got {actual}, payload={payload}"
        )
    print(f"PASS {label}")


def assert_true(label, condition, payload=None):
    if not condition:
        raise AssertionError(f"{label} failed: {payload}")
    print(f"PASS {label}")


def main():
    print("Seeding SUPER_ADMIN...")
    subprocess.run([SERVER_PYTHON, "scripts/seed_super_admin.py"], check=True)

    stamp = int(time.time())
    org_a = f"QA-Org-A-{stamp}"
    org_b = f"QA-Org-B-{stamp}"

    reg_a = {
        "organization_name": org_a,
        "first_name": "Alice",
        "last_name": "Admin",
        "email": f"alice.{stamp}@example.com",
        "password": "StrongPass123!",
    }
    status, payload = http_json("POST", "/api/v1/auth/register", body=reg_a)
    assert_status("register A", status, 200, payload)
    assert_true(
        "register A tokens",
        all(k in payload for k in ("access_token", "refresh_token", "token_type")),
        payload,
    )
    a_access = payload["access_token"]
    a_refresh = payload["refresh_token"]

    status, payload = http_json("GET", "/api/v1/auth/debug-role", token=a_access)
    assert_status("debug-role A", status, 200, payload)
    assert_true("debug-role A role", payload.get("role") == "ORG_ADMIN", payload)

    status, payload = http_json("GET", "/api/v1/auth/org-admin-test", token=a_access)
    assert_status("org-admin-test A", status, 200, payload)
    assert_true(
        "org-admin-test A message",
        payload.get("message") == "ORG_ADMIN access granted",
        payload,
    )

    status, payload = http_json("GET", "/api/v1/auth/me", token=a_access)
    assert_status("me A", status, 200, payload)
    org_a_id = payload["organization_id"]

    status, refresh_payload = http_json(
        "POST", "/api/v1/auth/refresh", body={"refresh_token": a_refresh}
    )
    assert_status("refresh A", status, 200, refresh_payload)
    a_access_2 = refresh_payload["access_token"]
    a_refresh_2 = refresh_payload["refresh_token"]
    assert_true("refresh rotation", a_refresh_2 != a_refresh, refresh_payload)

    status, payload = http_json(
        "POST", "/api/v1/auth/refresh", body={"refresh_token": a_refresh}
    )
    assert_status("old refresh rejected", status, 401, payload)

    status, payload = http_json("GET", "/api/v1/auth/me", token=a_access_2)
    assert_status("me with rotated access", status, 200, payload)

    status, payload = http_json(
        "POST",
        "/api/v1/users/managers",
        token=a_access_2,
        body={
            "first_name": "Manny",
            "last_name": "Manager",
            "email": f"manager.{stamp}@example.com",
            "password": "StrongPass123!",
        },
    )
    assert_status("create manager", status, 200, payload)
    manager_email = payload["email"]

    status, payload = http_json(
        "POST",
        "/api/v1/users/employees",
        token=a_access_2,
        body={
            "first_name": "Eve",
            "last_name": "Employee",
            "email": f"employee.{stamp}@example.com",
            "password": "StrongPass123!",
        },
    )
    assert_status("create employee", status, 200, payload)
    employee_email = payload["email"]

    status, payload = http_json("GET", "/api/v1/users", token=a_access_2)
    assert_status("org admin user list", status, 200, payload)
    assert_true(
        "org admin sees manager",
        any(u["email"] == manager_email for u in payload),
        payload,
    )
    assert_true(
        "org admin sees employee",
        any(u["email"] == employee_email for u in payload),
        payload,
    )

    status, login_payload = http_json(
        "POST",
        "/api/v1/auth/login",
        body={"email": manager_email, "password": "StrongPass123!"},
    )
    assert_status("login manager", status, 200, login_payload)
    manager_access = login_payload["access_token"]
    manager_refresh = login_payload["refresh_token"]

    status, payload = http_json(
        "GET", "/api/v1/auth/org-admin-test", token=manager_access
    )
    assert_status("manager forbidden org-admin-test", status, 403, payload)

    status, payload = http_json("GET", "/api/v1/users", token=manager_access)
    assert_status("manager user list", status, 200, payload)
    assert_true(
        "manager sees employee",
        any(u["email"] == employee_email for u in payload),
        payload,
    )
    assert_true(
        "manager does not see manager account in employee list",
        all(u["email"] != manager_email for u in payload),
        payload,
    )

    status, login_payload = http_json(
        "POST",
        "/api/v1/auth/login",
        body={"email": employee_email, "password": "StrongPass123!"},
    )
    assert_status("login employee", status, 200, login_payload)
    employee_access = login_payload["access_token"]
    employee_refresh = login_payload["refresh_token"]

    status, payload = http_json("GET", "/api/v1/users", token=employee_access)
    assert_status("employee user list", status, 200, payload)
    assert_true(
        "employee sees only self",
        len(payload) == 1 and payload[0]["email"] == employee_email,
        payload,
    )

    status, payload = http_json(
        "POST", "/api/v1/auth/logout", body={"refresh_token": manager_refresh}
    )
    assert_status("logout manager", status, 200, payload)
    status, payload = http_json(
        "POST", "/api/v1/auth/refresh", body={"refresh_token": manager_refresh}
    )
    assert_status("refresh after logout rejected", status, 401, payload)

    status, payload = http_json(
        "POST", "/api/v1/auth/logout-all", token=employee_access
    )
    assert_status("logout-all employee", status, 200, payload)
    status, payload = http_json(
        "POST", "/api/v1/auth/refresh", body={"refresh_token": employee_refresh}
    )
    assert_status("refresh after logout-all rejected", status, 401, payload)

    status, login_payload = http_json(
        "POST",
        "/api/v1/auth/login",
        body={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD},
    )
    assert_status("login super admin", status, 200, login_payload)
    super_access = login_payload["access_token"]

    status, payload = http_json(
        "GET", "/api/v1/auth/super-admin-test", token=super_access
    )
    assert_status("super-admin-test", status, 200, payload)

    status, payload = http_json(
        "POST",
        "/api/v1/users/org-admins",
        token=super_access,
        params={"organization_id": str(org_a_id)},
        body={
            "first_name": "Second",
            "last_name": "Admin",
            "email": f"second-admin.{stamp}@example.com",
            "password": "StrongPass123!",
        },
    )
    assert_status("super admin create org admin", status, 200, payload)

    status, payload = http_json("GET", "/api/v1/users", token=super_access)
    assert_status("super admin user list", status, 200, payload)
    assert_true("super admin sees many users", len(payload) >= 4, payload)

    reg_b = {
        "organization_name": org_b,
        "first_name": "Bob",
        "last_name": "Admin",
        "email": f"bob.{stamp}@example.com",
        "password": "StrongPass123!",
    }
    status, payload = http_json("POST", "/api/v1/auth/register", body=reg_b)
    assert_status("register B", status, 200, payload)
    b_access = payload["access_token"]

    status, payload = http_json("GET", "/api/v1/users", token=b_access)
    assert_status("org B user list", status, 200, payload)
    assert_true(
        "org B isolation",
        all(u["email"] not in {manager_email, employee_email} for u in payload),
        payload,
    )

    print("ALL API CHECKS PASSED")


if __name__ == "__main__":
    main()
