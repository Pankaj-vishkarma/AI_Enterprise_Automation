"""Test organization duplicate prevention during public registration."""

import json
import time
from urllib import error, request

BASE_URL = "http://127.0.0.1:8000"
ORG_NAME = "ABC Technologies"
PASSWORD = "StrongPass123!"


def http_json(method, path, body=None):
    url = BASE_URL + path
    headers = {"Content-Type": "application/json"}
    data = json.dumps(body).encode("utf-8") if body is not None else None
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
        raise AssertionError(f"{label}: expected {expected}, got {actual}, payload={payload}")
    print(f"PASS {label}")


def register(org_name: str, email: str):
    return http_json(
        "POST",
        "/api/v1/auth/register",
        {
            "organization_name": org_name,
            "first_name": "Test",
            "last_name": "User",
            "email": email,
            "password": PASSWORD,
        },
    )


def main():
    stamp = int(time.time())
    first_email = f"org-a.{stamp}@example.com"

    status, payload = register(ORG_NAME, first_email)
    assert_status("Case 1: first registration succeeds", status, 200, payload)

    cases = [
        ("Case 2: exact duplicate org", ORG_NAME, f"org-b.{stamp}@example.com"),
        ("Case 3: lowercase duplicate", "abc technologies", f"org-c.{stamp}@example.com"),
        ("Case 4: uppercase duplicate", "ABC TECHNOLOGIES", f"org-d.{stamp}@example.com"),
        ("Case 5: padded duplicate", "  ABC Technologies  ", f"org-e.{stamp}@example.com"),
    ]

    for label, org_name, email in cases:
        status, payload = register(org_name, email)
        assert_status(label, status, 400, payload)
        detail = payload.get("detail") if isinstance(payload, dict) else payload
        if detail != "Organization already exists":
            raise AssertionError(f"{label}: expected org exists error, got {detail}")

    print("ALL ORGANIZATION DUPLICATE TESTS PASSED")


if __name__ == "__main__":
    main()
