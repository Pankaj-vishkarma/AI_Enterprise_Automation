from typing import List, Optional

from pydantic import BaseModel
from pydantic import Field

from app.schemas.permission import PermissionResponse


class RoleCreate(BaseModel):
    name: str
    permission_ids: List[int] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    permission_ids: Optional[List[int]] = None


class RoleResponse(BaseModel):
    id: int
    name: str
    permissions: List[PermissionResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ChangeUserRoleRequest(BaseModel):
    role_id: int
