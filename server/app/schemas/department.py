from pydantic import BaseModel


class DepartmentCreate(BaseModel):
    name: str
    description: str | None = None


class DepartmentUpdate(BaseModel):
    name: str
    description: str | None = None


class DepartmentResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    description: str | None = None
    is_active: bool

    class Config:
        from_attributes = True
