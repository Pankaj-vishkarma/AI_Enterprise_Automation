from sqlalchemy.orm import Session

from app.models.conversation_message import ConversationMessage


class ConversationMessageRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        conversation_id: int,
        sender_user_id: int,
        role: str,
        content: str,
        message_metadata: str | None = None,
    ):
        msg = ConversationMessage(
            conversation_id=conversation_id,
            sender_user_id=sender_user_id,
            role=role,
            content=content,
            message_metadata=message_metadata,
        )
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def list_by_conversation(self, conversation_id: int):
        return (
            self.db.query(ConversationMessage)
            .filter(ConversationMessage.conversation_id == conversation_id)
            .order_by(ConversationMessage.id.asc())
            .all()
        )
