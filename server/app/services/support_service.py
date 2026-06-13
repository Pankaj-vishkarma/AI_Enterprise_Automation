import json
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.clients.groq_client import GroqClient
from app.repositories.ai_employee_repository import AIEmployeeRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.operational_record_repository import OperationalRecordRepository
from app.repositories.team_repository import TeamRepository
from app.repositories.user_repository import UserRepository
from app.schemas.support import SUPPORT_CATEGORIES, SUPPORT_PRIORITIES
from app.services.ai_employee_service import AIEmployeeService
from app.services.rag_service import RAGService
from app.core.dependencies import SUPPORT_MANAGE_PERMISSION, user_has_permission
from app.utils.rbac_scope import (
    can_manage_support_ticket,
    can_view_support_ticket,
    filter_support_tickets,
    team_member_ids,
)


class SupportService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = OperationalRecordRepository(db)
        self.users = UserRepository(db)
        self.teams = TeamRepository(db)
        self.departments = DepartmentRepository(db)
        self.ai_employees = AIEmployeeService(db)
        self.ai_repo = AIEmployeeRepository(db)
        self.rag = RAGService(db)
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

    def analyze_sentiment(self, text: str) -> str:
        lowered = text.lower()
        negative = {"bad", "fail", "error", "broken", "angry", "refund", "late", "terrible", "awful", "complaint"}
        positive = {"love", "great", "helpful", "thanks", "excellent", "appreciate", "wonderful"}
        if any(word in lowered for word in negative):
            return "Negative"
        if any(word in lowered for word in positive):
            return "Positive"
        llm = self._reason(
            f"Classify sentiment as exactly one word: Positive, Neutral, or Negative.\nText: {text}",
            "Neutral",
        ).strip().split()[0] if text else "Neutral"
        for label in ("Positive", "Neutral", "Negative"):
            if label.lower() in llm.lower():
                return label
        return "Neutral"

    def categorize(self, title: str, message: str, category: Optional[str] = None) -> str:
        if category and category in SUPPORT_CATEGORIES:
            return category
        text = f"{title} {message}".lower()
        rules = [
            ("Billing Issues", ["billing", "charge", "invoice", "payment", "refund", "subscription"]),
            ("Technical Problems", ["api", "error", "bug", "401", "500", "login", "technical", "crash"]),
            ("Account Requests", ["account", "password reset", "access", "permission", "role"]),
            ("Complaints", ["complaint", "unhappy", "disappointed", "frustrated", "terrible"]),
            ("Feature Requests", ["feature", "request", "would be helpful", "add support for", "export"]),
        ]
        for cat, keywords in rules:
            if any(k in text for k in keywords):
                return cat
        llm = self._reason(
            "Pick exactly one category from: "
            + ", ".join(SUPPORT_CATEGORIES)
            + f"\nTicket: {title}\nMessage: {message}\nCategory:",
            "General Questions",
        )
        for cat in SUPPORT_CATEGORIES:
            if cat.lower() in llm.lower():
                return cat
        return "General Questions"

    def _build_recommendation(self, current_user, title: str, message: str, category: str) -> str:
        context = ""
        try:
            context = self.rag.retrieve_context(
                current_user,
                f"{category}: {title}. {message}",
                top_k=3,
            )
        except Exception:
            context = ""

        employee = self._find_support_assistant(current_user.organization_id)
        if employee:
            try:
                result = self.ai_employees.run(
                    current_user,
                    employee.id,
                    f"Draft a support response for this {category} ticket.\nTitle: {title}\nCustomer: {message}",
                )
                if result and result.get("output"):
                    return result["output"]
            except Exception:
                pass

        prompt = (
            "Write a concise, empathetic customer support response. Use organizational context when relevant. "
            "Do not invent actions already taken.\n"
        )
        if context:
            prompt += f"Knowledge context:\n{context}\n\n"
        prompt += f"Category: {category}\nTicket: {title}\nCustomer message: {message}\nResponse:"
        return self._reason(
            prompt,
            "Thank you for contacting support. We have reviewed your request and will follow up shortly.",
        )

    def _team_member_ids(self, current_user) -> set[int]:
        if not current_user.team_id:
            return set()
        members = self.users.list_by_organization(current_user.organization_id)
        return team_member_ids(
            member for member in members if member.team_id == current_user.team_id
        )

    def _ensure_ticket_access(self, current_user, ticket: dict) -> None:
        if not can_view_support_ticket(current_user, ticket, self._team_member_ids(current_user)):
            raise PermissionError("You do not have access to this ticket")

    def _ensure_ticket_manage(self, current_user, ticket: dict) -> None:
        if not user_has_permission(current_user, SUPPORT_MANAGE_PERMISSION):
            raise PermissionError("SUPPORT_MANAGE permission required")
        if not can_manage_support_ticket(current_user, ticket, self._team_member_ids(current_user)):
            raise PermissionError("You are not authorized to manage this ticket")

    def _find_support_assistant(self, organization_id: int):
        for employee in self.ai_repo.list(organization_id):
            if employee.is_active and employee.role == "Support Assistant":
                return employee
        return None

    @staticmethod
    def serialize_ticket(record) -> dict:
        data = json.loads(record.data_json or "{}")
        return {
            "id": record.id,
            "ticket_number": data.get("ticket_number") or f"TCK-{record.id}",
            "organization_id": record.organization_id,
            "created_by_user_id": record.created_by_user_id,
            "title": record.title,
            "status": record.status,
            "priority": data.get("priority", "medium"),
            "category": data.get("category", "General Questions"),
            "customer": data.get("customer", ""),
            "message": data.get("message", ""),
            "sentiment": data.get("sentiment", "Neutral"),
            "ai_recommendation": data.get("aiRecommendation", data.get("ai_recommendation", "")),
            "escalated": bool(data.get("escalated", False)),
            "escalation_history": data.get("escalation_history", []),
            "assigned_to_user_id": data.get("assigned_to_user_id"),
            "assigned_to_team_id": data.get("assigned_to_team_id"),
            "assigned_to_department_id": data.get("assigned_to_department_id"),
            "assigned_to_label": data.get("assigned_to_label"),
            "resolved_at": data.get("resolved_at"),
            "reopened_at": data.get("reopened_at"),
            "created_at": record.created_at,
            "updated_at": record.updated_at,
        }

    def list_tickets(
        self,
        current_user,
        status: Optional[str] = None,
        category: Optional[str] = None,
        open_only: bool = False,
    ) -> List[dict]:
        records = self.repo.list(current_user.organization_id, "support")
        tickets = [self.serialize_ticket(r) for r in records]
        if open_only:
            tickets = [t for t in tickets if t["status"] in {"New", "In Progress"}]
        if status:
            tickets = [t for t in tickets if t["status"] == status]
        if category:
            tickets = [t for t in tickets if t["category"] == category]
        return filter_support_tickets(current_user, tickets, self._team_member_ids(current_user))

    def get_ticket(self, current_user, ticket_id: int) -> Optional[dict]:
        record = self.repo.get(current_user.organization_id, "support", ticket_id)
        if not record:
            return None
        ticket = self.serialize_ticket(record)
        try:
            self._ensure_ticket_access(current_user, ticket)
        except PermissionError:
            return None
        return ticket

    def create_ticket(self, current_user, payload: dict) -> dict:
        message = payload["message"]
        title = payload["title"]
        category = self.categorize(title, message, payload.get("category"))
        sentiment = self.analyze_sentiment(message)
        priority = payload.get("priority", "medium")
        if priority not in SUPPORT_PRIORITIES:
            priority = "medium"
        if sentiment == "Negative" and priority == "medium":
            priority = "high"

        recommendation = self._build_recommendation(current_user, title, message, category)
        escalated = sentiment == "Negative" and priority in {"high", "urgent"}
        escalation_history = []
        if escalated:
            escalation_history.append({
                "at": self._now_iso(),
                "by_user_id": current_user.id,
                "reason": "Auto-escalated: negative sentiment with high priority",
            })

        record = self.repo.create(
            current_user.organization_id,
            current_user.id,
            "support",
            {
                "title": title,
                "status": payload.get("status", "New"),
                "record_type": "ticket",
                "data": {
                    "customer": payload["customer"],
                    "category": category,
                    "priority": priority,
                    "message": message,
                    "sentiment": sentiment,
                    "aiRecommendation": recommendation,
                    "escalated": escalated,
                    "escalation_history": escalation_history,
                    "assigned_to_user_id": None,
                    "assigned_to_team_id": None,
                    "assigned_to_department_id": None,
                    "assigned_to_label": None,
                    "resolved_at": None,
                    "reopened_at": None,
                },
            },
        )
        data = json.loads(record.data_json or "{}")
        data["ticket_number"] = f"TCK-{record.id}"
        record.data_json = json.dumps(data)
        self.db.commit()
        self.db.refresh(record)
        return self.serialize_ticket(record)

    def update_ticket(self, current_user, ticket_id: int, payload: dict) -> Optional[dict]:
        record = self.repo.get(current_user.organization_id, "support", ticket_id)
        if not record:
            return None
        ticket = self.serialize_ticket(record)
        try:
            self._ensure_ticket_manage(current_user, ticket)
        except PermissionError:
            return None
        data = json.loads(record.data_json or "{}")
        if payload.get("title") is not None:
            record.title = payload["title"]
        if payload.get("status") is not None:
            record.status = payload["status"]
            if payload["status"] == "Resolved" and not data.get("resolved_at"):
                data["resolved_at"] = self._now_iso()
        if payload.get("priority") is not None:
            data["priority"] = payload["priority"]
        if payload.get("category") is not None:
            data["category"] = payload["category"]
        if payload.get("message") is not None:
            data["message"] = payload["message"]
            data["sentiment"] = self.analyze_sentiment(payload["message"])
        if payload.get("customer") is not None:
            data["customer"] = payload["customer"]
        record.data_json = json.dumps(data)
        self.db.commit()
        self.db.refresh(record)
        return self.serialize_ticket(record)

    def assign_ticket(self, current_user, ticket_id: int, assignment: dict) -> Optional[dict]:
        record = self.repo.get(current_user.organization_id, "support", ticket_id)
        if not record:
            return None
        ticket = self.serialize_ticket(record)
        try:
            self._ensure_ticket_manage(current_user, ticket)
        except PermissionError as exc:
            raise ValueError(str(exc)) from exc
        data = json.loads(record.data_json or "{}")
        label_parts = []

        user_id = assignment.get("user_id")
        team_id = assignment.get("team_id")
        department_id = assignment.get("department_id")

        if user_id:
            user = self.users.get_by_id(user_id)
            if not user or user.organization_id != current_user.organization_id:
                raise ValueError("Assigned user not found in organization")
            data["assigned_to_user_id"] = user_id
            label_parts.append(f"{user.first_name} {user.last_name or ''}".strip())
        else:
            data["assigned_to_user_id"] = None

        if team_id:
            team = self.teams.get_by_id(team_id)
            if not team or team.organization_id != current_user.organization_id:
                raise ValueError("Assigned team not found")
            data["assigned_to_team_id"] = team_id
            label_parts.append(team.name)
        else:
            data["assigned_to_team_id"] = None

        if department_id:
            dept = self.departments.get_by_id(department_id, current_user.organization_id)
            if not dept:
                raise ValueError("Assigned department not found")
            data["assigned_to_department_id"] = department_id
            label_parts.append(dept.name)
        else:
            data["assigned_to_department_id"] = None

        data["assigned_to_label"] = ", ".join(label_parts) if label_parts else None
        if record.status == "New":
            record.status = "In Progress"
        record.data_json = json.dumps(data)
        self.db.commit()
        self.db.refresh(record)
        return self.serialize_ticket(record)

    def escalate_ticket(self, current_user, ticket_id: int, reason: str) -> Optional[dict]:
        record = self.repo.get(current_user.organization_id, "support", ticket_id)
        if not record:
            return None
        ticket = self.serialize_ticket(record)
        try:
            self._ensure_ticket_manage(current_user, ticket)
        except PermissionError:
            return None
        data = json.loads(record.data_json or "{}")
        history = data.get("escalation_history", [])
        history.append({
            "at": self._now_iso(),
            "by_user_id": current_user.id,
            "reason": reason,
        })
        data["escalation_history"] = history
        data["escalated"] = True
        if record.status == "New":
            record.status = "In Progress"
        record.data_json = json.dumps(data)
        self.db.commit()
        self.db.refresh(record)
        return self.serialize_ticket(record)

    def close_ticket(self, current_user, ticket_id: int) -> Optional[dict]:
        record = self.repo.get(current_user.organization_id, "support", ticket_id)
        if not record:
            return None
        ticket = self.serialize_ticket(record)
        try:
            self._ensure_ticket_manage(current_user, ticket)
        except PermissionError:
            return None
        data = json.loads(record.data_json or "{}")
        record.status = "Closed"
        if not data.get("resolved_at"):
            data["resolved_at"] = self._now_iso()
        record.data_json = json.dumps(data)
        self.db.commit()
        self.db.refresh(record)
        return self.serialize_ticket(record)

    def reopen_ticket(self, current_user, ticket_id: int) -> Optional[dict]:
        record = self.repo.get(current_user.organization_id, "support", ticket_id)
        if not record:
            return None
        ticket = self.serialize_ticket(record)
        try:
            self._ensure_ticket_manage(current_user, ticket)
        except PermissionError:
            return None
        data = json.loads(record.data_json or "{}")
        record.status = "In Progress"
        data["reopened_at"] = self._now_iso()
        data["resolved_at"] = None
        record.data_json = json.dumps(data)
        self.db.commit()
        self.db.refresh(record)
        return self.serialize_ticket(record)

    def regenerate_recommendation(self, current_user, ticket_id: int) -> Optional[dict]:
        record = self.repo.get(current_user.organization_id, "support", ticket_id)
        if not record:
            return None
        ticket = self.serialize_ticket(record)
        try:
            self._ensure_ticket_access(current_user, ticket)
        except PermissionError:
            return None
        data = json.loads(record.data_json or "{}")
        recommendation = self._build_recommendation(
            current_user,
            record.title,
            data.get("message", ""),
            data.get("category", "General Questions"),
        )
        data["aiRecommendation"] = recommendation
        record.data_json = json.dumps(data)
        self.db.commit()
        self.db.refresh(record)
        return self.serialize_ticket(record)

    def get_metrics(self, current_user) -> dict:
        tickets = self.list_tickets(current_user)
        total = len(tickets)
        open_count = sum(1 for t in tickets if t["status"] in {"New", "In Progress"})
        resolved = sum(1 for t in tickets if t["status"] == "Resolved")
        closed = sum(1 for t in tickets if t["status"] == "Closed")
        escalated = sum(1 for t in tickets if t["escalated"])
        resolution_rate = round(((resolved + closed) / total) * 100, 1) if total else 0.0
        escalation_rate = round((escalated / total) * 100, 1) if total else 0.0

        categories = Counter(t["category"] for t in tickets)
        sentiments = Counter(t["sentiment"] for t in tickets)
        priorities = Counter(t["priority"] for t in tickets)

        resolution_hours = []
        for t in tickets:
            if t.get("resolved_at") and t.get("created_at"):
                try:
                    resolved_at = datetime.fromisoformat(t["resolved_at"].replace("Z", "+00:00"))
                    created = t["created_at"]
                    if created.tzinfo is None:
                        created = created.replace(tzinfo=timezone.utc)
                    hours = (resolved_at - created).total_seconds() / 3600
                    if hours >= 0:
                        resolution_hours.append(hours)
                except (ValueError, TypeError):
                    pass

        avg_hours = round(sum(resolution_hours) / len(resolution_hours), 1) if resolution_hours else None

        return {
            "total_tickets": total,
            "open_tickets": open_count,
            "resolved_tickets": resolved,
            "closed_tickets": closed,
            "resolution_rate": resolution_rate,
            "escalation_rate": escalation_rate,
            "average_resolution_hours": avg_hours,
            "category_distribution": dict(categories),
            "sentiment_distribution": dict(sentiments),
            "priority_distribution": dict(priorities),
        }

    @staticmethod
    def to_operations_format(ticket: dict) -> dict:
        return {
            "id": ticket["id"],
            "organization_id": ticket["organization_id"],
            "created_by_user_id": ticket["created_by_user_id"],
            "module": "support",
            "record_type": "ticket",
            "title": ticket["title"],
            "status": ticket["status"],
            "data": {
                "customer": ticket["customer"],
                "category": ticket["category"],
                "priority": ticket["priority"],
                "message": ticket["message"],
                "sentiment": ticket["sentiment"],
                "aiRecommendation": ticket["ai_recommendation"],
                "escalated": ticket["escalated"],
                "escalation_history": ticket["escalation_history"],
                "ticket_number": ticket["ticket_number"],
                "assigned_to_label": ticket["assigned_to_label"],
            },
            "created_at": ticket["created_at"],
            "updated_at": ticket["updated_at"],
        }

    def create_from_operations(self, current_user, data: dict) -> dict:
        payload = {
            "title": data["title"],
            "customer": data["data"].get("customer", "unknown@example.com"),
            "message": data["data"].get("message", ""),
            "category": data["data"].get("category"),
            "priority": data["data"].get("priority", "medium"),
            "status": data.get("status", "New"),
        }
        ticket = self.create_ticket(current_user, payload)
        return self.to_operations_format(ticket)

    def list_open_summary(self, current_user) -> str:
        tickets = self.list_tickets(current_user, open_only=True)
        if not tickets:
            return "There are no open support tickets right now."
        lines = [f"- {t['ticket_number']}: {t['title']} ({t['status']}, {t['category']})" for t in tickets[:15]]
        return f"You have {len(tickets)} open ticket(s):\n" + "\n".join(lines)
