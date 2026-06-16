import json
import re
import time
from typing import Any, Dict, Optional, Tuple

from sqlalchemy.orm import Session

from app.clients.groq_client import GroqClient
from app.core.dependencies import (
    KNOWLEDGE_ASK_PERMISSION,
    MANAGER_ROLE,
    ORG_ADMIN_ROLE,
    SUPER_ADMIN_ROLE,
)
from app.repositories.ai_employee_repository import AIEmployeeRepository
from app.repositories.operational_record_repository import OperationalRecordRepository
from app.repositories.user_repository import UserRepository
from app.repositories.voice_repository import VoiceRepository
from app.repositories.workflow_repository import WorkflowRepository
from app.schemas.workflow import WORKFLOW_TEMPLATES
from app.services.ai_employee_service import AIEmployeeService
from app.services.browser_service import BrowserService
from app.services.collaboration_service import CollaborationService
from app.services.rag_service import RAGService
from app.services.research_service import ResearchService
from app.services.support_service import SupportService
from app.services.omnichannel_service import OmnichannelService
from app.services.workflow_service import WorkflowService
from app.utils.rbac_scope import (
    assert_can_view_user_owned_record,
    can_view_user_owned_record,
    resolve_team_member_ids,
)


VOICE_INTENTS = [
    "knowledge_question",
    "hr_request",
    "support_create",
    "support_list_open",
    "support_request",
    "omnichannel_inbox",
    "research_request",
    "browser_task",
    "workflow_command",
    "collaboration_task",
    "meeting_support",
]

ASSISTANT_ROLE_MAP = {
    "HR Assistant": "hr_request",
    "Support Assistant": "support_request",
    "Research Assistant": "research_request",
    "Documentation Assistant": "knowledge_question",
    "Sales Assistant": "knowledge_question",
}

MODULE_BY_INTENT = {
    "knowledge_question": "knowledge",
    "hr_request": "ai-employees",
    "support_create": "support",
    "support_list_open": "support",
    "support_request": "support",
    "omnichannel_inbox": "omnichannel",
    "research_request": "research",
    "browser_task": "browser-automation",
    "workflow_command": "workflows",
    "collaboration_task": "collaboration",
    "meeting_support": "voice",
}


class VoiceService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = VoiceRepository(db)
        self.op_repo = OperationalRecordRepository(db)
        self.ai_repo = AIEmployeeRepository(db)
        self.workflow_repo = WorkflowRepository(db)
        self.groq = GroqClient()
        self.rag = RAGService(db)
        self.ai_employees = AIEmployeeService(db)
        self.collaboration = CollaborationService(db)
        self.workflows = WorkflowService(db)
        self.research = ResearchService(db)
        self.browser = BrowserService(db)

    def _team_member_ids(self, current_user):
        users = UserRepository(self.db).list_by_organization(current_user.organization_id)
        return resolve_team_member_ids(users, current_user)

    def _scoped_user_ids(self, current_user):
        role_name = current_user.role.name if current_user.role else None
        if role_name in {SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE}:
            return None
        if role_name == MANAGER_ROLE:
            return self._team_member_ids(current_user)
        return {current_user.id}

    def _assert_session_access(self, current_user, session) -> None:
        assert_can_view_user_owned_record(
            current_user,
            session.user_id,
            self._team_member_ids(current_user),
        )

    def _user_permissions(self, current_user) -> set:
        role_name = getattr(getattr(current_user, "role", None), "name", None)
        if role_name == "SUPER_ADMIN":
            return {KNOWLEDGE_ASK_PERMISSION}
        return {
            permission.name
            for permission in getattr(getattr(current_user, "role", None), "permissions", [])
        }

    def _assert_knowledge_access(self, current_user):
        if KNOWLEDGE_ASK_PERMISSION not in self._user_permissions(current_user):
            raise PermissionError("KNOWLEDGE_ASK permission required for knowledge voice queries")

    @staticmethod
    def detect_intent(
        transcript: str,
        employee_id: Optional[int] = None,
        assistant_role: Optional[str] = None,
        assistant_preference: Optional[str] = None,
    ) -> str:
        text = transcript.lower().strip()

        if any(k in text for k in [
            "create support ticket", "open a support ticket", "new support ticket",
            "create a ticket", "log a support ticket",
        ]):
            return "support_create"

        if any(k in text for k in [
            "show open tickets", "open tickets", "list open tickets", "list tickets",
        ]):
            return "support_list_open"

        if any(k in text for k in [
            "omnichannel inbox", "unified inbox", "show inbox", "list conversations",
            "open conversations", "communication center",
        ]):
            return "omnichannel_inbox"

        if assistant_role and assistant_role in ASSISTANT_ROLE_MAP:
            return ASSISTANT_ROLE_MAP[assistant_role]
        if assistant_preference and assistant_preference in ASSISTANT_ROLE_MAP:
            return ASSISTANT_ROLE_MAP[assistant_preference]

        if any(k in text for k in [
            "meeting notes", "meeting summary", "action items", "summarize meeting",
            "meeting support", "follow-up from meeting", "follow up from meeting",
        ]):
            return "meeting_support"

        if any(k in text for k in [
            "start workflow", "start onboarding", "onboarding workflow", "begin workflow",
            "run workflow", "leave approval workflow", "refund workflow",
        ]):
            return "workflow_command"

        if any(k in text for k in [
            "run collaboration", "collaboration task", "multi-agent", "agent collaboration",
            "research collaboration", "collaborate on",
        ]):
            return "collaboration_task"

        if any(k in text for k in [
            "find react", "find jobs", "job search", "browser automation", "scrape",
            "extract from website", "browse ", "search jobs",
        ]):
            return "browser_task"

        if any(k in text for k in [
            "analyze ai market", "competitor report", "market analysis", "analyze the",
            "competitor analysis", "research report", "business research",
        ]) or (text.startswith("research ") or " analyze " in f" {text} "):
            return "research_request"

        if any(k in text for k in [
            "support ticket", "summarize today's support", "support tickets",
            "customer support", "ticket summary", "today's tickets",
        ]):
            return "support_request"

        if any(k in text for k in ["ask hr", "hr assistant", "hr about", "benefits question"]):
            return "hr_request"

        if employee_id:
            return "hr_request"

        return "knowledge_question"

    def _find_employee_by_role(self, organization_id: int, role: str, employee_id: Optional[int] = None):
        if employee_id:
            employee = self.ai_repo.get(organization_id, employee_id)
            if employee and employee.is_active:
                return employee
        employees = self.ai_repo.list(organization_id)
        for employee in employees:
            if employee.is_active and employee.role == role:
                return employee
        return None

    def _role_for_intent(self, intent: str) -> Optional[str]:
        return {
            "hr_request": "HR Assistant",
            "support_request": "Support Assistant",
            "research_request": "Research Assistant",
            "knowledge_question": "Documentation Assistant",
        }.get(intent)

    def _reason(self, prompt: str, fallback: str) -> str:
        try:
            response = self.groq.generate(prompt)
            return response.get("output", {}).get("text", fallback)
        except Exception:
            return fallback

    def _route_knowledge(self, current_user, transcript: str, top_k: int) -> Tuple[str, Dict[str, Any]]:
        self._assert_knowledge_access(current_user)
        query, _ = self.rag.ask(current_user, transcript, top_k)
        return query.answer_text, {"query_id": query.id}

    def _route_employee(
        self, current_user, transcript: str, role: str, employee_id: Optional[int] = None
    ) -> Tuple[str, Dict[str, Any]]:
        employee = self._find_employee_by_role(current_user.organization_id, role, employee_id)
        if not employee:
            raise ValueError(f"No active {role} found. Create one in AI Employee Studio.")
        result = self.ai_employees.run(current_user, employee.id, transcript)
        if not result:
            raise ValueError(f"{role} could not process the request.")
        return result["output"], {
            "employee_id": employee.id,
            "employee_name": employee.name,
            "tools_used": result.get("tools_used", []),
        }

    def _route_support_create(self, current_user, transcript: str) -> Tuple[str, Dict[str, Any]]:
        support = SupportService(self.db)
        parsed = self._reason(
            "Extract a support ticket from this voice command. "
            "Reply with JSON only: {\"title\": \"...\", \"customer\": \"email or voice-customer@org.local\", "
            f"\"message\": \"...\"}}\nCommand: {transcript}",
            json.dumps({
                "title": transcript[:80] or "Voice support request",
                "customer": "voice-customer@org.local",
                "message": transcript,
            }),
        )
        try:
            match = re.search(r"\{.*\}", parsed, re.DOTALL)
            fields = json.loads(match.group(0) if match else parsed)
        except (json.JSONDecodeError, AttributeError):
            fields = {
                "title": transcript[:80] or "Voice support request",
                "customer": "voice-customer@org.local",
                "message": transcript,
            }
        ticket = support.create_ticket(current_user, {
            "title": fields.get("title") or "Voice support request",
            "customer": fields.get("customer") or "voice-customer@org.local",
            "message": fields.get("message") or transcript,
        })
        return (
            f"Created support ticket {ticket['ticket_number']}: {ticket['title']}. "
            f"Category: {ticket['category']}. Sentiment: {ticket['sentiment']}.",
            {"ticket_id": ticket["id"], "ticket_number": ticket["ticket_number"]},
        )

    def _route_support_list_open(self, current_user, transcript: str) -> Tuple[str, Dict[str, Any]]:
        support = SupportService(self.db)
        summary = support.list_open_summary(current_user)
        open_tickets = support.list_tickets(current_user, open_only=True)
        return summary, {"ticket_count": len(open_tickets)}

    def _route_omnichannel_inbox(self, current_user, transcript: str) -> Tuple[str, Dict[str, Any]]:
        omnichannel = OmnichannelService(self.db)
        summary = omnichannel.list_inbox_summary(current_user)
        convs = omnichannel.list_conversations(current_user)
        return summary, {"conversation_count": len(convs)}

    def _route_support(self, current_user, transcript: str) -> Tuple[str, Dict[str, Any]]:
        support = SupportService(self.db)
        tickets = support.list_tickets(current_user)
        if not tickets:
            employee = self._find_employee_by_role(
                current_user.organization_id, "Support Assistant"
            )
            if employee:
                return self._route_employee(current_user, transcript, "Support Assistant", employee.id)
            return (
                "There are no support tickets recorded for your organization today.",
                {"ticket_count": 0},
            )

        ticket_lines = []
        for item in tickets[:25]:
            ticket_lines.append(
                f"- [{item['status']}] {item['ticket_number']}: {item['title']} | "
                f"{item.get('customer', 'unknown')} | {item.get('category', 'General')}: "
                f"{item.get('message', '')[:200]}"
            )
        prompt = (
            f"{transcript}\n\nSupport ticket data:\n" + "\n".join(ticket_lines) +
            "\n\nProvide a concise spoken summary for a voice assistant."
        )
        answer = self._reason(prompt, "Support ticket summary is unavailable right now.")
        return answer, {"ticket_count": len(tickets)}

    def _route_research(self, current_user, transcript: str) -> Tuple[str, Dict[str, Any]]:
        report = self.research.run_research(
            current_user, transcript, research_type="Business Intelligence"
        )
        summary = report.get("summary") or report.get("final_report", "")[:1500]
        return summary, {"report_id": report.get("id"), "title": report.get("title")}

    def _route_browser(self, current_user, transcript: str) -> Tuple[str, Dict[str, Any]]:
        task_type = "job_search" if "job" in transcript.lower() else "general"
        task = self.browser.run_task(current_user, transcript, task_type=task_type)
        answer = task.get("summary") or task.get("report_text") or (
            f"Browser task completed with {len(task.get('results') or [])} records extracted."
        )
        return answer[:2000], {"task_id": task.get("id"), "status": task.get("status")}

    def _match_workflow_category(self, transcript: str) -> Optional[str]:
        text = transcript.lower()
        if "onboarding" in text:
            return "Employee Onboarding"
        if "leave" in text:
            return "Leave Approval"
        if "refund" in text:
            return "Refund Processing"
        if "complaint" in text:
            return "Customer Complaint"
        if "vendor" in text:
            return "Vendor Approval"
        if "document review" in text:
            return "Document Review"
        return "Employee Onboarding"

    def _route_workflow(self, current_user, transcript: str) -> Tuple[str, Dict[str, Any]]:
        category = self._match_workflow_category(transcript)
        workflows = self.workflow_repo.list_workflows(current_user.organization_id)
        workflow = next(
            (
                wf for wf in workflows
                if wf.status == "active" and (
                    wf.category == category or category.lower() in (wf.name or "").lower()
                )
            ),
            None,
        )
        if not workflow:
            workflow = next((wf for wf in workflows if wf.status == "active"), None)
        if not workflow:
            template = WORKFLOW_TEMPLATES.get(category)
            if not template:
                raise ValueError("No active workflow found. Create a workflow in Workflow Automation first.")
            try:
                created = self.workflows.create_workflow(
                    current_user,
                    {
                        "name": category,
                        "description": template["description"],
                        "category": category,
                        "status": "active",
                        "steps": template["steps"],
                    },
                )
                workflow = self.workflow_repo.get_workflow(
                    current_user.organization_id, created["id"]
                )
            except PermissionError:
                raise ValueError(
                    f"No active workflow for {category}. Ask an admin to activate or create one."
                ) from None

        title = re.sub(r"^(start|run|begin)\s+(the\s+)?", "", transcript, flags=re.I).strip()[:200]
        if not title:
            title = f"Voice-triggered {category}"
        instance = self.workflows.start_instance(current_user, workflow.id, title)
        if not instance:
            raise ValueError("Unable to start workflow instance.")
        return (
            f"Started workflow '{instance['title']}'. Current status: {instance['status']} "
            f"at {instance.get('progress_percent', 0)}% progress.",
            {"workflow_id": workflow.id, "instance_id": instance["id"]},
        )

    def _route_collaboration(self, current_user, transcript: str) -> Tuple[str, Dict[str, Any]]:
        teams = self.collaboration.list_teams(current_user)
        if not teams:
            raise ValueError("No collaboration teams found. Create a team in Multi-Agent Collaboration first.")
        team_id = teams[0]["id"]
        result = self.collaboration.run_collaboration(current_user, team_id, transcript)
        if not result:
            raise ValueError("Collaboration run failed.")
        output = result.get("final_output") or "Collaboration completed."
        return output[:2000], {
            "team_id": team_id,
            "run_id": result.get("id"),
            "status": result.get("status"),
        }

    def _route_meeting(self, current_user, transcript: str) -> Tuple[str, Dict[str, Any]]:
        meeting = self.create_meeting(
            current_user,
            {"notes": transcript, "title": transcript[:80]},
            session_id=None,
        )
        return (
            meeting["summary"],
            {
                "meeting_id": meeting["id"],
                "action_items": meeting.get("action_items", []),
            },
        )

    def process_query(
        self,
        current_user,
        transcript: str,
        session_id: Optional[int] = None,
        employee_id: Optional[int] = None,
        assistant_role: Optional[str] = None,
        top_k: int = 5,
    ) -> dict:
        start = time.perf_counter()
        session = None
        if session_id:
            session = self.repo.get_session(current_user.organization_id, session_id)
            if not session:
                raise ValueError("Voice session not found")
            self._assert_session_access(current_user, session)

        assistant_preference = session.assistant_preference if session else None
        intent = self.detect_intent(transcript, employee_id, assistant_role, assistant_preference)
        module_invoked = MODULE_BY_INTENT[intent]
        assistant_used = None
        metadata: Dict[str, Any] = {}

        try:
            if intent == "knowledge_question":
                answer, metadata = self._route_knowledge(current_user, transcript, top_k)
                assistant_used = "Documentation Assistant"
            elif intent == "hr_request":
                answer, metadata = self._route_employee(
                    current_user, transcript, "HR Assistant", employee_id
                )
                assistant_used = metadata.get("employee_name") or "HR Assistant"
            elif intent == "support_create":
                answer, metadata = self._route_support_create(current_user, transcript)
                assistant_used = "Support Assistant"
            elif intent == "support_list_open":
                answer, metadata = self._route_support_list_open(current_user, transcript)
                assistant_used = "Support Assistant"
            elif intent == "support_request":
                answer, metadata = self._route_support(current_user, transcript)
                assistant_used = "Support Assistant"
            elif intent == "omnichannel_inbox":
                answer, metadata = self._route_omnichannel_inbox(current_user, transcript)
                assistant_used = "Omnichannel Assistant"
            elif intent == "research_request":
                answer, metadata = self._route_research(current_user, transcript)
                assistant_used = "Research Assistant"
            elif intent == "browser_task":
                answer, metadata = self._route_browser(current_user, transcript)
                assistant_used = "Browser Automation"
            elif intent == "workflow_command":
                answer, metadata = self._route_workflow(current_user, transcript)
                assistant_used = "Workflow Automation"
            elif intent == "collaboration_task":
                answer, metadata = self._route_collaboration(current_user, transcript)
                assistant_used = "Multi-Agent Collaboration"
            elif intent == "meeting_support":
                answer, metadata = self._route_meeting(current_user, transcript)
                assistant_used = "Meeting Copilot"
            else:
                answer, metadata = self._route_knowledge(current_user, transcript, top_k)
                intent = "knowledge_question"
                assistant_used = "Documentation Assistant"
        except PermissionError:
            raise
        except ValueError as exc:
            answer = str(exc)
            metadata = {"error": str(exc)}
        except Exception as exc:
            answer = self._reason(
                f"Answer this voice assistant request concisely: {transcript}",
                "I could not process that voice request right now. Please try again.",
            )
            metadata = {"error": str(exc)}

        duration_ms = int((time.perf_counter() - start) * 1000)
        record = self.repo.create_interaction(
            current_user.organization_id,
            current_user.id,
            {
                "title": transcript[:255],
                "record_type": "interaction",
                "status": "completed",
                "data": {
                    "session_id": session_id,
                    "transcript": transcript,
                    "answer": answer,
                    "intent": intent,
                    "module_invoked": module_invoked,
                    "assistant_used": assistant_used,
                    "duration_ms": duration_ms,
                    "metadata": metadata,
                },
            },
        )
        serialized = self.repo.serialize_interaction(record)
        return {
            **serialized,
            "answer": answer,
            "intent": intent,
            "module_invoked": module_invoked,
            "assistant_used": assistant_used,
            "duration_ms": duration_ms,
        }

    def create_session(self, current_user, assistant_preference: Optional[str] = None) -> dict:
        session = self.repo.create_session(
            current_user.organization_id,
            current_user.id,
            assistant_preference,
        )
        return self.repo.serialize_session(session, 0)

    def close_session(self, current_user, session_id: int) -> dict:
        session = self.repo.get_session(current_user.organization_id, session_id)
        if not session:
            raise ValueError("Voice session not found")
        self._assert_session_access(current_user, session)
        if session.status == "closed":
            return self.repo.serialize_session(
                session,
                self.repo.count_interactions_for_session(current_user.organization_id, session_id),
            )
        closed = self.repo.close_session(session)
        count = self.repo.count_interactions_for_session(current_user.organization_id, session_id)
        return self.repo.serialize_session(closed, count)

    def list_sessions(self, current_user, limit: int = 50) -> list:
        org_id = current_user.organization_id
        scoped_ids = self._scoped_user_ids(current_user)
        if scoped_ids is None:
            sessions = self.repo.list_sessions(org_id, user_id=None, limit=limit)
        elif len(scoped_ids) == 1 and current_user.id in scoped_ids:
            sessions = self.repo.list_sessions(org_id, user_id=current_user.id, limit=limit)
        else:
            sessions = [
                session
                for session in self.repo.list_sessions(org_id, user_id=None, limit=limit * 5)
                if session.user_id in scoped_ids
            ][:limit]
        session_ids = [session.id for session in sessions]
        interaction_counts = self.repo.count_interactions_for_sessions(org_id, session_ids)
        return [
            self.repo.serialize_session(
                session,
                interaction_counts.get(session.id, 0),
            )
            for session in sessions
        ]

    def get_session(self, current_user, session_id: int) -> dict:
        session = self.repo.get_session(current_user.organization_id, session_id)
        if not session:
            raise ValueError("Voice session not found")
        self._assert_session_access(current_user, session)
        interactions = [
            self.repo.serialize_interaction(record)
            for record in self.repo.list_interactions(
                current_user.organization_id, session_id=session_id, limit=100
            )
        ]
        payload = self.repo.serialize_session(session, len(interactions))
        payload["interactions"] = interactions
        return payload

    def list_interactions(self, current_user, limit: int = 100) -> list:
        scoped_ids = self._scoped_user_ids(current_user)
        records = self.repo.list_interactions(current_user.organization_id, limit=limit * 3 if scoped_ids else limit)
        if scoped_ids is not None:
            records = [
                record
                for record in records
                if can_view_user_owned_record(
                    current_user,
                    record.created_by_user_id,
                    scoped_ids,
                )
            ][:limit]
        else:
            records = records[:limit]
        return [
            self.repo.serialize_interaction(record)
            for record in records
        ]

    def create_meeting(self, current_user, payload: dict, session_id: Optional[int] = None) -> dict:
        notes = payload["notes"]
        title = payload.get("title") or notes[:80]
        sid = payload.get("session_id", session_id)

        summary_prompt = (
            "Summarize these meeting notes in 3-5 concise sentences for a voice assistant:\n"
            f"{notes}"
        )
        actions_prompt = (
            "Extract a bullet list of action items from these meeting notes. "
            "Return one item per line without numbering:\n"
            f"{notes}"
        )
        followup_prompt = (
            "Suggest follow-up recommendations after this meeting in 2-3 sentences:\n"
            f"{notes}"
        )

        summary = self._reason(summary_prompt, "Meeting summary unavailable.")
        actions_raw = self._reason(actions_prompt, "")
        follow_up = self._reason(followup_prompt, "Review action items and schedule follow-ups.")

        action_items = [
            line.strip("-• ").strip()
            for line in actions_raw.splitlines()
            if line.strip()
        ][:12]

        record = self.repo.create_interaction(
            current_user.organization_id,
            current_user.id,
            {
                "title": title[:255],
                "record_type": "meeting",
                "status": "completed",
                "data": {
                    "session_id": sid,
                    "notes": notes,
                    "summary": summary,
                    "action_items": action_items,
                    "follow_up_recommendations": follow_up,
                },
            },
        )
        return self.repo.serialize_meeting(record)

    def list_meetings(self, current_user, limit: int = 50) -> list:
        scoped_ids = self._scoped_user_ids(current_user)
        records = self.repo.list_meetings(current_user.organization_id, limit * 3 if scoped_ids else limit)
        if scoped_ids is not None:
            records = [
                record
                for record in records
                if can_view_user_owned_record(
                    current_user,
                    record.created_by_user_id,
                    scoped_ids,
                )
            ][:limit]
        else:
            records = records[:limit]
        return [
            self.repo.serialize_meeting(record)
            for record in records
        ]

    def get_analytics(self, current_user) -> dict:
        return self.repo.analytics(
            current_user.organization_id,
            user_ids=self._scoped_user_ids(current_user),
        )

    # Backward-compatible wrapper used by OperationsService
    def voice_query(self, current_user, transcript: str, top_k: int = 5) -> dict:
        result = self.process_query(current_user, transcript, top_k=top_k)
        return {
            "id": result["id"],
            "organization_id": current_user.organization_id,
            "created_by_user_id": current_user.id,
            "module": "voice",
            "record_type": "interaction",
            "title": transcript[:255],
            "status": "completed",
            "data": {
                "transcript": transcript,
                "answer": result["answer"],
                "intent": result.get("intent"),
                "module_invoked": result.get("module_invoked"),
                "assistant_used": result.get("assistant_used"),
                "session_id": result.get("session_id"),
                "duration_ms": result.get("duration_ms"),
                "metadata": result.get("metadata", {}),
            },
            "created_at": result.get("created_at"),
            "updated_at": result.get("created_at"),
        }
