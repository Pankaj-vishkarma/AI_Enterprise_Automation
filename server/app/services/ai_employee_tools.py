import json
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.clients.groq_client import GroqClient
from app.services.operations_service import OperationsService
from app.services.rag_service import RAGService

# Canonical tool names
KNOWLEDGE_SEARCH = "Knowledge Search"
RESEARCH_TOOL = "Research Tool"
BROWSER_AUTOMATION = "Browser Automation"
DOCUMENT_GENERATOR = "Document Generator"

# Legacy aliases from earlier UI
_LEGACY_TOOL_MAP = {
    "File Reader": KNOWLEDGE_SEARCH,
    "Database Access": KNOWLEDGE_SEARCH,
    "Web Search": RESEARCH_TOOL,
    "Doc Generator": DOCUMENT_GENERATOR,
    "Code Interpreter": RESEARCH_TOOL,
    "CRM Connector": RESEARCH_TOOL,
}


def normalize_tools(tools: List[str]) -> List[str]:
    normalized = []
    for tool in tools:
        canonical = _LEGACY_TOOL_MAP.get(tool, tool)
        if canonical not in normalized:
            normalized.append(canonical)
    return normalized


class AIEmployeeTools:
    def __init__(self, db: Session):
        self.db = db
        self.groq = GroqClient()
        self.ops = OperationsService(db)

    def execute_tools(
        self,
        current_user,
        task: str,
        tools: List[str],
        knowledge_document_ids: Optional[List[int]] = None,
        employee_role: str = "Assistant",
    ) -> tuple[Dict[str, str], List[str]]:
        """Run enabled tools and return context blocks + tools used."""
        normalized = normalize_tools(tools)
        contexts: Dict[str, str] = {}
        tools_used: List[str] = []

        if KNOWLEDGE_SEARCH in normalized:
            context = RAGService(self.db).retrieve_context(
                current_user,
                task,
                top_k=5,
                document_ids=knowledge_document_ids or None,
            )
            if context:
                contexts["knowledge"] = context
                tools_used.append("knowledge_search")

        if RESEARCH_TOOL in normalized:
            research_context = self._run_research(task, contexts.get("knowledge", ""))
            if research_context:
                contexts["research"] = research_context
                tools_used.append("research_tool")

        if BROWSER_AUTOMATION in normalized:
            browser_results = OperationsService._execute_browser_task(task)
            if browser_results:
                contexts["browser"] = json.dumps(browser_results, indent=2)
                tools_used.append("browser_automation")

        if DOCUMENT_GENERATOR in normalized:
            doc_output = self._run_document_generator(
                task, employee_role, contexts.get("knowledge", "")
            )
            if doc_output:
                contexts["document_draft"] = doc_output
                tools_used.append("document_generator")

        return contexts, tools_used

    def _run_research(self, task: str, knowledge_context: str) -> str:
        system = (
            "Produce a concise business research summary with assumptions, findings, "
            "risks, and recommendations."
        )
        if knowledge_context:
            system += f"\nRelevant organizational knowledge:\n{knowledge_context}"
        try:
            response = self.groq.generate(f"{system}\nResearch task: {task}")
            return response.get("output", {}).get("text", "")
        except Exception:
            return ""

    def _run_document_generator(
        self, task: str, employee_role: str, knowledge_context: str
    ) -> str:
        prompt = (
            f"You are a {employee_role} documentation specialist. "
            "Generate a well-structured document draft (SOP, policy, or internal guide) "
            "based on the task below. Use markdown headings.\n"
        )
        if knowledge_context:
            prompt += f"\nOrganizational context:\n{knowledge_context}\n"
        prompt += f"\nTask: {task}"
        try:
            response = self.groq.generate(prompt)
            return response.get("output", {}).get("text", "")
        except Exception:
            return ""
