from pydantic import BaseModel, EmailStr


class ManagedUserCreate(BaseModel):
    first_name: str
    last_name: str | None = None
    email: EmailStr
    password: str
    role_id: int | None = None
    department_id: int | None = None
    team_id: int | None = None


class UserOut(BaseModel):
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


class UserListOut(BaseModel):
    """List-safe user shape: plain str email so one bad row cannot break pagination."""

    id: int
    first_name: str
    last_name: str | None = None
    email: str
    organization_id: int
    role_id: int
    department_id: int | None = None
    team_id: int | None = None
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
