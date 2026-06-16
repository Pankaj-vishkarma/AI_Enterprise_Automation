from app.repositories.conversation_repository import ConversationRepository
from app.repositories.conversation_message_repository import (
    ConversationMessageRepository,
)


class ConversationService:
    def __init__(self, db):
        self.db = db
        self.conv_repo = ConversationRepository(db)
        self.msg_repo = ConversationMessageRepository(db)

    def create_conversation(self, current_user, title: str | None = None):
        return self.conv_repo.create(
            current_user.organization_id, current_user.id, title
        )

    def list_conversations(self, current_user):
        return self.conv_repo.list_by_org(current_user.organization_id)

    def get_conversation(self, current_user, conversation_id: int):
        return self.conv_repo.get_by_id_and_org(
            conversation_id, current_user.organization_id
        )

    def delete_conversation(self, current_user, conversation_id: int):
        conv = self.get_conversation(current_user, conversation_id)
        if not conv:
            return None
        return self.conv_repo.delete(conversation_id)

    def post_message(
        self,
        current_user,
        conversation_id: int,
        role: str,
        content: str,
        message_metadata: str | None = None,
    ):
        conv = self.get_conversation(current_user, conversation_id)
        if not conv:
            return None
        return self.msg_repo.create(
            conversation_id,
            current_user.id,
            role,
            content,
            message_metadata,
        )

    def list_messages(self, current_user, conversation_id: int):
        conv = self.get_conversation(current_user, conversation_id)
        if not conv:
            return None
        return self.msg_repo.list_by_conversation(conversation_id)
