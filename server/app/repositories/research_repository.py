import json
from collections import Counter
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.research_report import ResearchReport


class ResearchRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_reports(self, organization_id: int, limit: int = 50, offset: int = 0):
        return (
            self.db.query(ResearchReport)
            .filter(
                ResearchReport.organization_id == organization_id,
                ResearchReport.is_deleted.is_(False),
            )
            .order_by(ResearchReport.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def get_report(self, organization_id: int, report_id: int):
        return (
            self.db.query(ResearchReport)
            .filter(
                ResearchReport.organization_id == organization_id,
                ResearchReport.id == report_id,
                ResearchReport.is_deleted.is_(False),
            )
            .first()
        )

    def create_report(self, organization_id: int, user_id: int, payload: dict) -> ResearchReport:
        report = ResearchReport(
            organization_id=organization_id,
            created_by_user_id=user_id,
            title=payload["title"],
            research_type=payload.get("research_type", "Business Intelligence"),
            request_text=payload["request_text"],
            status=payload.get("status", "completed"),
            sources_json=json.dumps(payload.get("sources", [])),
            intermediate_findings_json=json.dumps(payload.get("intermediate_findings", [])),
            citations_json=json.dumps(payload.get("citations", [])),
            final_report=payload.get("final_report", ""),
            summary=payload.get("summary"),
            recommendations=payload.get("recommendations"),
            confidence_score=payload.get("confidence_score"),
            execution_time_ms=payload.get("execution_time_ms"),
            agent_usage_json=json.dumps(payload.get("agent_usage", [])),
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

    def soft_delete(self, report: ResearchReport):
        report.is_deleted = True
        self.db.commit()

    def get_metrics(self, organization_id: int) -> Dict:
        reports = (
            self.db.query(ResearchReport)
            .filter(
                ResearchReport.organization_id == organization_id,
                ResearchReport.is_deleted.is_(False),
            )
            .all()
        )
        total = len(reports)
        completed = sum(1 for r in reports if r.status == "completed")
        failed = sum(1 for r in reports if r.status == "failed")
        times = [r.execution_time_ms for r in reports if r.execution_time_ms is not None]
        topic_counter = Counter(r.request_text[:120] for r in reports)
        type_counter = Counter(r.research_type for r in reports)
        return {
            "total_reports": total,
            "completed_reports": completed,
            "failed_reports": failed,
            "average_execution_time_ms": round(sum(times) / len(times), 1) if times else None,
            "success_rate": round(completed * 100 / total, 1) if total else 0.0,
            "most_requested_topics": [
                {"topic": topic, "count": count} for topic, count in topic_counter.most_common(10)
            ],
            "research_type_breakdown": [
                {"research_type": rtype, "count": count} for rtype, count in type_counter.most_common()
            ],
        }
