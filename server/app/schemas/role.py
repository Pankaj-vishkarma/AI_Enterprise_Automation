from pydantic import BaseModel
from pydantic import Field

from app.schemas.permission import PermissionResponse


class RoleResponse(BaseModel):
    id: int
    name: str
    permissions: list[PermissionResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ChangeUserRoleRequest(BaseModel):
    role_id: int
