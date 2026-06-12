import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.clients.groq_client import GroqClient
from app.repositories.ai_employee_repository import AIEmployeeRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.omnichannel_repository import OmnichannelRepository
from app.repositories.team_repository import TeamRepository
from app.repositories.user_repository import UserRepository
from app.services.ai_employee_service import AIEmployeeService
from app.services.notification_service import NotificationService
from app.services.omnichannel.provider_registry import OMNICHANNEL_CHANNELS, get_provider
from app.services.rag_service import RAGService
from app.services.support_service import SupportService


class OmnichannelService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = OmnichannelRepository(db)
        self.users = UserRepository(db)
        self.teams = TeamRepository(db)
        self.departments = DepartmentRepository(db)
        self.ai_employees = AIEmployeeService(db)
        self.ai_repo = AIEmployeeRepository(db)
        self.rag = RAGService(db)
        self.support = SupportService(db)
        self.notifications = NotificationService(db)
        self.groq = GroqClient()

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    def _reason(self, prompt: str, fallback: str) -> str:
        try:
            response = self.groq.generate(prompt)
            return response.get("output", {}).get("text", fallback)
        except Exception:
            return fallback

    def _find_support_assistant(self, organization_id: int):
        for employee in self.ai_repo.list(organization_id):
            if employee.is_active and employee.role == "Support Assistant":
                return employee
        return None

    def _build_shared_context(self, current_user, conversation_text: str) -> str:
        try:
            return self.rag.retrieve_context(current_user, conversation_text, top_k=4)
        except Exception:
            return ""

    def _build_ai_suggestion(self, current_user, conv, messages: List[dict]) -> str:
        transcript = "\n".join(
            f"{m['sender_type']}: {m['content']}" for m in messages[-12:]
        )
        context = conv.shared_context or self._build_shared_context(current_user, transcript)
        employee = self._find_support_assistant(current_user.organization_id)
        if employee and conv.handoff_status == "ai":
            try:
                result = self.ai_employees.run(
                    current_user,
                    employee.id,
                    f"Draft a concise omnichannel reply for {conv.channel}.\n"
                    f"Customer: {conv.participant_name}\nConversation:\n{transcript}",
                )
                if result and result.get("output"):
                    return result["output"]
            except Exception:
                pass
        prompt = "Draft a concise, empathetic customer reply for this omnichannel conversation.\n"
        if context:
            prompt += f"Shared organizational context:\n{context}\n\n"
        prompt += f"Channel: {conv.channel}\nCustomer: {conv.participant_name}\n{transcript}\nReply:"
        return self._reason(
            prompt,
            "Thank you for your message. A team member will follow up shortly.",
        )

    def _serialize_message(self, msg) -> dict:
        return {
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "sender_type": msg.sender_type,
            "sender_user_id": msg.sender_user_id,
            "content": msg.content,
            "delivery_status": msg.delivery_status,
            "metadata": json.loads(msg.metadata_json or "{}"),
            "created_at": msg.created_at,
        }

    def serialize_conversation(self, conv, include_messages: bool = False) -> dict:
        data = {
            "id": conv.id,
            "organization_id": conv.organization_id,
            "created_by_user_id": conv.created_by_user_id,
            "channel": conv.channel,
            "participant_name": conv.participant_name,
            "participant_email": conv.participant_email,
            "participant_company": conv.participant_company,
            "status": conv.status,
            "handoff_status": conv.handoff_status,
            "assigned_to_user_id": conv.assigned_to_user_id,
            "assigned_to_team_id": conv.assigned_to_team_id,
            "assigned_to_department_id": conv.assigned_to_department_id,
            "assigned_to_label": conv.assigned_to_label,
            "shared_context": conv.shared_context,
            "ai_suggestion": conv.ai_suggestion,
            "summary": conv.summary,
            "support_ticket_id": conv.support_ticket_id,
            "external_thread_id": conv.external_thread_id,
            "handoff_history": json.loads(conv.handoff_history_json or "[]"),
            "participants": json.loads(conv.participants_json or "[]"),
            "last_message_preview": conv.last_message_preview,
            "last_message_at": conv.last_message_at,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "messages": [],
        }
        if include_messages:
            messages = self.repo.list_messages(conv.organization_id, conv.id)
            data["messages"] = [self._serialize_message(m) for m in messages]
        return data

    def list_conversations(
        self,
        current_user,
        channel: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[dict]:
        convs = self.repo.list_conversations(current_user.organization_id, channel, status)
        return [self.serialize_conversation(c) for c in convs]

    def get_conversation(self, current_user, conversation_id: int) -> Optional[dict]:
        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        if not conv:
            return None
        return self.serialize_conversation(conv, include_messages=True)

    def create_conversation(self, current_user, payload: dict) -> dict:
        channel = payload.get("channel", "Website Chat")
        if channel not in OMNICHANNEL_CHANNELS:
            raise ValueError(f"Unsupported channel: {channel}")

        provider = get_provider(channel)
        thread_id = provider.create_thread({
            "name": payload["participant_name"],
            "email": payload.get("participant_email"),
        })

        participants = [{
            "name": payload["participant_name"],
            "email": payload.get("participant_email"),
            "role": "customer",
        }]

        conv = self.repo.create_conversation(
            current_user.organization_id,
            current_user.id,
            {
                "channel": channel,
                "participant_name": payload["participant_name"],
                "participant_email": payload.get("participant_email"),
                "participant_company": payload.get("participant_company"),
                "status": payload.get("status", "AI Active"),
                "handoff_status": "ai",
                "external_thread_id": thread_id,
                "participants": participants,
            },
        )

        initial = payload.get("initial_message")
        if initial:
            self.post_message(current_user, conv.id, {
                "content": initial,
                "sender_type": "user",
            }, auto_ai_reply=True)

        conv = self.repo.get_conversation(current_user.organization_id, conv.id)
        return self.serialize_conversation(conv, include_messages=True)

    def update_conversation(self, current_user, conversation_id: int, payload: dict) -> Optional[dict]:
        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        if not conv:
            return None
        self.repo.update_conversation(conv, payload)
        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        return self.serialize_conversation(conv, include_messages=True)

    def post_message(
        self,
        current_user,
        conversation_id: int,
        payload: dict,
        auto_ai_reply: bool = True,
    ) -> Optional[dict]:
        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        if not conv:
            return None

        sender_type = payload.get("sender_type", "human")
        content = payload["content"]
        sender_user_id = current_user.id if sender_type == "human" else None

        provider = get_provider(conv.channel)
        delivery = provider.send_message(conv.external_thread_id or f"local-{conv.id}", content)

        msg = self.repo.add_message(
            current_user.organization_id,
            conversation_id,
            sender_type,
            content,
            sender_user_id=sender_user_id,
            delivery_status=delivery.get("status", "sent"),
            metadata=delivery,
        )
        OmnichannelRepository.touch_conversation(conv, content, self.db)

        messages = [self._serialize_message(m) for m in self.repo.list_messages(
            current_user.organization_id, conversation_id
        )]
        shared_context = self._build_shared_context(current_user, content)
        suggestion = self._build_ai_suggestion(current_user, conv, messages)
        self.repo.update_conversation(conv, {
            "shared_context": shared_context,
            "ai_suggestion": suggestion,
        })

        if auto_ai_reply and sender_type == "user" and conv.handoff_status == "ai":
            ai_reply = suggestion
            ai_delivery = provider.send_message(
                conv.external_thread_id or f"local-{conv.id}", ai_reply
            )
            self.repo.add_message(
                current_user.organization_id,
                conversation_id,
                "ai",
                ai_reply,
                delivery_status=ai_delivery.get("status", "mock_delivered"),
                metadata=ai_delivery,
            )
            OmnichannelRepository.touch_conversation(conv, ai_reply, self.db)

        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        return self.serialize_conversation(conv, include_messages=True)

    def handoff_to_human(self, current_user, conversation_id: int, payload: dict) -> Optional[dict]:
        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        if not conv:
            return None

        history = json.loads(conv.handoff_history_json or "[]")
        history.append({
            "at": self._now_iso(),
            "by_user_id": current_user.id,
            "action": "handoff_to_human",
            "reason": payload.get("reason", "Manual handoff"),
        })

        label_parts = []
        user_id = payload.get("user_id")
        team_id = payload.get("team_id")
        department_id = payload.get("department_id")

        update_payload: Dict[str, Any] = {
            "status": "Human Active",
            "handoff_status": "human",
            "handoff_history": history,
            "assigned_to_user_id": None,
            "assigned_to_team_id": None,
            "assigned_to_department_id": None,
            "assigned_to_label": None,
        }

        if user_id:
            user = self.users.get_by_id(user_id)
            if not user or user.organization_id != current_user.organization_id:
                raise ValueError("Assigned user not found in organization")
            update_payload["assigned_to_user_id"] = user_id
            label_parts.append(f"{user.first_name} {user.last_name or ''}".strip())
            self.notifications.create(
                current_user.organization_id,
                user_id,
                "omnichannel_handoff",
                f"Handoff: {conv.participant_name}",
                payload.get("reason", "You have been assigned an omnichannel conversation."),
                link_entity_type="omnichannel_conversation",
                link_entity_id=conv.id,
            )
        if team_id:
            team = self.teams.get_by_id(team_id)
            if not team or team.organization_id != current_user.organization_id:
                raise ValueError("Assigned team not found")
            update_payload["assigned_to_team_id"] = team_id
            label_parts.append(team.name)
        if department_id:
            dept = self.departments.get_by_id(department_id, current_user.organization_id)
            if not dept:
                raise ValueError("Assigned department not found")
            update_payload["assigned_to_department_id"] = department_id
            label_parts.append(dept.name)

        update_payload["assigned_to_label"] = ", ".join(label_parts) if label_parts else None
        self.repo.update_conversation(conv, update_payload)

        self.repo.add_message(
            current_user.organization_id,
            conversation_id,
            "system",
            f"Conversation handed off to human agent. Reason: {payload.get('reason', 'Manual handoff')}",
            sender_user_id=current_user.id,
            delivery_status="sent",
        )

        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        return self.serialize_conversation(conv, include_messages=True)

    def return_to_ai(self, current_user, conversation_id: int) -> Optional[dict]:
        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        if not conv:
            return None

        history = json.loads(conv.handoff_history_json or "[]")
        history.append({
            "at": self._now_iso(),
            "by_user_id": current_user.id,
            "action": "return_to_ai",
            "reason": "Returned to AI assistant",
        })
        self.repo.update_conversation(conv, {
            "status": "AI Active",
            "handoff_status": "ai",
            "handoff_history": history,
        })
        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        return self.serialize_conversation(conv, include_messages=True)

    def regenerate_suggestion(self, current_user, conversation_id: int) -> Optional[dict]:
        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        if not conv:
            return None
        messages = [self._serialize_message(m) for m in self.repo.list_messages(
            current_user.organization_id, conversation_id
        )]
        suggestion = self._build_ai_suggestion(current_user, conv, messages)
        self.repo.update_conversation(conv, {"ai_suggestion": suggestion})
        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        return self.serialize_conversation(conv, include_messages=True)

    def refresh_context(self, current_user, conversation_id: int) -> Optional[dict]:
        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        if not conv:
            return None
        messages = self.repo.list_messages(current_user.organization_id, conversation_id)
        transcript = "\n".join(f"{m.sender_type}: {m.content}" for m in messages[-20:])
        context = self._build_shared_context(current_user, transcript)
        self.repo.update_conversation(conv, {"shared_context": context})
        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        return self.serialize_conversation(conv, include_messages=True)

    def generate_summary(self, current_user, conversation_id: int) -> Optional[dict]:
        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        if not conv:
            return None
        messages = self.repo.list_messages(current_user.organization_id, conversation_id)
        transcript = "\n".join(f"{m.sender_type}: {m.content}" for m in messages)
        summary = self._reason(
            f"Summarize this {conv.channel} conversation with {conv.participant_name} "
            f"in 3-5 bullet points for a human agent handoff:\n{transcript}",
            "Conversation summary is unavailable.",
        )
        self.repo.update_conversation(conv, {"summary": summary})
        return {"conversation_id": conversation_id, "summary": summary}

    def create_support_ticket(self, current_user, conversation_id: int) -> Optional[dict]:
        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        if not conv:
            return None
        messages = self.repo.list_messages(current_user.organization_id, conversation_id)
        last_user = next((m for m in reversed(messages) if m.sender_type == "user"), None)
        ticket = self.support.create_ticket(current_user, {
            "title": f"{conv.channel}: {conv.participant_name}",
            "customer": conv.participant_email or f"guest-{conv.id}@omnichannel.local",
            "message": last_user.content if last_user else conv.last_message_preview or "Omnichannel escalation",
            "category": None,
            "priority": "medium",
            "status": "New",
        })
        self.repo.update_conversation(conv, {"support_ticket_id": ticket["id"], "status": "Awaiting Handoff"})
        conv = self.repo.get_conversation(current_user.organization_id, conversation_id)
        result = self.serialize_conversation(conv, include_messages=True)
        result["support_ticket"] = ticket
        return result

    def ingest_inbound(self, current_user, payload: dict) -> dict:
        channel = payload["channel"]
        if channel not in OMNICHANNEL_CHANNELS:
            raise ValueError(f"Unsupported channel: {channel}")

        provider = get_provider(channel)
        normalized = provider.receive_message(payload)
        thread_id = normalized.get("thread_id") or payload.get("thread_id")

        conv = None
        if thread_id:
            for item in self.repo.list_conversations(current_user.organization_id, channel=channel):
                if item.external_thread_id == thread_id:
                    conv = item
                    break

        if not conv:
            conv_data = self.create_conversation(current_user, {
                "channel": channel,
                "participant_name": normalized.get("sender_name") or payload.get("sender_name", "Guest"),
                "participant_email": normalized.get("sender_email") or payload.get("sender_email"),
                "participant_company": payload.get("sender_company"),
                "initial_message": None,
            })
            conv = self.repo.get_conversation(current_user.organization_id, conv_data["id"])

        return self.post_message(current_user, conv.id, {
            "content": normalized.get("content") or payload["content"],
            "sender_type": "user",
        }, auto_ai_reply=True)

    def list_inbox_summary(self, current_user) -> str:
        convs = self.repo.list_conversations(current_user.organization_id)
        if not convs:
            return "Your omnichannel inbox is empty."
        lines = [
            f"- [{c.channel}] {c.participant_name}: {c.last_message_preview or 'No messages yet'} ({c.status})"
            for c in convs[:15]
        ]
        return f"You have {len(convs)} conversation(s):\n" + "\n".join(lines)

    # Legacy operations API adapter
    def to_operations_format(self, conv_data: dict) -> dict:
        messages = conv_data.get("messages", [])
        mapped_messages = [
            {"sender": m["sender_type"] if m["sender_type"] != "human" else "human", "text": m["content"]}
            for m in messages
        ]
        return {
            "id": conv_data["id"],
            "organization_id": conv_data["organization_id"],
            "created_by_user_id": conv_data.get("created_by_user_id"),
            "module": "omnichannel",
            "record_type": "conversation",
            "title": conv_data["participant_name"],
            "status": conv_data["status"],
            "data": {
                "name": conv_data["participant_name"],
                "channel": conv_data["channel"],
                "lastMessage": conv_data.get("last_message_preview") or "",
                "time": conv_data.get("last_message_at"),
                "avatar": "".join(part[:1] for part in conv_data["participant_name"].split()[:2]).upper(),
                "messages": mapped_messages,
                "recommendedReply": conv_data.get("ai_suggestion") or "",
                "email": conv_data.get("participant_email"),
                "company": conv_data.get("participant_company"),
                "sharedContext": conv_data.get("shared_context"),
                "summary": conv_data.get("summary"),
                "handoff_history": conv_data.get("handoff_history", []),
                "assigned_to_label": conv_data.get("assigned_to_label"),
                "support_ticket_id": conv_data.get("support_ticket_id"),
            },
            "created_at": conv_data.get("created_at"),
            "updated_at": conv_data.get("updated_at"),
        }

    def create_from_operations(self, current_user, data: dict) -> dict:
        d = data.get("data", {})
        conv = self.create_conversation(current_user, {
            "channel": d.get("channel", "Website Chat"),
            "participant_name": data.get("title") or d.get("name", "Guest"),
            "participant_email": d.get("email"),
            "participant_company": d.get("company"),
            "initial_message": d.get("lastMessage"),
            "status": data.get("status", "AI Active"),
        })
        return self.to_operations_format(conv)

    def update_from_operations(self, current_user, record_id: int, payload: dict) -> Optional[dict]:
        conv = self.repo.get_conversation(current_user.organization_id, record_id)
        if not conv:
            return None

        if payload.get("status"):
            if payload["status"] == "Human Active":
                result = self.handoff_to_human(current_user, record_id, {"reason": "Via operations API"})
                return self.to_operations_format(result)
            if payload["status"] == "AI Active":
                result = self.return_to_ai(current_user, record_id)
                return self.to_operations_format(result)
            self.repo.update_conversation(conv, {"status": payload["status"]})

        data = payload.get("data") or {}
        if data.get("messages"):
            existing = self.repo.list_messages(current_user.organization_id, record_id)
            if len(data["messages"]) > len(existing):
                last = data["messages"][-1]
                sender = last.get("sender", "human")
                sender_type = "ai" if sender == "ai" else "human" if sender == "human" else "user"
                result = self.post_message(current_user, record_id, {
                    "content": last.get("text", ""),
                    "sender_type": sender_type,
                }, auto_ai_reply=False)
                return self.to_operations_format(result)

        conv_data = self.get_conversation(current_user, record_id)
        return self.to_operations_format(conv_data) if conv_data else None

    def list_for_operations(self, current_user) -> List[dict]:
        return [self.to_operations_format(c) for c in self.list_conversations(current_user)]
