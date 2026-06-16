"""Registration input validation — whitespace-only organization and name fields."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pydantic import ValidationError

from app.schemas.auth import RegisterRequest


def _ok(msg):
    print(f"  [OK] {msg}")


def _fail(msg, detail=""):
    print(f"  [FAIL] {msg}" + (f" — {detail}" if detail else ""))


def _expect_validation(payload, expected_msg_fragment: str):
    try:
        RegisterRequest(**payload)
        _fail(f"Should reject payload: {payload!r}")
        return False
    except ValidationError as exc:
        text = str(exc)
        if expected_msg_fragment in text:
            _ok(f"Rejected {payload.get('organization_name', payload)!r} -> {expected_msg_fragment!r}")
            return True
        _fail("Unexpected validation error", text)
        return False


def main():
    base = {
        "first_name": "Test",
        "last_name": "User",
        "email": "test@example.com",
        "password": "StrongPass123!",
    }
    passed = failed = 0

    print("Register validation")
    print("=" * 50)

    cases = [
        ({**base, "organization_name": ""}, "Organization name is required"),
        ({**base, "organization_name": " "}, "Organization name is required"),
        ({**base, "organization_name": "   "}, "Organization name is required"),
        ({**base, "organization_name": "\t\n"}, "Organization name is required"),
        ({**base, "organization_name": " a "}, "at least 2 characters"),
        ({**base, "organization_name": "Valid Org", "first_name": "   "}, "First name is required"),
    ]

    for payload, fragment in cases:
        if _expect_validation(payload, fragment):
            passed += 1
        else:
            failed += 1

    try:
        req = RegisterRequest(
            organization_name="  Acme Corp  ",
            first_name="  Jane  ",
            last_name="  Doe  ",
            email="trim@example.com",
            password="StrongPass123!",
        )
        if req.organization_name == "Acme Corp" and req.first_name == "Jane" and req.last_name == "Doe":
            _ok("Trims valid organization and names")
            passed += 1
        else:
            _fail("Trim behavior", f"{req.organization_name!r}, {req.first_name!r}")
            failed += 1
    except ValidationError as exc:
        _fail("Valid payload rejected", str(exc))
        failed += 1

    print("=" * 50)
    print(f"Results: {passed} passed, {failed} failed")
    if failed:
        sys.exit(1)
    print("All checks passed.")


if __name__ == "__main__":
    main()
