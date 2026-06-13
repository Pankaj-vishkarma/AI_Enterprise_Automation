import json
import time
from typing import Optional

from sqlalchemy.orm import Session

from app.clients.groq_client import GroqClient
from app.repositories.ai_employee_repository import AIEmployeeRepository
from app.repositories.browser_repository import BrowserRepository
from app.schemas.browser import BROWSER_TASK_TYPES, BROWSER_TEMPLATES
from app.services.ai_employee_service import AIEmployeeService
from app.services.browser_automation_service import _extract_urls, execute_browser_automation
from app.services.rag_service import RAGService
from app.repositories.user_repository import UserRepository
from app.utils.rbac_scope import (
    assert_can_view_user_owned_record,
    filter_user_owned_records,
    resolve_team_member_ids,
)


class BrowserService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = BrowserRepository(db)
        self.ai_employees = AIEmployeeService(db)
        self.ai_employee_repo = AIEmployeeRepository(db)
        self.groq = GroqClient()

    def _team_member_ids(self, current_user):
        users = UserRepository(self.db).list_by_organization(current_user.organization_id)
        return resolve_team_member_ids(users, current_user)

    def _assert_task_access(self, current_user, task) -> None:
        assert_can_view_user_owned_record(
            current_user,
            task.created_by_user_id,
            self._team_member_ids(current_user),
        )

    def get_templates(self):
        return BROWSER_TEMPLATES

    def list_tasks(self, current_user, limit: int = 50, offset: int = 0):
        tasks = self.repo.list_tasks(current_user.organization_id, limit, offset)
        tasks = filter_user_owned_records(
            current_user,
            tasks,
            owner_attr="created_by_user_id",
            member_ids=self._team_member_ids(current_user),
        )
        return [self._serialize(t) for t in tasks]

    def get_task(self, current_user, task_id: int):
        task = self.repo.get_task(current_user.organization_id, task_id)
        if not task:
            return None
        self._assert_task_access(current_user, task)
        return self._serialize(task)

    def delete_task(self, current_user, task_id: int):
        task = self.repo.get_task(current_user.organization_id, task_id)
        if not task:
            return None
        self._assert_task_access(current_user, task)
        self.repo.soft_delete(task)
        return {"id": task_id, "deleted": True}

    def get_metrics(self, current_user):
        return self.repo.get_metrics(current_user.organization_id)

    def run_task(
        self,
        current_user,
        instruction: str,
        task_type: str = "general",
        title: Optional[str] = None,
        target_url: Optional[str] = None,
    ):
        if task_type not in BROWSER_TASK_TYPES:
            task_type = "general"

        start = time.perf_counter()
        full_instruction = instruction
        if target_url and target_url not in instruction:
            full_instruction = f"{instruction}\n{target_url}"

        automation_type = self._map_task_type(task_type)
        outcome = execute_browser_automation(full_instruction, task_type=automation_type, max_pages=2)

        knowledge_context = ""
        try:
            knowledge_context = RAGService(self.db).retrieve_context(current_user, instruction, top_k=3)
        except Exception:
            pass

        ai_summary = self._try_ai_employee_summary(current_user, instruction, outcome)
        report_text, summary = self._build_report(
            instruction, task_type, outcome, knowledge_context, ai_summary
        )

        status = "failed" if outcome.get("errors") and not outcome.get("results") else "completed"
        if outcome.get("errors") and outcome.get("results"):
            status = "completed"

        execution_time_ms = int((time.perf_counter() - start) * 1000)
        urls = _extract_urls(full_instruction)
        task = self.repo.create_task(
            current_user.organization_id,
            current_user.id,
            {
                "title": title or instruction[:255],
                "instruction": instruction,
                "task_type": task_type,
                "target_url": target_url or (urls[0] if urls else None),
                "status": status,
                "results": outcome.get("results", []),
                "logs": outcome.get("logs", []),
                "errors": outcome.get("errors", []),
                "pages_visited": outcome.get("pages_visited", []),
                "summary": summary,
                "report_text": report_text,
                "execution_time_ms": execution_time_ms,
            },
        )
        return self._serialize(task)

    def _try_ai_employee_summary(self, current_user, instruction: str, outcome: dict) -> str:
        employees = self.ai_employee_repo.list(current_user.organization_id)
        browser_employee = next(
            (
                e
                for e in employees
                if e.is_active
                and not e.is_deleted
                and (
                    "browser" in (e.role or "").lower()
                    or "research" in (e.role or "").lower()
                )
            ),
            None,
        )
        if not browser_employee:
            return ""
        try:
            context = json.dumps(
                {
                    "results_count": len(outcome.get("results", [])),
                    "pages": outcome.get("pages_visited", []),
                    "sample": outcome.get("results", [])[:5],
                },
                indent=2,
            )[:3000]
            result = self.ai_employees.run_with_context(
                current_user,
                browser_employee.id,
                f"Summarize this browser automation outcome for: {instruction}",
                prior_context=context,
            )
            return result.get("output", "") if result else ""
        except Exception:
            return ""

    def _build_report(
        self,
        instruction: str,
        task_type: str,
        outcome: dict,
        knowledge_context: str,
        ai_summary: str,
    ) -> tuple[str, str]:
        results = outcome.get("results", [])
        logs = outcome.get("logs", [])
        errors = outcome.get("errors", [])
        evidence = json.dumps(results[:10], indent=2)[:4000]

        prompt = (
            "Create a structured browser automation report. Only cite extracted evidence.\n"
            f"Task type: {task_type}\n"
            f"Instruction: {instruction}\n"
            f"Pages visited: {', '.join(outcome.get('pages_visited', []))}\n"
            f"Logs:\n" + "\n".join(logs) + "\n"
        )
        if knowledge_context:
            prompt += f"\nOrganizational context:\n{knowledge_context[:1500]}\n"
        if evidence:
            prompt += f"\nExtracted data:\n{evidence}\n"
        if errors:
            prompt += f"\nErrors:\n" + "\n".join(errors) + "\n"
        if ai_summary:
            prompt += f"\nAI employee analysis:\n{ai_summary[:1500]}\n"

        try:
            response = self.groq.generate(prompt)
            report_text = response.get("output", {}).get("text", "")
        except Exception:
            report_text = (
                f"# Browser Automation Report\n\n"
                f"**Instruction:** {instruction}\n\n"
                f"**Records extracted:** {len(results)}\n\n"
                f"{evidence or 'No structured records extracted.'}"
            )

        try:
            summary = self.groq.generate(
                f"Write a 2-sentence summary:\n{report_text[:2500]}"
            ).get("output", {}).get("text", "")
        except Exception:
            summary = f"Extracted {len(results)} records from {len(outcome.get('pages_visited', []))} page(s)."

        return report_text, summary

    @staticmethod
    def _map_task_type(task_type: str) -> str:
        mapping = {
            "website_extraction": "general",
            "competitor_research": "competitor_research",
            "business_information": "business_information",
            "pricing_monitoring": "pricing_monitoring",
            "market_data": "market_data",
            "form_filling": "form_filling",
            "job_search": "job_search",
        }
        return mapping.get(task_type, task_type)

    def _serialize(self, task) -> dict:
        return {
            "id": task.id,
            "organization_id": task.organization_id,
            "created_by_user_id": task.created_by_user_id,
            "title": task.title,
            "instruction": task.instruction,
            "task_type": task.task_type,
            "target_url": task.target_url,
            "status": task.status,
            "results": json.loads(task.results_json or "[]"),
            "logs": json.loads(task.logs_json or "[]"),
            "errors": json.loads(task.errors_json or "[]"),
            "pages_visited": json.loads(task.pages_visited_json or "[]"),
            "summary": task.summary,
            "report_text": task.report_text,
            "execution_time_ms": task.execution_time_ms,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
        }
