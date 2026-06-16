from typing import List, Optional

from pydantic import BaseModel


class PermissionCreate(BaseModel):
    name: str
    description: Optional[str] = None


class PermissionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class RolePermissionsUpdate(BaseModel):
    permission_ids: List[int]
