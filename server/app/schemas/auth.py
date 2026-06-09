from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    organization_name: str
    first_name: str
    last_name: str | None = None
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    email: EmailStr
    organization_id: int
    role_id: int
    is_active: bool
