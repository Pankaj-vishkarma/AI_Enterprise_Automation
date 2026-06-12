import json
from typing import Dict, List

from sqlalchemy.orm import Session

from app.clients.groq_client import GroqClient
from app.repositories.operational_record_repository import OperationalRecordRepository
from app.services.ai_employee_service import AIEmployeeService
from app.services.rag_service import RAGService
from app.services.research_service import ResearchService
from app.services.browser_service import BrowserService
from app.services.voice_service import VoiceService
from app.services.support_service import SupportService
from app.services.omnichannel_service import OmnichannelService
from app.services.analytics_service import AnalyticsService


MODULES = {
    "ai-employees",
    "collaboration",
    "workflows",
    "research",
    "browser-automation",
    "voice",
    "support",
    "omnichannel",
}


class OperationsService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = OperationalRecordRepository(db)

    def _validate_module(self, module: str):
        if module not in MODULES:
            raise ValueError("Unsupported operations module")

    def list(self, current_user, module: str):
        self._validate_module(module)
        if module == "ai-employees":
            return AIEmployeeService(self.db).list(current_user)
        if module == "omnichannel":
            return OmnichannelService(self.db).list_for_operations(current_user)
        return [self.repo.serialize(item) for item in self.repo.list(current_user.organization_id, module)]

    def create(self, current_user, module: str, payload):
        self._validate_module(module)
        data = payload.model_dump()
        if module == "ai-employees":
            return AIEmployeeService(self.db).create(current_user, data)
        if module == "support":
            return SupportService(self.db).create_from_operations(current_user, data)
        if module == "omnichannel":
            return OmnichannelService(self.db).create_from_operations(current_user, data)
        record = self.repo.create(current_user.organization_id, current_user.id, module, data)
        return self.repo.serialize(record)

    def update(self, current_user, module: str, record_id: int, payload):
        self._validate_module(module)
        if module == "ai-employees":
            return AIEmployeeService(self.db).update(current_user, record_id, payload.model_dump(exclude_unset=True))
        if module == "support":
            svc = SupportService(self.db)
            payload_dict = payload.model_dump(exclude_unset=True)
            if payload_dict.get("data", {}).get("escalated"):
                ticket = svc.escalate_ticket(
                    current_user, record_id, "Escalated via operations API"
                )
                if not ticket:
                    return None
                return svc.to_operations_format(ticket)
            update_payload = {}
            if payload_dict.get("title") is not None:
                update_payload["title"] = payload_dict["title"]
            if payload_dict.get("status") is not None:
                update_payload["status"] = payload_dict["status"]
            if payload_dict.get("data"):
                for key in ("message", "customer", "category", "priority"):
                    if key in payload_dict["data"]:
                        update_payload[key] = payload_dict["data"][key]
            ticket = svc.update_ticket(current_user, record_id, update_payload)
            if not ticket:
                return None
            return svc.to_operations_format(ticket)
        if module == "omnichannel":
            result = OmnichannelService(self.db).update_from_operations(
                current_user, record_id, payload.model_dump(exclude_unset=True)
            )
            return result
        record = self.repo.get(current_user.organization_id, module, record_id)
        if not record:
            return None
        return self.repo.serialize(self.repo.update(record, payload.model_dump(exclude_unset=True)))

    @staticmethod
    def _sentiment(text: str) -> str:
        lowered = text.lower()
        negative = {"bad", "fail", "error", "broken", "angry", "refund", "late"}
        positive = {"love", "great", "helpful", "thanks", "excellent"}
        if any(word in lowered for word in negative):
            return "Negative"
        if any(word in lowered for word in positive):
            return "Positive"
        return "Neutral"

    def _support_recommendation(self, title: str, message: str) -> str:
        prompt = (
            "Write a concise, empathetic customer support response. Do not invent actions already "
            f"taken. Ticket: {title}\nCustomer message: {message}"
        )
        return self._reason(prompt, "Thank you for contacting support. We have reviewed your request and a support specialist will follow up with the next steps.")

    @staticmethod
    def _reason(prompt: str, fallback: str) -> str:
        try:
            response = GroqClient().generate(prompt)
            return response.get("output", {}).get("text", fallback)
        except Exception:
            return fallback

    def run_collaboration(self, current_user, prompt: str, team: str):
        roles = ["Research Agent", "Analyst Agent", "Writer Agent", "Reviewer Agent"]
        logs = []
        previous = ""
        try:
            from langgraph.graph import END, StateGraph

            graph = StateGraph(dict)
            for index, role in enumerate(roles):
                def run_agent(state, agent_role=role):
                    prior = state.get("previous", "")
                    instruction = f"You are the {agent_role}. Work on this objective: {prompt}\nPrior work:\n{prior}"
                    output = self._reason(instruction, f"{agent_role} completed its assigned analysis for: {prompt}")
                    return {"previous": output, "logs": state.get("logs", []) + [{"agent": agent_role, "status": "Completed", "log": output}]}

                graph.add_node(role, run_agent)
                if index:
                    graph.add_edge(roles[index - 1], role)
            graph.set_entry_point(roles[0])
            graph.add_edge(roles[-1], END)
            state = graph.compile().invoke({"previous": "", "logs": []})
            logs, previous = state["logs"], state["previous"]
        except Exception:
            for role in roles:
                instruction = f"You are the {role}. Work on this objective: {prompt}\nPrior work:\n{previous}"
                output = self._reason(instruction, f"{role} completed its assigned analysis for: {prompt}")
                logs.append({"agent": role, "status": "Completed", "log": output})
                previous = output
        final_output = self._reason(
            f"Produce one professional final report for: {prompt}\nAgent findings:\n{previous}",
            f"# Final Report\n\n{previous}",
        )
        payload = {
            "title": prompt[:255],
            "record_type": "agent_run",
            "status": "completed",
            "data": {"team": team, "prompt": prompt, "logs": logs, "final_output": final_output},
        }
        record = self.repo.create(current_user.organization_id, current_user.id, "collaboration", payload)
        return self.repo.serialize(record)

    def run_reasoning(self, current_user, module: str, prompt: str):
        if module == "research":
            report = ResearchService(self.db).run_research(
                current_user, prompt, research_type="Business Intelligence"
            )
            return {
                "id": report["id"],
                "organization_id": report["organization_id"],
                "created_by_user_id": report["created_by_user_id"],
                "module": "research",
                "record_type": "report",
                "title": report["title"],
                "status": report["status"],
                "data": {
                    "prompt": prompt,
                    "result": report["final_report"],
                    "summary": report.get("summary"),
                    "recommendations": report.get("recommendations"),
                    "confidence_score": report.get("confidence_score"),
                    "report_id": report["id"],
                },
                "created_at": report.get("created_at"),
                "updated_at": report.get("updated_at"),
            }
        elif module == "browser-automation":
            task = BrowserService(self.db).run_task(current_user, prompt, task_type="general")
            return {
                "id": task["id"],
                "organization_id": task["organization_id"],
                "created_by_user_id": task["created_by_user_id"],
                "module": "browser-automation",
                "record_type": "run",
                "title": task["title"],
                "status": task["status"],
                "data": {
                    "prompt": prompt,
                    "result": task.get("report_text") or task.get("summary") or "",
                    "results": task.get("results", []),
                    "logs": task.get("logs", []),
                    "task_id": task["id"],
                },
                "created_at": task.get("created_at"),
                "updated_at": task.get("updated_at"),
            }
        else:
            raise ValueError("Unsupported reasoning module")

    def run_ai_employee(self, current_user, employee_id: int, task: str):
        return AIEmployeeService(self.db).run(current_user, employee_id, task)

    def voice_query(self, current_user, transcript: str, top_k: int):
        return VoiceService(self.db).voice_query(current_user, transcript, top_k)

    def analytics(self, current_user):
        return AnalyticsService(self.db).get_overview(current_user)
