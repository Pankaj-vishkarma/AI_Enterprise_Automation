"""Shared role visibility rules for organization-level user management."""

from typing import Iterable, List, Optional, TypeVar

from app.core.dependencies import ORG_ASSIGNABLE_ROLE_NAMES, SUPER_ADMIN_ROLE

T = TypeVar("T")


def is_org_assignable_role(role_name: Optional[str]) -> bool:
    return role_name in ORG_ASSIGNABLE_ROLE_NAMES


def should_exclude_super_admin_from_user_list(viewer_role_name: Optional[str]) -> bool:
    return viewer_role_name != SUPER_ADMIN_ROLE


def roles_for_user_management_viewer(viewer_role_name: Optional[str], roles: Iterable[T]) -> List[T]:
    """SUPER_ADMIN sees every role; org-level viewers never see SUPER_ADMIN."""
    if viewer_role_name == SUPER_ADMIN_ROLE:
        return list(roles)
    return [role for role in roles if getattr(role, "name", None) != SUPER_ADMIN_ROLE]
