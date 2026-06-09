from pydantic import BaseModel, EmailStr


class ManagedUserCreate(BaseModel):
    first_name: str
    last_name: str | None = None
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    email: EmailStr
    organization_id: int
    role_id: int
    is_active: bool

    class Config:
        from_attributes = True
