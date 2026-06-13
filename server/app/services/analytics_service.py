import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.clients.redis_client import get_redis
from app.models.ai_employee import AIEmployee
from app.models.ai_employee_run import AIEmployeeRun
from app.models.knowledge_document import KnowledgeDocument
from app.models.knowledge_document_chunk import KnowledgeDocumentChunk
from app.models.knowledge_query import KnowledgeQuery
from app.models.omnichannel_conversation import OmnichannelConversation
from app.models.omnichannel_message import OmnichannelMessage
from app.models.user import User
from app.models.workflow import WorkflowInstance, WorkflowInstanceStep
from app.repositories.browser_repository import BrowserRepository
from app.repositories.collaboration_repository import CollaborationRepository
from app.repositories.research_repository import ResearchRepository
from app.repositories.voice_repository import VoiceRepository
from app.services.ai_employee_service import AIEmployeeService
from app.services.support_service import SupportService
from app.services.workflow_service import WorkflowService


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _in_range(created_at: Optional[datetime], start: Optional[datetime], end: Optional[datetime]) -> bool:
        if created_at is None:
            return True
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if start and created_at < start:
            return False
        if end and created_at > end:
            return False
        return True

    def _cache_get(self, key: str) -> Optional[dict]:
        redis = get_redis()
        if not redis:
            return None
        try:
            cached = redis.get(key)
            return json.loads(cached) if cached else None
        except Exception:
            return None

    def _cache_set(self, key: str, payload: dict, ttl: int = 120) -> None:
        redis = get_redis()
        if not redis:
            return
        try:
            redis.setex(key, ttl, json.dumps(payload, default=str))
        except Exception:
            pass

    def _knowledge_analytics(self, org_id: int, start: Optional[datetime], end: Optional[datetime]) -> dict:
        documents = (
            self.db.query(KnowledgeDocument)
            .filter(KnowledgeDocument.organization_id == org_id)
            .all()
        )
        queries = (
            self.db.query(KnowledgeQuery)
            .filter(KnowledgeQuery.organization_id == org_id)
            .all()
        )
        queries = [q for q in queries if self._in_range(q.created_at, start, end)]

        type_counts = Counter(d.document_type for d in documents)
        topic_counts = Counter(q.question_text for q in queries)
        accessed_document_ids: Counter = Counter()
        gap_topics: Counter = Counter()

        for query in queries:
            matched = json.loads(query.matched_document_ids or "[]")
            if not matched:
                gap_topics[query.question_text] += 1
            for doc_id in matched:
                accessed_document_ids[doc_id] += 1

        doc_titles = {d.id: d.title for d in documents}
        chunks_total = (
            self.db.query(KnowledgeDocumentChunk)
            .filter(KnowledgeDocumentChunk.organization_id == org_id)
            .count()
        )

        return {
            "total_documents": len(documents),
            "documents_by_category": dict(type_counts),
            "documents_active": sum(1 for d in documents if d.is_active),
            "chunks_total": chunks_total,
            "query_volume": len(queries),
            "most_searched_topics": [
                {"topic": t, "count": c} for t, c in topic_counts.most_common(10)
            ],
            "most_accessed_documents": [
                {
                    "document_id": doc_id,
                    "title": doc_titles.get(doc_id, f"Document {doc_id}"),
                    "count": count,
                }
                for doc_id, count in accessed_document_ids.most_common(10)
            ],
            "knowledge_gaps": [
                {"topic": t, "count": c, "severity": "High" if c >= 10 else "Medium" if c >= 5 else "Low"}
                for t, c in gap_topics.most_common(10)
            ],
        }

    def _employee_analytics(self, current_user, org_id: int, start: Optional[datetime], end: Optional[datetime]) -> dict:
        ai_service = AIEmployeeService(self.db)
        employees = ai_service.list(current_user)
        runs = (
            self.db.query(AIEmployeeRun)
            .filter(AIEmployeeRun.organization_id == org_id)
            .order_by(AIEmployeeRun.id.desc())
            .all()
        )
        runs = [r for r in runs if self._in_range(r.created_at, start, end)]

        tool_counter: Counter = Counter()
        employee_counter: Counter = Counter()
        execution_times = []
        for run in runs:
            employee_counter[run.employee_id] += 1
            for tool in json.loads(run.tools_used_json or "[]"):
                tool_counter[tool] += 1
            if run.execution_time_ms is not None:
                execution_times.append(run.execution_time_ms)

        completed = sum(1 for r in runs if r.status == "completed")
        failed = sum(1 for r in runs if r.status == "failed")
        total_runs = len(runs)
        employee_names = {e["id"]: e["name"] for e in employees}

        return {
            "total_employees": len(employees),
            "active_employees": ai_service.count_active(org_id),
            "total_runs": total_runs,
            "successful_runs": completed,
            "failed_runs": failed,
            "success_rate": round(completed * 100 / total_runs, 1) if total_runs else 0.0,
            "average_execution_time_ms": (
                round(sum(execution_times) / len(execution_times), 1) if execution_times else None
            ),
            "tool_usage": [{"tool": t, "count": c} for t, c in tool_counter.most_common(10)],
            "most_active_employees": [
                {
                    "employee_id": eid,
                    "name": employee_names.get(eid, f"Employee {eid}"),
                    "runs": count,
                    "share_percent": round(count * 100 / total_runs, 1) if total_runs else 0,
                }
                for eid, count in employee_counter.most_common(10)
            ],
        }

    def _workflow_analytics(self, current_user, start: Optional[datetime], end: Optional[datetime]) -> dict:
        base = WorkflowService(self.db).get_metrics(current_user)
        org_id = current_user.organization_id

        instances = (
            self.db.query(WorkflowInstance)
            .filter(WorkflowInstance.organization_id == org_id)
            .all()
        )
        instances = [i for i in instances if self._in_range(i.created_at, start, end)]

        completion_times = []
        workflow_stats: Dict[int, Dict[str, int]] = defaultdict(lambda: {"total": 0, "completed": 0})
        pending_approvals = 0
        step_delays: List[Dict[str, Any]] = []

        instance_ids = [instance.id for instance in instances]
        steps_by_instance: Dict[int, list] = defaultdict(list)
        if instance_ids:
            all_steps = (
                self.db.query(WorkflowInstanceStep)
                .filter(WorkflowInstanceStep.instance_id.in_(instance_ids))
                .all()
            )
            for step in all_steps:
                steps_by_instance[step.instance_id].append(step)

        for instance in instances:
            wf_id = instance.workflow_id
            workflow_stats[wf_id]["total"] += 1
            if instance.status == "completed":
                workflow_stats[wf_id]["completed"] += 1
                if instance.completed_at and instance.created_at:
                    created = instance.created_at
                    if created.tzinfo is None:
                        created = created.replace(tzinfo=timezone.utc)
                    completed = instance.completed_at
                    if completed.tzinfo is None:
                        completed = completed.replace(tzinfo=timezone.utc)
                    hours = (completed - created).total_seconds() / 3600
                    if hours >= 0:
                        completion_times.append(hours)

            steps = steps_by_instance.get(instance.id, [])
            for step in steps:
                if step.status == "pending" and instance.status == "in_progress":
                    pending_approvals += 1
                    if instance.created_at:
                        created = instance.created_at
                        if created.tzinfo is None:
                            created = created.replace(tzinfo=timezone.utc)
                        delay_hours = (self._now() - created).total_seconds() / 3600
                        step_delays.append({
                            "step_name": step.name,
                            "workflow_instance_id": instance.id,
                            "delay_hours": round(delay_hours, 1),
                        })

        workflow_names = {
            w["id"]: w["name"]
            for w in WorkflowService(self.db).list_workflows(current_user)
        }
        performance = []
        for wf_id, stats in workflow_stats.items():
            total = stats["total"]
            completed = stats["completed"]
            performance.append({
                "workflow_id": wf_id,
                "workflow_name": workflow_names.get(wf_id, f"Workflow {wf_id}"),
                "completion_rate": round(completed * 100 / total, 1) if total else 0.0,
                "total_instances": total,
                "completed_instances": completed,
            })
        performance.sort(key=lambda x: x["total_instances"], reverse=True)

        bottlenecks = sorted(step_delays, key=lambda x: x["delay_hours"], reverse=True)[:10]
        for item in bottlenecks:
            item["severity"] = "Critical" if item["delay_hours"] >= 48 else "Minor" if item["delay_hours"] < 24 else "Medium"

        return {
            **base,
            "average_completion_hours": (
                round(sum(completion_times) / len(completion_times), 1) if completion_times else None
            ),
            "pending_approvals": pending_approvals,
            "workflow_performance": performance,
            "bottlenecks": bottlenecks,
        }

    def _support_analytics(self, current_user) -> dict:
        return SupportService(self.db).get_metrics(current_user)

    def _research_analytics(self, org_id: int, start: Optional[datetime], end: Optional[datetime]) -> dict:
        reports = ResearchRepository(self.db).list_reports(org_id, limit=5000)
        reports = [r for r in reports if self._in_range(r.created_at, start, end)]
        metrics = ResearchRepository(self.db).get_metrics(org_id)
        if start or end:
            completed = sum(1 for r in reports if r.status == "completed")
            total = len(reports)
            metrics = {
                **metrics,
                "total_reports": total,
                "completed_reports": completed,
                "success_rate": round(completed * 100 / total, 1) if total else 0.0,
                "most_requested_topics": [
                    {"topic": t, "count": c}
                    for t, c in Counter(r.request_text[:120] for r in reports).most_common(10)
                ],
                "research_categories": [
                    {"research_type": rt, "count": c}
                    for rt, c in Counter(r.research_type for r in reports).most_common()
                ],
            }
        else:
            metrics["research_categories"] = metrics.pop("research_type_breakdown", [])
        return metrics

    def _browser_analytics(self, org_id: int, start: Optional[datetime], end: Optional[datetime]) -> dict:
        tasks = BrowserRepository(self.db).list_tasks(org_id, limit=5000)
        tasks = [t for t in tasks if self._in_range(t.created_at, start, end)]
        if start or end:
            completed = sum(1 for t in tasks if t.status == "completed")
            total = len(tasks)
            return {
                "total_tasks": total,
                "completed_tasks": completed,
                "failed_tasks": sum(1 for t in tasks if t.status == "failed"),
                "success_rate": round(completed * 100 / total, 1) if total else 0.0,
                "task_type_breakdown": [
                    {"task_type": tt, "count": c}
                    for tt, c in Counter(t.task_type for t in tasks).most_common()
                ],
            }
        return BrowserRepository(self.db).get_metrics(org_id)

    def _voice_analytics(self, org_id: int, start: Optional[datetime], end: Optional[datetime]) -> dict:
        repo = VoiceRepository(self.db)
        if not start and not end:
            return repo.analytics(org_id)
        sessions = [s for s in repo.list_sessions(org_id, 1000) if self._in_range(s.started_at, start, end)]
        interactions = [i for i in repo.list_interactions(org_id, 1000) if self._in_range(i.created_at, start, end)]
        assistant_counter: Counter = Counter()
        intent_counter: Counter = Counter()
        for record in interactions:
            data = json.loads(record.data_json or "{}")
            if data.get("assistant_used"):
                assistant_counter[data["assistant_used"]] += 1
            if data.get("intent"):
                intent_counter[data["intent"]] += 1
        return {
            "total_sessions": len(sessions),
            "total_interactions": len(interactions),
            "active_sessions": sum(1 for s in sessions if s.status == "active"),
            "most_used_assistants": [
                {"assistant": k, "count": v} for k, v in assistant_counter.most_common(10)
            ],
            "most_used_commands": [
                {"intent": k, "count": v} for k, v in intent_counter.most_common(10)
            ],
        }

    def _omnichannel_analytics(self, org_id: int, start: Optional[datetime], end: Optional[datetime]) -> dict:
        convs = (
            self.db.query(OmnichannelConversation)
            .filter(OmnichannelConversation.organization_id == org_id)
            .all()
        )
        convs = [c for c in convs if self._in_range(c.created_at, start, end)]
        messages = (
            self.db.query(OmnichannelMessage)
            .filter(OmnichannelMessage.organization_id == org_id)
            .all()
        )
        messages = [m for m in messages if self._in_range(m.created_at, start, end)]

        channel_counter = Counter(c.channel for c in convs)
        handoffs = sum(1 for c in convs if c.handoff_status == "human")
        ai_replies = sum(1 for m in messages if m.sender_type == "ai")

        return {
            "total_conversations": len(convs),
            "conversations_by_channel": dict(channel_counter),
            "human_handoffs": handoffs,
            "ai_reply_count": ai_replies,
            "total_messages": len(messages),
            "active_conversations": sum(1 for c in convs if c.status in {"AI Active", "Human Active"}),
        }

    def _organization_analytics(self, org_id: int, start: Optional[datetime], end: Optional[datetime]) -> dict:
        users = (
            self.db.query(User)
            .filter(User.organization_id == org_id, User.is_active.is_(True))
            .all()
        )
        employee_runs = (
            self.db.query(AIEmployeeRun)
            .filter(AIEmployeeRun.organization_id == org_id)
            .all()
        )
        employee_runs = [r for r in employee_runs if self._in_range(r.created_at, start, end)]

        dept_activity: Counter = Counter()
        team_activity: Counter = Counter()
        user_activity: Counter = Counter()

        employee_ids = {run.employee_id for run in employee_runs}
        employees_by_id = {
            employee.id: employee
            for employee in self.db.query(AIEmployee)
            .filter(AIEmployee.id.in_(employee_ids))
            .all()
        } if employee_ids else {}

        for run in employee_runs:
            user_activity[run.user_id] += 1
            employee = employees_by_id.get(run.employee_id)
            if employee and employee.department_id:
                dept_activity[employee.department_id] += 1

        from app.models.department import Department
        from app.models.team import Team

        dept_names = {
            d.id: d.name
            for d in self.db.query(Department).filter(Department.organization_id == org_id).all()
        }
        team_names = {
            t.id: t.name
            for t in self.db.query(Team).filter(Team.organization_id == org_id).all()
        }

        return {
            "active_users": len(users),
            "department_activity": [
                {"department_id": did, "name": dept_names.get(did, f"Dept {did}"), "events": count}
                for did, count in dept_activity.most_common(10)
            ],
            "team_activity": [
                {"team_id": tid, "name": team_names.get(tid, f"Team {tid}"), "events": count}
                for tid, count in team_activity.most_common(10)
            ],
            "most_active_users": [
                {"user_id": uid, "events": count}
                for uid, count in user_activity.most_common(10)
            ],
        }

    def get_dashboard(
        self,
        current_user,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> dict:
        org_id = current_user.organization_id
        cache_key = f"analytics:dashboard:{org_id}:{start_date}:{end_date}"
        cached = self._cache_get(cache_key)
        if cached:
            return cached

        knowledge = self._knowledge_analytics(org_id, start_date, end_date)
        employees = self._employee_analytics(current_user, org_id, start_date, end_date)
        workflows = self._workflow_analytics(current_user, start_date, end_date)
        support = self._support_analytics(current_user)
        research = self._research_analytics(org_id, start_date, end_date)
        browser = self._browser_analytics(org_id, start_date, end_date)
        voice = self._voice_analytics(org_id, start_date, end_date)
        omnichannel = self._omnichannel_analytics(org_id, start_date, end_date)
        organization = self._organization_analytics(org_id, start_date, end_date)
        collaboration = CollaborationRepository(self.db).get_metrics(org_id)

        summary = {
            "knowledge_queries": knowledge["query_volume"],
            "active_ai_employees": employees["active_employees"],
            "workflow_completion_rate": workflows.get("completion_rate", 0.0),
            "resolved_support_tickets": support.get("resolved_tickets", 0) + support.get("closed_tickets", 0),
            "total_conversations": omnichannel["total_conversations"],
            "total_voice_sessions": voice.get("total_sessions", 0),
            "total_research_reports": research.get("total_reports", 0),
            "active_users": organization["active_users"],
        }

        result = {
            "summary": summary,
            "knowledge": knowledge,
            "employees": employees,
            "workflows": workflows,
            "support": support,
            "research": research,
            "browser": browser,
            "voice": voice,
            "omnichannel": omnichannel,
            "organization": organization,
            "collaboration": collaboration,
            "generated_at": self._now(),
            "date_range": {
                "start_date": start_date,
                "end_date": end_date,
            },
        }
        self._cache_set(cache_key, result)
        return result

    def get_overview(self, current_user) -> dict:
        dashboard = self.get_dashboard(current_user)
        return {
            "summary": {
                "knowledge_queries": dashboard["summary"]["knowledge_queries"],
                "active_ai_employees": dashboard["summary"]["active_ai_employees"],
                "workflow_completion_rate": dashboard["summary"]["workflow_completion_rate"],
                "resolved_support_tickets": dashboard["summary"]["resolved_support_tickets"],
            },
            "knowledge": {
                "most_searched_topics": dashboard["knowledge"]["most_searched_topics"],
            },
            "employees": {
                "total": dashboard["employees"]["total_employees"],
                "active": dashboard["employees"]["active_employees"],
            },
            "workflows": {
                "total": dashboard["workflows"].get("total_instances", 0),
                "completed": dashboard["workflows"].get("completed_instances", 0),
                "active_definitions": dashboard["workflows"].get("active_workflows", 0),
            },
            "support": {
                "total": dashboard["support"].get("total_tickets", 0),
                "resolved": dashboard["support"].get("resolved_tickets", 0),
                "categories": dashboard["support"].get("category_distribution", {}),
            },
        }

    def generate_report(
        self,
        current_user,
        report_type: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        fmt: str = "markdown",
    ) -> dict:
        dashboard = self.get_dashboard(current_user, start_date, end_date)
        cache_key = f"analytics:report:{report_type}:{current_user.organization_id}:{start_date}:{end_date}:{fmt}"
        cached = self._cache_get(cache_key)
        if cached:
            return cached

        titles = {
            "executive": "Executive Summary",
            "operational": "Operational Report",
            "business": "Business Report",
        }
        title = titles.get(report_type, "Analytics Report")

        if report_type == "executive":
            content = self._executive_markdown(dashboard)
        elif report_type == "operational":
            content = self._operational_markdown(dashboard)
        elif report_type == "business":
            content = self._business_markdown(dashboard)
        else:
            raise ValueError(f"Unsupported report type: {report_type}")

        result = {
            "report_type": report_type,
            "format": fmt,
            "title": title,
            "content": content if fmt == "markdown" else content,
            "data": dashboard if fmt == "json" else {},
            "generated_at": self._now(),
        }
        if fmt == "json":
            result["content"] = ""
            result["data"] = dashboard
        self._cache_set(cache_key, result, ttl=300)
        return result

    @staticmethod
    def _executive_markdown(d: dict) -> str:
        s = d["summary"]
        lines = [
            f"# Executive Summary\n",
            f"Generated: {d['generated_at']}\n",
            "## Key Performance Indicators\n",
            f"- Knowledge queries: **{s['knowledge_queries']}**",
            f"- Active AI employees: **{s['active_ai_employees']}**",
            f"- Workflow completion rate: **{s['workflow_completion_rate']}%**",
            f"- Resolved support tickets: **{s['resolved_support_tickets']}**",
            f"- Omnichannel conversations: **{s['total_conversations']}**",
            f"- Voice sessions: **{s['total_voice_sessions']}**",
            f"- Research reports: **{s['total_research_reports']}**",
            f"- Active users: **{s['active_users']}**\n",
            "## Highlights\n",
            f"- Top knowledge topic: {d['knowledge']['most_searched_topics'][0]['topic'] if d['knowledge']['most_searched_topics'] else 'N/A'}",
            f"- AI employee success rate: {d['employees']['success_rate']}%",
            f"- Support resolution rate: {d['support'].get('resolution_rate', 0)}%",
            f"- Research success rate: {d['research'].get('success_rate', 0)}%",
        ]
        return "\n".join(lines)

    @staticmethod
    def _operational_markdown(d: dict) -> str:
        lines = [
            "# Operational Report\n",
            f"Generated: {d['generated_at']}\n",
            "## Workflow Operations\n",
            f"- Total instances: {d['workflows'].get('total_instances', 0)}",
            f"- Pending approvals: {d['workflows'].get('pending_approvals', 0)}",
            f"- Avg completion time (hrs): {d['workflows'].get('average_completion_hours', 'N/A')}\n",
            "## Support Operations\n",
            f"- Open tickets: {d['support'].get('open_tickets', 0)}",
            f"- Escalation rate: {d['support'].get('escalation_rate', 0)}%",
            f"- Avg resolution (hrs): {d['support'].get('average_resolution_hours', 'N/A')}\n",
            "## Omnichannel Operations\n",
            f"- Total messages: {d['omnichannel'].get('total_messages', 0)}",
            f"- Human handoffs: {d['omnichannel'].get('human_handoffs', 0)}",
            f"- AI replies sent: {d['omnichannel'].get('ai_reply_count', 0)}\n",
            "## Browser Automation\n",
            f"- Total tasks: {d['browser'].get('total_tasks', 0)}",
            f"- Success rate: {d['browser'].get('success_rate', 0)}%",
        ]
        return "\n".join(lines)

    @staticmethod
    def _business_markdown(d: dict) -> str:
        lines = [
            "# Business Report\n",
            f"Generated: {d['generated_at']}\n",
            "## Research & Intelligence\n",
            f"- Total reports: {d['research'].get('total_reports', 0)}",
            f"- Success rate: {d['research'].get('success_rate', 0)}%\n",
            "## Customer Support\n",
            f"- Total tickets: {d['support'].get('total_tickets', 0)}",
            f"- Sentiment distribution: {d['support'].get('sentiment_distribution', {})}\n",
            "## AI Adoption\n",
            f"- Total AI employee runs: {d['employees'].get('total_runs', 0)}",
            f"- Collaboration runs: {d['collaboration'].get('total_runs', 0)}",
            f"- Voice interactions: {d['voice'].get('total_interactions', 0)}\n",
            "## Trend Analysis\n",
            "Knowledge gaps identified:",
        ]
        for gap in d["knowledge"].get("knowledge_gaps", [])[:5]:
            lines.append(f"- {gap['topic']} ({gap['count']} misses, {gap['severity']})")
        return "\n".join(lines)
