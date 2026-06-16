"""Compatibility wrappers for older imports.

Keep the authoritative auth dependencies in app.core.dependencies.
"""

from app.core.dependencies import (  # noqa: F401
    EMPLOYEE_ROLE,
    MANAGER_ROLE,
    ORG_ADMIN_ROLE,
    SUPER_ADMIN_ROLE,
    get_current_active_user,
    get_current_user,
    require_employee,
    require_manager,
    require_org_admin,
    require_role,
    require_super_admin,
)
