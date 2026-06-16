from pydantic import BaseModel


class TeamCreate(BaseModel):
    name: str
    description: str | None = None


class TeamUpdate(BaseModel):
    name: str
    description: str | None = None


class TeamResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    description: str | None = None
    is_active: bool

    class Config:
        from_attributes = True
