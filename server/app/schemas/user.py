from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    first_name: str
    last_name: str | None = None

    email: EmailStr
    password: str

    organization_id: int
    role_id: int


class Token(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    email: EmailStr

    class Config:
        from_attributes = True
