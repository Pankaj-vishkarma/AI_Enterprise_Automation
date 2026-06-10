from pydantic import BaseModel


class ConversationCreate(BaseModel):
    title: str | None = None


class ConversationResponse(BaseModel):
    id: int
    organization_id: int
    created_by_user_id: int
    title: str | None
    is_active: bool

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    role: str
    content: str
    message_metadata: str | None = None


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_user_id: int
    role: str
    content: str
    message_metadata: str | None = None

    class Config:
        from_attributes = True
