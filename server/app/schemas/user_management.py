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


class UserUpdate(BaseModel):
    first_name: str
    last_name: str | None = None
    email: EmailStr


class AssignUserDepartmentRequest(BaseModel):
    department_id: int


class AssignUserTeamRequest(BaseModel):
    team_id: int


class UserAssignmentResponse(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    email: EmailStr
    organization_id: int
    role_id: int
    department_id: int | None = None
    team_id: int | None = None
    is_active: bool

    class Config:
        from_attributes = True
