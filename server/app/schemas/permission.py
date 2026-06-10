from pydantic import BaseModel


class PermissionCreate(BaseModel):
    name: str
    description: str | None = None


class PermissionResponse(BaseModel):
    id: int
    name: str
    description: str | None = None

    class Config:
        from_attributes = True


class RolePermissionsUpdate(BaseModel):
    permission_ids: list[int]
