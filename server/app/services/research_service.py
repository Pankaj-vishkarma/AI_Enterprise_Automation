import json
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.clients.groq_client import GroqClient
from app.models.ai_employee import AIEmployee
from app.repositories.ai_employee_repository import AIEmployeeRepository
from app.repositories.research_repository import ResearchRepository
from app.schemas.research import RESEARCH_TEMPLATES, RESEARCH_TYPES
from app.services.ai_employee_service import AIEmployeeService
from app.services.browser_automation_service import execute_browser_task
from app.services.rag_service import RAGService
from app.repositories.user_repository import UserRepository
from app.utils.rbac_scope import (
    assert_can_view_user_owned_record,
    filter_user_owned_records,
    resolve_team_member_ids,
)

RESEARCH_AGENT_PIPELINE = [
    (
        "Research Agent",
        "Gather facts, market signals, and evidence. Focus on source-backed findings only.",
        ["research", "research assistant"],
    ),
    (
        "Analyst Agent",
        "Analyze trends, competitors, SWOT factors, and product comparisons from prior findings.",
        ["analyst", "data analyst", "business analyst"],
    ),
    (
        "Reviewer Agent",
        "Validate assumptions, identify gaps, risks, and conflicting evidence.",
        ["reviewer", "quality", "compliance"],
    ),
    (
        "Documentation Agent",
        "Produce an executive-ready report with clear sections, citations, and recommendations.",
        ["documentation", "writer", "technical writer"],
    ),
]


class ResearchService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ResearchRepository(db)
        self.ai_employees = AIEmployeeService(db)
        self.ai_employee_repo = AIEmployeeRepository(db)
        self.groq = GroqClient()

    def _team_member_ids(self, current_user):
        users = UserRepository(self.db).list_by_organization(current_user.organization_id)
        return resolve_team_member_ids(users, current_user)

    def _assert_report_access(self, current_user, report) -> None:
        assert_can_view_user_owned_record(
            current_user,
            report.created_by_user_id,
            self._team_member_ids(current_user),
        )

    def get_templates(self):
        return RESEARCH_TEMPLATES

    def list_reports(self, current_user, limit: int = 50, offset: int = 0):
        reports = self.repo.list_reports(current_user.organization_id, limit, offset)
        reports = filter_user_owned_records(
            current_user,
            reports,
            owner_attr="created_by_user_id",
            member_ids=self._team_member_ids(current_user),
        )
        return [self._serialize(r) for r in reports]

    def get_report(self, current_user, report_id: int):
        report = self.repo.get_report(current_user.organization_id, report_id)
        if not report:
            return None
        self._assert_report_access(current_user, report)
        return self._serialize(report)

    def delete_report(self, current_user, report_id: int):
        report = self.repo.get_report(current_user.organization_id, report_id)
        if not report:
            return None
        self._assert_report_access(current_user, report)
        self.repo.soft_delete(report)
        return {"id": report_id, "deleted": True}

    def get_metrics(self, current_user):
        return self.repo.get_metrics(current_user.organization_id)

    def run_research(
        self,
        current_user,
        request_text: str,
        research_type: str = "Business Intelligence",
        title: Optional[str] = None,
        use_browser: bool = False,
    ):
        if research_type not in RESEARCH_TYPES:
            research_type = "Business Intelligence"

        start = time.perf_counter()
        sources, citations = self._collect_sources(current_user, request_text, use_browser)
        source_context = self._format_sources_for_prompt(sources)

        agent_assignments = self._resolve_agents(current_user.organization_id)
        intermediate, agent_usage, pipeline_status = self._run_agent_pipeline(
            current_user, request_text, research_type, source_context, agent_assignments
        )

        final_report, summary, recommendations = self._build_final_report(
            request_text, research_type, intermediate, sources, citations
        )
        confidence = self._compute_confidence(sources, intermediate, pipeline_status)
        execution_time_ms = int((time.perf_counter() - start) * 1000)

        report = self.repo.create_report(
            current_user.organization_id,
            current_user.id,
            {
                "title": title or request_text[:255],
                "research_type": research_type,
                "request_text": request_text,
                "status": pipeline_status,
                "sources": sources,
                "intermediate_findings": intermediate,
                "citations": citations,
                "final_report": final_report,
                "summary": summary,
                "recommendations": recommendations,
                "confidence_score": confidence,
                "execution_time_ms": execution_time_ms,
                "agent_usage": agent_usage,
            },
        )
        return self._serialize(report)

    def _collect_sources(
        self, current_user, request_text: str, use_browser: bool
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        sources: List[Dict[str, Any]] = []
        citations: List[Dict[str, Any]] = []

        try:
            rag = RAGService(self.db)
            context = rag.retrieve_context(current_user, request_text, top_k=8)
            if context:
                sources.append(
                    {
                        "type": "organizational_knowledge",
                        "title": "Internal Knowledge Base",
                        "excerpt": context[:2000],
                    }
                )
                for index, chunk in enumerate(context.split("\n\n")[:5], start=1):
                    if chunk.strip():
                        citations.append(
                            {
                                "id": f"kb-{index}",
                                "source_type": "knowledge_base",
                                "reference": f"Organizational knowledge excerpt {index}",
                                "excerpt": chunk.strip()[:500],
                            }
                        )
        except Exception:
            pass

        if use_browser or re.search(r"https?://", request_text):
            try:
                browser_results = execute_browser_task(request_text)
                if browser_results:
                    sources.append(
                        {
                            "type": "browser_automation",
                            "title": "Web extraction results",
                            "excerpt": json.dumps(browser_results[:5], indent=2)[:2000],
                        }
                    )
                    for item in browser_results[:10]:
                        citations.append(
                            {
                                "id": f"web-{item.get('id', 0)}",
                                "source_type": "web",
                                "reference": item.get("title") or item.get("location", "Web source"),
                                "excerpt": item.get("location") or item.get("posted", ""),
                            }
                        )
            except Exception:
                pass

        return sources, citations

    def _resolve_agents(self, organization_id: int) -> List[Dict[str, Any]]:
        employees = self.ai_employee_repo.list(organization_id)
        assignments = []
        for agent_name, _instruction, keywords in RESEARCH_AGENT_PIPELINE:
            employee = self._match_employee(employees, keywords)
            assignments.append(
                {
                    "agent_name": agent_name,
                    "employee_id": employee.id if employee else None,
                    "employee_name": employee.name if employee else None,
                    "employee_role": employee.role if employee else agent_name,
                }
            )
        return assignments

    @staticmethod
    def _match_employee(employees: List[AIEmployee], keywords: List[str]) -> Optional[AIEmployee]:
        for employee in employees:
            if not employee.is_active or employee.is_deleted:
                continue
            role_lower = (employee.role or "").lower()
            name_lower = (employee.name or "").lower()
            for keyword in keywords:
                if keyword in role_lower or keyword in name_lower:
                    return employee
        return None

    def _run_agent_pipeline(
        self,
        current_user,
        request_text: str,
        research_type: str,
        source_context: str,
        assignments: List[Dict[str, Any]],
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], str]:
        intermediate: List[Dict[str, Any]] = []
        agent_usage: List[Dict[str, Any]] = []
        prior = ""
        status = "completed"

        for index, assignment in enumerate(assignments):
            agent_name = assignment["agent_name"]
            _, instruction, _ = RESEARCH_AGENT_PIPELINE[index]
            task = (
                f"Research type: {research_type}\n"
                f"Request: {request_text}\n"
                f"Your role: {agent_name}. {instruction}"
            )
            if source_context and index == 0:
                task += f"\n\nCollected sources:\n{source_context}"

            step_output = ""
            step_status = "completed"
            tools_used: List[str] = []
            execution_time_ms = None
            employee_id = assignment.get("employee_id")

            if employee_id:
                try:
                    result = self.ai_employees.run_with_context(
                        current_user, employee_id, task, prior_context=prior
                    )
                    if result:
                        step_output = result.get("output", "")
                        step_status = result.get("status", "completed")
                        tools_used = result.get("tools_used", [])
                        execution_time_ms = result.get("execution_time_ms")
                except Exception as exc:
                    step_output = str(exc)
                    step_status = "failed"
            else:
                step_output, step_status = self._run_groq_agent(
                    agent_name, instruction, request_text, research_type, prior, source_context
                )

            entry = {
                "agent_name": agent_name,
                "employee_id": employee_id,
                "employee_name": assignment.get("employee_name"),
                "status": step_status,
                "output": step_output,
                "tools_used": tools_used,
                "execution_time_ms": execution_time_ms,
            }
            intermediate.append(entry)
            agent_usage.append(
                {
                    "agent_name": agent_name,
                    "employee_id": employee_id,
                    "employee_name": assignment.get("employee_name"),
                    "status": step_status,
                }
            )
            if step_status == "failed":
                status = "partial" if intermediate else "failed"
                break
            prior = self._format_prior_context(intermediate)

        return intermediate, agent_usage, status

    def _run_groq_agent(
        self,
        agent_name: str,
        instruction: str,
        request_text: str,
        research_type: str,
        prior: str,
        source_context: str,
    ) -> Tuple[str, str]:
        prompt = (
            f"You are the {agent_name}. {instruction}\n"
            f"Research type: {research_type}\n"
            f"Request: {request_text}\n"
        )
        if source_context:
            prompt += f"\nSources:\n{source_context}\n"
        if prior:
            prompt += f"\nPrior agent outputs:\n{prior}\n"
        prompt += "\nProvide your specialized contribution:"
        try:
            response = self.groq.generate(prompt)
            return response.get("output", {}).get("text", ""), "completed"
        except Exception as exc:
            return f"{agent_name} could not complete: {exc}", "failed"

    def _build_final_report(
        self,
        request_text: str,
        research_type: str,
        intermediate: List[Dict[str, Any]],
        sources: List[Dict[str, Any]],
        citations: List[Dict[str, Any]],
    ) -> Tuple[str, str, str]:
        contributions = self._format_prior_context(intermediate)
        citation_block = "\n".join(
            f"- [{c.get('id', '?')}] {c.get('reference', 'Source')}: {c.get('excerpt', '')[:200]}"
            for c in citations[:15]
        ) or "- No external citations captured; findings rely on agent analysis and available knowledge."

        doc_agent = next(
            (s for s in reversed(intermediate) if s.get("agent_name") == "Documentation Agent"),
            None,
        )
        if doc_agent and doc_agent.get("status") == "completed" and doc_agent.get("output"):
            base_report = doc_agent["output"]
        else:
            prompt = (
                "Produce a structured business research report with sections: "
                "Executive Summary, Key Findings, Competitor/Market Analysis (if relevant), "
                "Opportunities, Risks, Recommendations, and Sources.\n"
                f"Research type: {research_type}\n"
                f"Request: {request_text}\n\n"
                f"Agent findings:\n{contributions}\n"
            )
            try:
                response = self.groq.generate(prompt)
                base_report = response.get("output", {}).get("text", contributions)
            except Exception:
                base_report = f"# Research Report\n\n{contributions}"

        if "## Sources" not in base_report and "Sources" not in base_report:
            base_report += f"\n\n## Sources & Citations\n{citation_block}\n"

        summary_prompt = (
            f"Write a 2-3 sentence executive summary for this research report:\n{base_report[:3000]}"
        )
        rec_prompt = (
            f"List 3-5 actionable recommendations as bullet points based on:\n{base_report[:3000]}"
        )
        try:
            summary = self.groq.generate(summary_prompt).get("output", {}).get("text", "")
            recommendations = self.groq.generate(rec_prompt).get("output", {}).get("text", "")
        except Exception:
            summary = base_report.split("\n")[0][:300] if base_report else None
            recommendations = None

        return base_report, summary, recommendations

    @staticmethod
    def _format_sources_for_prompt(sources: List[Dict[str, Any]]) -> str:
        parts = []
        for source in sources:
            parts.append(f"### {source.get('title', 'Source')} ({source.get('type', 'unknown')})\n")
            parts.append(source.get("excerpt", "")[:1500])
        return "\n\n".join(parts)

    @staticmethod
    def _format_prior_context(steps: List[Dict[str, Any]]) -> str:
        parts = []
        for step in steps:
            name = step.get("employee_name") or step.get("agent_name", "Agent")
            parts.append(f"### {name}\n{step.get('output', '')}")
        return "\n\n".join(parts)

    @staticmethod
    def _compute_confidence(
        sources: List[Dict[str, Any]], intermediate: List[Dict[str, Any]], status: str
    ) -> float:
        score = 40.0
        score += min(len(sources) * 8, 24)
        completed = sum(1 for s in intermediate if s.get("status") == "completed")
        score += min(completed * 5, 20)
        if status == "completed":
            score += 10
        elif status == "partial":
            score += 4
        return min(round(score, 1), 98.0)

    def _serialize(self, report) -> dict:
        return {
            "id": report.id,
            "organization_id": report.organization_id,
            "created_by_user_id": report.created_by_user_id,
            "title": report.title,
            "research_type": report.research_type,
            "request_text": report.request_text,
            "status": report.status,
            "sources": json.loads(report.sources_json or "[]"),
            "intermediate_findings": json.loads(report.intermediate_findings_json or "[]"),
            "citations": json.loads(report.citations_json or "[]"),
            "final_report": report.final_report,
            "summary": report.summary,
            "recommendations": report.recommendations,
            "confidence_score": report.confidence_score,
            "execution_time_ms": report.execution_time_ms,
            "agent_usage": json.loads(report.agent_usage_json or "[]"),
            "created_at": report.created_at,
            "updated_at": report.updated_at,
        }
