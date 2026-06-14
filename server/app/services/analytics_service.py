import json
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import case, func, or_, text
from sqlalchemy.orm import Session, joinedload

from app.clients.redis_client import get_redis
from app.core.database import SessionLocal
from app.models.ai_employee import AIEmployee
from app.models.ai_employee_run import AIEmployeeRun
from app.models.knowledge_document import KnowledgeDocument
from app.models.knowledge_document_chunk import KnowledgeDocumentChunk
from app.models.knowledge_query import KnowledgeQuery
from app.models.omnichannel_conversation import OmnichannelConversation
from app.models.omnichannel_message import OmnichannelMessage
from app.models.user import User
from app.models.workflow import Workflow, WorkflowInstance, WorkflowInstanceStep
from app.repositories.ai_employee_repository import AIEmployeeRepository
from app.repositories.browser_repository import BrowserRepository
from app.repositories.collaboration_repository import CollaborationRepository
from app.repositories.research_repository import ResearchRepository
from app.repositories.voice_repository import VoiceRepository
from app.repositories.workflow_repository import WorkflowRepository
from app.services.support_service import SupportService

_DASHBOARD_SECTIONS = (
    "knowledge",
    "employees",
    "workflows",
    "support",
    "research",
    "browser",
    "voice",
    "omnichannel",
    "organization",
    "collaboration",
)


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

    def _cache_set(self, key: str, payload: dict, ttl: int = 300) -> None:
        redis = get_redis()
        if not redis:
            return
        try:
            redis.setex(key, ttl, json.dumps(payload, default=str))
        except Exception:
            pass

    def _knowledge_analytics(self, org_id: int, start: Optional[datetime], end: Optional[datetime]) -> dict:
        doc_filters = [KnowledgeDocument.organization_id == org_id]
        total_documents, documents_active = (
            self.db.query(
                func.count(KnowledgeDocument.id),
                func.sum(case((KnowledgeDocument.is_active.is_(True), 1), else_=0)),
            )
            .filter(*doc_filters)
            .one()
        )
        total_documents = int(total_documents or 0)
        documents_active = int(documents_active or 0)
        type_rows = (
            self.db.query(KnowledgeDocument.document_type, func.count(KnowledgeDocument.id))
            .filter(*doc_filters)
            .group_by(KnowledgeDocument.document_type)
            .all()
        )
        type_counts = Counter({doc_type: count for doc_type, count in type_rows})

        query_filters = [KnowledgeQuery.organization_id == org_id]
        if start:
            query_filters.append(KnowledgeQuery.created_at >= start)
        if end:
            query_filters.append(KnowledgeQuery.created_at <= end)

        topic_and_gap_rows = (
            self.db.query(
                KnowledgeQuery.question_text,
                func.count(KnowledgeQuery.id).label("query_count"),
                func.sum(
                    case(
                        (
                            or_(
                                KnowledgeQuery.matched_document_ids.is_(None),
                                KnowledgeQuery.matched_document_ids == "",
                                KnowledgeQuery.matched_document_ids == "[]",
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ).label("gap_count"),
            )
            .filter(*query_filters)
            .group_by(KnowledgeQuery.question_text)
            .order_by(func.count(KnowledgeQuery.id).desc())
            .all()
        )
        topic_counts = Counter()
        gap_topics = Counter()
        for question_text, query_count, gap_count in topic_and_gap_rows:
            topic_counts[question_text] = int(query_count)
            if int(gap_count or 0) > 0:
                gap_topics[question_text] = int(gap_count)
        query_volume = sum(topic_counts.values())

        accessed_sql = """
            SELECT doc_id::int AS document_id, COUNT(*) AS access_count
            FROM knowledge_queries,
            LATERAL json_array_elements_text(matched_document_ids::json) AS doc_id
            WHERE organization_id = :org_id
              AND matched_document_ids IS NOT NULL
              AND matched_document_ids NOT IN ('', '[]')
        """
        accessed_params: Dict[str, Any] = {"org_id": org_id}
        if start:
            accessed_sql += " AND created_at >= :start_date"
            accessed_params["start_date"] = start
        if end:
            accessed_sql += " AND created_at <= :end_date"
            accessed_params["end_date"] = end
        accessed_sql += """
            GROUP BY doc_id
            ORDER BY access_count DESC
            LIMIT 10
        """
        accessed_rows = self.db.execute(text(accessed_sql), accessed_params).fetchall()
        accessed_document_ids = Counter({int(row[0]): int(row[1]) for row in accessed_rows})

        doc_titles = {}
        if accessed_document_ids:
            title_rows = (
                self.db.query(KnowledgeDocument.id, KnowledgeDocument.title)
                .filter(
                    KnowledgeDocument.organization_id == org_id,
                    KnowledgeDocument.id.in_(accessed_document_ids.keys()),
                )
                .all()
            )
            doc_titles = {doc_id: title for doc_id, title in title_rows}

        chunks_total = (
            self.db.query(func.count(KnowledgeDocumentChunk.id))
            .filter(KnowledgeDocumentChunk.organization_id == org_id)
            .scalar()
            or 0
        )

        return {
            "total_documents": total_documents,
            "documents_by_category": dict(type_counts),
            "documents_active": documents_active,
            "chunks_total": chunks_total,
            "query_volume": query_volume,
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
        employee_repo = AIEmployeeRepository(self.db)
        total_employees = employee_repo.count_total(org_id)
        active_employees = employee_repo.count_active(org_id)
        employee_names = employee_repo.employee_name_map(org_id)

        run_filters = [AIEmployeeRun.organization_id == org_id]
        if start:
            run_filters.append(AIEmployeeRun.created_at >= start)
        if end:
            run_filters.append(AIEmployeeRun.created_at <= end)

        status_rows = (
            self.db.query(AIEmployeeRun.status, func.count(AIEmployeeRun.id))
            .filter(*run_filters)
            .group_by(AIEmployeeRun.status)
            .all()
        )
        status_counts = {status: int(count) for status, count in status_rows}
        completed = status_counts.get("completed", 0)
        failed = status_counts.get("failed", 0)
        total_runs = sum(status_counts.values())

        employee_rows = (
            self.db.query(AIEmployeeRun.employee_id, func.count(AIEmployeeRun.id))
            .filter(*run_filters)
            .group_by(AIEmployeeRun.employee_id)
            .order_by(func.count(AIEmployeeRun.id).desc())
            .limit(10)
            .all()
        )

        avg_execution_time_ms = self.db.query(
            func.avg(AIEmployeeRun.execution_time_ms)
        ).filter(*run_filters, AIEmployeeRun.execution_time_ms.isnot(None)).scalar()

        tool_sql = """
            SELECT tool_name, COUNT(*) AS usage_count
            FROM ai_employee_runs,
            LATERAL json_array_elements_text(tools_used_json::json) AS tool_name
            WHERE organization_id = :org_id
              AND tools_used_json IS NOT NULL
              AND tools_used_json NOT IN ('', '[]')
        """
        tool_params: Dict[str, Any] = {"org_id": org_id}
        if start:
            tool_sql += " AND created_at >= :start_date"
            tool_params["start_date"] = start
        if end:
            tool_sql += " AND created_at <= :end_date"
            tool_params["end_date"] = end
        tool_sql += """
            GROUP BY tool_name
            ORDER BY usage_count DESC
            LIMIT 10
        """
        tool_rows = self.db.execute(text(tool_sql), tool_params).fetchall()
        tool_counter = Counter({row[0]: int(row[1]) for row in tool_rows})

        return {
            "total_employees": total_employees,
            "active_employees": active_employees,
            "total_runs": total_runs,
            "successful_runs": completed,
            "failed_runs": failed,
            "success_rate": round(completed * 100 / total_runs, 1) if total_runs else 0.0,
            "average_execution_time_ms": (
                round(float(avg_execution_time_ms), 1) if avg_execution_time_ms is not None else None
            ),
            "tool_usage": [{"tool": t, "count": c} for t, c in tool_counter.most_common(10)],
            "most_active_employees": [
                {
                    "employee_id": eid,
                    "name": employee_names.get(eid, f"Employee {eid}"),
                    "runs": int(count),
                    "share_percent": round(int(count) * 100 / total_runs, 1) if total_runs else 0,
                }
                for eid, count in employee_rows
            ],
        }

    def _workflow_base_metrics(self, org_id: int) -> dict:
        instance_rows = (
            self.db.query(WorkflowInstance.status, func.count(WorkflowInstance.id))
            .filter(WorkflowInstance.organization_id == org_id)
            .group_by(WorkflowInstance.status)
            .all()
        )
        status_counts = {status: int(count) for status, count in instance_rows}
        total_instances = sum(status_counts.values())
        completed = status_counts.get("completed", 0)

        workflow_rows = (
            self.db.query(Workflow.status, func.count(Workflow.id))
            .filter(Workflow.organization_id == org_id, Workflow.is_deleted.is_(False))
            .group_by(Workflow.status)
            .all()
        )
        workflow_counts = {status: int(count) for status, count in workflow_rows}

        return {
            "total_workflows": sum(workflow_counts.values()),
            "active_workflows": workflow_counts.get("active", 0),
            "total_instances": total_instances,
            "completed_instances": completed,
            "in_progress_instances": status_counts.get("in_progress", 0),
            "rejected_instances": status_counts.get("rejected", 0),
            "completion_rate": round(completed * 100 / total_instances, 1) if total_instances else 0.0,
        }

    def _workflow_analytics(self, current_user, start: Optional[datetime], end: Optional[datetime]) -> dict:
        workflow_repo = WorkflowRepository(self.db)
        base = self._workflow_base_metrics(current_user.organization_id)
        org_id = current_user.organization_id

        instance_filters = [WorkflowInstance.organization_id == org_id]
        if start:
            instance_filters.append(WorkflowInstance.created_at >= start)
        if end:
            instance_filters.append(WorkflowInstance.created_at <= end)

        performance_rows = (
            self.db.query(
                WorkflowInstance.workflow_id,
                func.count(WorkflowInstance.id),
                func.sum(case((WorkflowInstance.status == "completed", 1), else_=0)),
            )
            .filter(*instance_filters)
            .group_by(WorkflowInstance.workflow_id)
            .all()
        )
        workflow_names = workflow_repo.workflow_name_map(org_id)
        performance = []
        for wf_id, total, completed in performance_rows:
            total = int(total or 0)
            completed = int(completed or 0)
            performance.append({
                "workflow_id": wf_id,
                "workflow_name": workflow_names.get(wf_id, f"Workflow {wf_id}"),
                "completion_rate": round(completed * 100 / total, 1) if total else 0.0,
                "total_instances": total,
                "completed_instances": completed,
            })
        performance.sort(key=lambda x: x["total_instances"], reverse=True)

        avg_completion_hours = self.db.query(
            func.avg(
                func.extract(
                    "epoch",
                    WorkflowInstance.completed_at - WorkflowInstance.created_at,
                )
                / 3600.0
            )
        ).filter(
            *instance_filters,
            WorkflowInstance.status == "completed",
            WorkflowInstance.completed_at.isnot(None),
            WorkflowInstance.created_at.isnot(None),
        ).scalar()

        pending_filters = [
            WorkflowInstance.organization_id == org_id,
            WorkflowInstance.status == "in_progress",
            WorkflowInstanceStep.status == "pending",
        ]
        if start:
            pending_filters.append(WorkflowInstance.created_at >= start)
        if end:
            pending_filters.append(WorkflowInstance.created_at <= end)

        pending_approvals = (
            self.db.query(func.count(WorkflowInstanceStep.id))
            .join(WorkflowInstance, WorkflowInstance.id == WorkflowInstanceStep.instance_id)
            .filter(*pending_filters)
            .scalar()
            or 0
        )

        pending_rows = (
            self.db.query(
                WorkflowInstanceStep.name,
                WorkflowInstance.id,
                WorkflowInstance.created_at,
            )
            .join(WorkflowInstance, WorkflowInstance.id == WorkflowInstanceStep.instance_id)
            .filter(*pending_filters)
            .order_by(WorkflowInstance.created_at.asc())
            .limit(10)
            .all()
        )
        step_delays: List[Dict[str, Any]] = []
        now = self._now()
        for step_name, instance_id, created_at in pending_rows:
            if not created_at:
                continue
            created = created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            delay_hours = (now - created).total_seconds() / 3600
            step_delays.append({
                "step_name": step_name,
                "workflow_instance_id": instance_id,
                "delay_hours": round(delay_hours, 1),
            })

        bottlenecks = sorted(step_delays, key=lambda x: x["delay_hours"], reverse=True)[:10]
        for item in bottlenecks:
            item["severity"] = "Critical" if item["delay_hours"] >= 48 else "Minor" if item["delay_hours"] < 24 else "Medium"

        return {
            **base,
            "average_completion_hours": (
                round(float(avg_completion_hours), 1) if avg_completion_hours is not None else None
            ),
            "pending_approvals": int(pending_approvals),
            "workflow_performance": performance,
            "bottlenecks": bottlenecks,
        }

    def _support_analytics(self, current_user) -> dict:
        return SupportService(self.db).get_metrics(current_user)

    def _research_analytics(self, org_id: int, start: Optional[datetime], end: Optional[datetime]) -> dict:
        metrics = ResearchRepository(self.db).get_metrics(org_id)
        if not start and not end:
            metrics["research_categories"] = metrics.pop("research_type_breakdown", [])
            return metrics

        reports = ResearchRepository(self.db).list_reports(org_id, limit=5000)
        reports = [r for r in reports if self._in_range(r.created_at, start, end)]
        completed = sum(1 for r in reports if r.status == "completed")
        total = len(reports)
        return {
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

    def _browser_analytics(self, org_id: int, start: Optional[datetime], end: Optional[datetime]) -> dict:
        if not start and not end:
            return BrowserRepository(self.db).get_metrics(org_id)

        tasks = BrowserRepository(self.db).list_tasks(org_id, limit=5000)
        tasks = [t for t in tasks if self._in_range(t.created_at, start, end)]
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
        conv_filters = [OmnichannelConversation.organization_id == org_id]
        msg_filters = [OmnichannelMessage.organization_id == org_id]
        if start:
            conv_filters.append(OmnichannelConversation.created_at >= start)
            msg_filters.append(OmnichannelMessage.created_at >= start)
        if end:
            conv_filters.append(OmnichannelConversation.created_at <= end)
            msg_filters.append(OmnichannelMessage.created_at <= end)

        if start or end:
            convs = self.db.query(OmnichannelConversation).filter(*conv_filters).all()
            messages = self.db.query(OmnichannelMessage).filter(*msg_filters).all()
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

        channel_rows = (
            self.db.query(OmnichannelConversation.channel, func.count(OmnichannelConversation.id))
            .filter(*conv_filters)
            .group_by(OmnichannelConversation.channel)
            .all()
        )
        return {
            "total_conversations": self.db.query(func.count(OmnichannelConversation.id)).filter(*conv_filters).scalar() or 0,
            "conversations_by_channel": {channel: count for channel, count in channel_rows},
            "human_handoffs": (
                self.db.query(func.count(OmnichannelConversation.id))
                .filter(*conv_filters, OmnichannelConversation.handoff_status == "human")
                .scalar()
                or 0
            ),
            "ai_reply_count": (
                self.db.query(func.count(OmnichannelMessage.id))
                .filter(*msg_filters, OmnichannelMessage.sender_type == "ai")
                .scalar()
                or 0
            ),
            "total_messages": self.db.query(func.count(OmnichannelMessage.id)).filter(*msg_filters).scalar() or 0,
            "active_conversations": (
                self.db.query(func.count(OmnichannelConversation.id))
                .filter(*conv_filters, OmnichannelConversation.status.in_(["AI Active", "Human Active"]))
                .scalar()
                or 0
            ),
        }

    def _organization_analytics(self, org_id: int, start: Optional[datetime], end: Optional[datetime]) -> dict:
        active_users = (
            self.db.query(func.count(User.id))
            .filter(User.organization_id == org_id, User.is_active.is_(True))
            .scalar()
            or 0
        )

        run_filters = [AIEmployeeRun.organization_id == org_id]
        if start:
            run_filters.append(AIEmployeeRun.created_at >= start)
        if end:
            run_filters.append(AIEmployeeRun.created_at <= end)

        user_activity_rows = (
            self.db.query(AIEmployeeRun.user_id, func.count(AIEmployeeRun.id))
            .filter(*run_filters)
            .group_by(AIEmployeeRun.user_id)
            .order_by(func.count(AIEmployeeRun.id).desc())
            .limit(10)
            .all()
        )

        dept_activity_rows = (
            self.db.query(AIEmployee.department_id, func.count(AIEmployeeRun.id))
            .join(AIEmployee, AIEmployee.id == AIEmployeeRun.employee_id)
            .filter(*run_filters, AIEmployee.department_id.isnot(None))
            .group_by(AIEmployee.department_id)
            .order_by(func.count(AIEmployeeRun.id).desc())
            .limit(10)
            .all()
        )

        from app.models.department import Department

        dept_ids = [dept_id for dept_id, _ in dept_activity_rows]
        dept_names = {}
        if dept_ids:
            dept_names = {
                dept_id: name
                for dept_id, name in self.db.query(Department.id, Department.name)
                .filter(Department.organization_id == org_id, Department.id.in_(dept_ids))
                .all()
            }

        return {
            "active_users": active_users,
            "department_activity": [
                {"department_id": did, "name": dept_names.get(did, f"Dept {did}"), "events": int(count)}
                for did, count in dept_activity_rows
            ],
            "team_activity": [],
            "most_active_users": [
                {"user_id": uid, "events": int(count)}
                for uid, count in user_activity_rows
            ],
        }

    @staticmethod
    def _load_user_for_section(db: Session, user_id: int):
        return (
            db.query(User)
            .options(joinedload(User.role))
            .filter(User.id == user_id)
            .first()
        )

    @classmethod
    def _run_dashboard_section(
        cls,
        section: str,
        user_id: int,
        org_id: int,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
    ) -> tuple:
        db = SessionLocal()
        try:
            user = cls._load_user_for_section(db, user_id)
            if not user:
                raise RuntimeError(f"User {user_id} not found for dashboard section '{section}'")
            service = cls(db)
            if section == "knowledge":
                payload = service._knowledge_analytics(org_id, start_date, end_date)
            elif section == "employees":
                payload = service._employee_analytics(user, org_id, start_date, end_date)
            elif section == "workflows":
                payload = service._workflow_analytics(user, start_date, end_date)
            elif section == "support":
                payload = service._support_analytics(user)
            elif section == "research":
                payload = service._research_analytics(org_id, start_date, end_date)
            elif section == "browser":
                payload = service._browser_analytics(org_id, start_date, end_date)
            elif section == "voice":
                payload = service._voice_analytics(org_id, start_date, end_date)
            elif section == "omnichannel":
                payload = service._omnichannel_analytics(org_id, start_date, end_date)
            elif section == "organization":
                payload = service._organization_analytics(org_id, start_date, end_date)
            elif section == "collaboration":
                payload = CollaborationRepository(db).get_metrics(org_id)
            else:
                raise ValueError(f"Unknown dashboard section: {section}")
            return section, payload
        finally:
            db.close()

    def _build_dashboard_sections(
        self,
        current_user,
        org_id: int,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
    ) -> Dict[str, dict]:
        user_id = current_user.id
        results: Dict[str, dict] = {}
        with ThreadPoolExecutor(max_workers=len(_DASHBOARD_SECTIONS)) as executor:
            futures = [
                executor.submit(
                    self._run_dashboard_section,
                    section,
                    user_id,
                    org_id,
                    start_date,
                    end_date,
                )
                for section in _DASHBOARD_SECTIONS
            ]
            for future in as_completed(futures):
                section, payload = future.result()
                results[section] = payload
        return results

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

        sections = self._build_dashboard_sections(current_user, org_id, start_date, end_date)
        knowledge = sections["knowledge"]
        employees = sections["employees"]
        workflows = sections["workflows"]
        support = sections["support"]
        research = sections["research"]
        browser = sections["browser"]
        voice = sections["voice"]
        omnichannel = sections["omnichannel"]
        organization = sections["organization"]
        collaboration = sections["collaboration"]

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
