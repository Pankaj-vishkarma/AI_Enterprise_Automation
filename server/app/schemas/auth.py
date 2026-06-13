import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$")


def _validate_password_strength(password: str) -> str:
    if not PASSWORD_PATTERN.match(password):
        raise ValueError(
            "Password must be at least 8 characters and include uppercase, lowercase, and a number"
        )
    return password


class RegisterRequest(BaseModel):
    organization_name: str = Field(min_length=2, max_length=255)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("organization_name")
    @classmethod
    def validate_organization_name(cls, value: str) -> str:
        trimmed = value.strip()
        if len(trimmed) < 2:
            raise ValueError("Organization name must be at least 2 characters")
        return trimmed

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_strength(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class LogoutRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_strength(value)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


class CurrentUserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    email: EmailStr
    organization_id: int
    role_id: int
    is_active: bool


class UserProfileResponse(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    full_name: str
    email: EmailStr
    username: str | None = None
    organization_id: int
    organization_name: str | None = None
    role_id: int
    role: str | None = None
    department_id: int | None = None
    department: str | None = None
    team_id: int | None = None
    team: str | None = None
    is_active: bool
    created_at: datetime | None = None
    last_login: datetime | None = None
