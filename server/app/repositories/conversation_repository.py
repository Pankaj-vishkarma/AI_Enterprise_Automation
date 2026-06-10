from sqlalchemy.orm import Session

from app.models.conversation import Conversation


class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self, organization_id: int, created_by_user_id: int, title: str | None = None
    ):
        conv = Conversation(
            organization_id=organization_id,
            created_by_user_id=created_by_user_id,
            title=title,
        )
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def get_by_id_and_org(self, conversation_id: int, organization_id: int):
        return (
            self.db.query(Conversation)
            .filter(
                Conversation.id == conversation_id,
                Conversation.organization_id == organization_id,
            )
            .first()
        )

    def list_by_org(self, organization_id: int):
        return (
            self.db.query(Conversation)
            .filter(Conversation.organization_id == organization_id)
            .order_by(Conversation.id.desc())
            .all()
        )

    def delete(self, conversation_id: int):
        conv = (
            self.db.query(Conversation)
            .filter(Conversation.id == conversation_id)
            .first()
        )
        if conv:
            self.db.delete(conv)
            self.db.commit()
        return conv
