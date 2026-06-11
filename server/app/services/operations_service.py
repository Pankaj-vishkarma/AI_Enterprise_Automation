import json
from collections import Counter
from typing import Dict, List

from sqlalchemy.orm import Session

from app.clients.groq_client import GroqClient
from app.clients.redis_client import get_redis
from app.models.knowledge_query import KnowledgeQuery
from app.repositories.operational_record_repository import OperationalRecordRepository
from app.services.ai_employee_service import AIEmployeeService
from app.services.rag_service import RAGService
from app.services.workflow_service import WorkflowService
from app.services.research_service import ResearchService
from app.services.browser_service import BrowserService


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
        return [self.repo.serialize(item) for item in self.repo.list(current_user.organization_id, module)]

    def create(self, current_user, module: str, payload):
        self._validate_module(module)
        data = payload.model_dump()
        if module == "ai-employees":
            return AIEmployeeService(self.db).create(current_user, data)
        if module == "support":
            message = data["data"].get("message", "")
            data["data"].setdefault("sentiment", self._sentiment(message))
            data["data"].setdefault("aiRecommendation", self._support_recommendation(data["title"], message))
        if module == "omnichannel":
            last_message = data["data"].get("lastMessage", "")
            data["data"].setdefault(
                "recommendedReply",
                self._reason(
                    f"Draft a concise assisted reply to this customer message: {last_message}",
                    "Thank you for your message. A team member will review it and respond shortly.",
                ),
            )
        record = self.repo.create(current_user.organization_id, current_user.id, module, data)
        return self.repo.serialize(record)

    def update(self, current_user, module: str, record_id: int, payload):
        self._validate_module(module)
        if module == "ai-employees":
            return AIEmployeeService(self.db).update(current_user, record_id, payload.model_dump(exclude_unset=True))
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
        try:
            query, _ = RAGService(self.db).ask(current_user, transcript, top_k)
            answer = query.answer_text
        except Exception:
            answer = self._reason(
                f"Answer this voice assistant request concisely: {transcript}",
                "I could not find enough organizational knowledge to answer that request.",
            )
        payload = {
            "title": transcript[:255],
            "record_type": "interaction",
            "status": "completed",
            "data": {"transcript": transcript, "answer": answer},
        }
        return self.repo.serialize(self.repo.create(current_user.organization_id, current_user.id, "voice", payload))

    def analytics(self, current_user):
        org_id = current_user.organization_id
        cache_key = f"analytics:overview:{org_id}"
        redis = get_redis()
        if redis:
            try:
                cached = redis.get(cache_key)
                if cached:
                    return json.loads(cached)
            except Exception:
                pass
        queries = self.db.query(KnowledgeQuery).filter(KnowledgeQuery.organization_id == org_id).all()
        topics = Counter(query.question_text for query in queries)
        ai_employee_service = AIEmployeeService(self.db)
        employees = ai_employee_service.list(current_user)
        active_ai_employees = ai_employee_service.count_active(org_id)
        workflow_metrics = WorkflowService(self.db).get_metrics(current_user)
        support = self.repo.list(org_id, "support")
        completed_workflows = workflow_metrics["completed_instances"]
        resolved_tickets = sum(item.status.lower() == "resolved" for item in support)
        categories = Counter(json.loads(item.data_json or "{}").get("category", "General") for item in support)
        result = {
            "summary": {
                "knowledge_queries": len(queries),
                "active_ai_employees": active_ai_employees,
                "workflow_completion_rate": workflow_metrics["completion_rate"],
                "resolved_support_tickets": resolved_tickets,
            },
            "knowledge": {"most_searched_topics": [{"topic": k, "count": v} for k, v in topics.most_common(10)]},
            "employees": {"total": len(employees), "active": active_ai_employees},
            "workflows": {
                "total": workflow_metrics["total_instances"],
                "completed": completed_workflows,
                "active_definitions": workflow_metrics["active_workflows"],
            },
            "support": {"total": len(support), "resolved": resolved_tickets, "categories": dict(categories)},
        }
        if redis:
            try:
                redis.setex(cache_key, 60, json.dumps(result))
            except Exception:
                pass
        return result
