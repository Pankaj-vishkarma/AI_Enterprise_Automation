from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    AI_EMPLOYEE_MANAGE_PERMISSION,
    AI_EMPLOYEE_USE_PERMISSION,
    BROWSER_ACCESS_PERMISSION,
    COLLABORATION_USE_PERMISSION,
    OMNICHANNEL_MANAGE_PERMISSION,
    OMNICHANNEL_VIEW_PERMISSION,
    RESEARCH_ACCESS_PERMISSION,
    SUPPORT_MANAGE_PERMISSION,
    SUPPORT_VIEW_PERMISSION,
    VOICE_ACCESS_PERMISSION,
    WORKFLOW_MANAGE_PERMISSION,
    WORKFLOW_USE_PERMISSION,
    get_current_active_user,
    get_user_permissions,
    SUPER_ADMIN_ROLE,
)
from app.schemas.operations import (
    OperationalRecordCreate,
    OperationalRecordResponse,
    OperationalRecordUpdate,
)
from app.services.operations_service import OperationsService, MODULES

router = APIRouter(prefix="/api/v1/operations", tags=["operations"])

MODULE_VIEW_PERMISSIONS = {
    "ai-employees": AI_EMPLOYEE_USE_PERMISSION,
    "collaboration": COLLABORATION_USE_PERMISSION,
    "workflows": WORKFLOW_USE_PERMISSION,
    "research": RESEARCH_ACCESS_PERMISSION,
    "browser-automation": BROWSER_ACCESS_PERMISSION,
    "voice": VOICE_ACCESS_PERMISSION,
    "support": SUPPORT_VIEW_PERMISSION,
    "omnichannel": OMNICHANNEL_VIEW_PERMISSION,
}

MODULE_MANAGE_PERMISSIONS = {
    "ai-employees": AI_EMPLOYEE_MANAGE_PERMISSION,
    "collaboration": COLLABORATION_USE_PERMISSION,
    "workflows": WORKFLOW_MANAGE_PERMISSION,
    "research": RESEARCH_ACCESS_PERMISSION,
    "browser-automation": BROWSER_ACCESS_PERMISSION,
    "voice": VOICE_ACCESS_PERMISSION,
    "support": SUPPORT_MANAGE_PERMISSION,
    "omnichannel": OMNICHANNEL_MANAGE_PERMISSION,
}


def _validate_module(module: str) -> None:
    if module not in MODULES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported operations module")


def _assert_module_permission(current_user, module: str, action: str = "view") -> None:
    _validate_module(module)
    role_name = getattr(getattr(current_user, "role", None), "name", None)
    if role_name == SUPER_ADMIN_ROLE:
        return
    permission = (
        MODULE_MANAGE_PERMISSIONS.get(module)
        if action == "manage"
        else MODULE_VIEW_PERMISSIONS.get(module)
    )
    if permission not in get_user_permissions(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{permission} permission required",
        )


@router.get("/{module}", response_model=List[OperationalRecordResponse])
def list_records(
    module: str,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_module_permission(current_user, module, "view")
    try:
        return OperationsService(db).list(current_user, module)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/{module}", response_model=OperationalRecordResponse)
def create_record(
    module: str,
    payload: OperationalRecordCreate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_module_permission(current_user, module, "manage")
    try:
        return OperationsService(db).create(current_user, module, payload)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/{module}/{record_id}", response_model=OperationalRecordResponse)
def update_record(
    module: str,
    record_id: int,
    payload: OperationalRecordUpdate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _assert_module_permission(current_user, module, "manage")
    try:
        result = OperationsService(db).update(current_user, module, record_id, payload)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return result
