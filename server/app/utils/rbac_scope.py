from typing import Iterable, List, Optional, Set

from app.core.dependencies import (
    EMPLOYEE_ROLE,
    MANAGER_ROLE,
    ORG_ADMIN_ROLE,
    SUPER_ADMIN_ROLE,
)


def _role_name(user) -> Optional[str]:
    return getattr(getattr(user, "role", None), "name", None)


def team_member_ids(users: Iterable) -> Set[int]:
    return {user.id for user in users}


def resolve_team_member_ids(org_users: Iterable, current_user) -> Set[int]:
    """User IDs on the manager's team (including the manager)."""
    role = _role_name(current_user)
    if role != MANAGER_ROLE:
        return {current_user.id}
    if not current_user.team_id:
        return {current_user.id}
    members = team_member_ids(
        user for user in org_users if getattr(user, "team_id", None) == current_user.team_id
    )
    members.add(current_user.id)
    return members


def can_view_user_profile(current_user, target_user, member_ids: Optional[Set[int]] = None) -> bool:
    role = _role_name(current_user)
    if role == SUPER_ADMIN_ROLE:
        return True
    if getattr(target_user, "organization_id", None) != getattr(current_user, "organization_id", None):
        return False
    if role == ORG_ADMIN_ROLE:
        return True
    if role == MANAGER_ROLE:
        if target_user.id == current_user.id:
            return True
        if not current_user.team_id:
            return False
        if getattr(target_user, "team_id", None) != current_user.team_id:
            return False
        return _role_name(target_user) == EMPLOYEE_ROLE
    if role == EMPLOYEE_ROLE:
        return target_user.id == current_user.id
    return False


def assert_can_view_user_profile(
    current_user,
    target_user,
    member_ids: Optional[Set[int]] = None,
) -> None:
    if not can_view_user_profile(current_user, target_user, member_ids):
        raise PermissionError("You do not have access to this user")


def can_view_user_owned_record(
    current_user,
    owner_user_id: int,
    member_ids: Optional[Set[int]] = None,
) -> bool:
    role = _role_name(current_user)
    if role in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE}:
        return True
    if role == MANAGER_ROLE:
        if owner_user_id == current_user.id:
            return True
        if not current_user.team_id:
            return False
        members = member_ids or set()
        return owner_user_id in members
    if role == EMPLOYEE_ROLE:
        return owner_user_id == current_user.id
    return False


def assert_can_view_user_owned_record(
    current_user,
    owner_user_id: int,
    member_ids: Optional[Set[int]] = None,
) -> None:
    if not can_view_user_owned_record(current_user, owner_user_id, member_ids):
        raise PermissionError("You do not have access to this record")


def filter_user_owned_records(
    current_user,
    records: List,
    owner_attr: str = "created_by_user_id",
    member_ids: Optional[Set[int]] = None,
) -> List:
    return [
        record
        for record in records
        if can_view_user_owned_record(current_user, getattr(record, owner_attr), member_ids)
    ]


def can_view_support_ticket(current_user, ticket: dict, member_ids: Optional[Set[int]] = None) -> bool:
    role = _role_name(current_user)
    if role in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE}:
        return True
    if role == MANAGER_ROLE:
        team_id = current_user.team_id
        members = member_ids or set()
        if team_id is None:
            return (
                ticket.get("created_by_user_id") == current_user.id
                or ticket.get("assigned_to_user_id") == current_user.id
            )
        return (
            ticket.get("assigned_to_team_id") == team_id
            or ticket.get("assigned_to_user_id") in members
            or ticket.get("created_by_user_id") in members
        )
    if role == EMPLOYEE_ROLE:
        return (
            ticket.get("created_by_user_id") == current_user.id
            or ticket.get("assigned_to_user_id") == current_user.id
        )
    return False


def filter_support_tickets(current_user, tickets: List[dict], member_ids: Optional[Set[int]] = None) -> List[dict]:
    return [ticket for ticket in tickets if can_view_support_ticket(current_user, ticket, member_ids)]


def can_manage_support_ticket(current_user, ticket: dict, member_ids: Optional[Set[int]] = None) -> bool:
    role = _role_name(current_user)
    if role in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE}:
        return True
    if role == MANAGER_ROLE:
        return can_view_support_ticket(current_user, ticket, member_ids)
    return False


def can_view_omnichannel_conversation(
    current_user,
    conversation: dict,
    member_ids: Optional[Set[int]] = None,
) -> bool:
    role = _role_name(current_user)
    if role in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE}:
        return True
    if role == MANAGER_ROLE:
        team_id = current_user.team_id
        members = member_ids or set()
        if team_id is None:
            return (
                conversation.get("created_by_user_id") == current_user.id
                or conversation.get("assigned_to_user_id") == current_user.id
            )
        return (
            conversation.get("assigned_to_team_id") == team_id
            or conversation.get("assigned_to_user_id") in members
            or conversation.get("created_by_user_id") in members
        )
    if role == EMPLOYEE_ROLE:
        return conversation.get("assigned_to_user_id") == current_user.id
    return False


def filter_omnichannel_conversations(
    current_user,
    conversations: List[dict],
    member_ids: Optional[Set[int]] = None,
) -> List[dict]:
    return [
        conversation
        for conversation in conversations
        if can_view_omnichannel_conversation(current_user, conversation, member_ids)
    ]
