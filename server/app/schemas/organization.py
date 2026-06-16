from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class OrganizationResponse(BaseModel):
    id: int
    name: str
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    status: Optional[str] = Field(default=None, max_length=50)
