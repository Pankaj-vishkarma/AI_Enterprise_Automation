import json
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.omnichannel_conversation import OmnichannelConversation
from app.models.omnichannel_message import OmnichannelMessage


class OmnichannelRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_conversations(
        self,
        organization_id: int,
        channel: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[OmnichannelConversation]:
        query = (
            self.db.query(OmnichannelConversation)
            .filter(OmnichannelConversation.organization_id == organization_id)
            .order_by(
                OmnichannelConversation.updated_at.desc(),
                OmnichannelConversation.id.desc(),
            )
        )
        if channel:
            query = query.filter(OmnichannelConversation.channel == channel)
        if status:
            query = query.filter(OmnichannelConversation.status == status)
        return query.all()

    def get_conversation(self, organization_id: int, conversation_id: int) -> Optional[OmnichannelConversation]:
        return (
            self.db.query(OmnichannelConversation)
            .filter(
                OmnichannelConversation.id == conversation_id,
                OmnichannelConversation.organization_id == organization_id,
            )
            .first()
        )

    def create_conversation(self, organization_id: int, user_id: int, payload: dict) -> OmnichannelConversation:
        conv = OmnichannelConversation(
            organization_id=organization_id,
            created_by_user_id=user_id,
            channel=payload["channel"],
            participant_name=payload["participant_name"],
            participant_email=payload.get("participant_email"),
            participant_company=payload.get("participant_company"),
            status=payload.get("status", "AI Active"),
            handoff_status=payload.get("handoff_status", "ai"),
            external_thread_id=payload.get("external_thread_id"),
            participants_json=json.dumps(payload.get("participants", [])),
            shared_context=payload.get("shared_context"),
            ai_suggestion=payload.get("ai_suggestion"),
            summary=payload.get("summary"),
        )
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def update_conversation(self, conv: OmnichannelConversation, payload: dict) -> OmnichannelConversation:
        for field in (
            "channel", "participant_name", "participant_email", "participant_company",
            "status", "handoff_status", "assigned_to_user_id", "assigned_to_team_id",
            "assigned_to_department_id", "assigned_to_label", "shared_context",
            "ai_suggestion", "summary", "support_ticket_id", "external_thread_id",
            "last_message_preview",
        ):
            if field in payload:
                setattr(conv, field, payload[field])
        if "handoff_history" in payload:
            conv.handoff_history_json = json.dumps(payload["handoff_history"])
        if "participants" in payload:
            conv.participants_json = json.dumps(payload["participants"])
        if payload.get("last_message_at"):
            conv.last_message_at = payload["last_message_at"]
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def add_message(
        self,
        organization_id: int,
        conversation_id: int,
        sender_type: str,
        content: str,
        sender_user_id: Optional[int] = None,
        delivery_status: str = "sent",
        metadata: Optional[dict] = None,
    ) -> OmnichannelMessage:
        msg = OmnichannelMessage(
            organization_id=organization_id,
            conversation_id=conversation_id,
            sender_type=sender_type,
            sender_user_id=sender_user_id,
            content=content,
            delivery_status=delivery_status,
            metadata_json=json.dumps(metadata or {}),
        )
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def list_messages(self, organization_id: int, conversation_id: int) -> List[OmnichannelMessage]:
        return (
            self.db.query(OmnichannelMessage)
            .filter(
                OmnichannelMessage.organization_id == organization_id,
                OmnichannelMessage.conversation_id == conversation_id,
            )
            .order_by(OmnichannelMessage.created_at.asc(), OmnichannelMessage.id.asc())
            .all()
        )

    @staticmethod
    def touch_conversation(conv: OmnichannelConversation, preview: str, db: Session):
        conv.last_message_preview = preview[:500]
        conv.last_message_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(conv)
