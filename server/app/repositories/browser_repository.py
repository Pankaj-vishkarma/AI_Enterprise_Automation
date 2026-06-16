import json
from collections import Counter
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.browser_task import BrowserTask


class BrowserRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_tasks(self, organization_id: int, limit: int = 50, offset: int = 0):
        return (
            self.db.query(BrowserTask)
            .filter(
                BrowserTask.organization_id == organization_id,
                BrowserTask.is_deleted.is_(False),
            )
            .order_by(BrowserTask.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def get_task(self, organization_id: int, task_id: int):
        return (
            self.db.query(BrowserTask)
            .filter(
                BrowserTask.organization_id == organization_id,
                BrowserTask.id == task_id,
                BrowserTask.is_deleted.is_(False),
            )
            .first()
        )

    def create_task(self, organization_id: int, user_id: int, payload: dict) -> BrowserTask:
        task = BrowserTask(
            organization_id=organization_id,
            created_by_user_id=user_id,
            title=payload["title"],
            instruction=payload["instruction"],
            task_type=payload.get("task_type", "general"),
            target_url=payload.get("target_url"),
            status=payload.get("status", "completed"),
            results_json=json.dumps(payload.get("results", [])),
            logs_json=json.dumps(payload.get("logs", [])),
            errors_json=json.dumps(payload.get("errors", [])),
            pages_visited_json=json.dumps(payload.get("pages_visited", [])),
            summary=payload.get("summary"),
            report_text=payload.get("report_text"),
            execution_time_ms=payload.get("execution_time_ms"),
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def soft_delete(self, task: BrowserTask):
        task.is_deleted = True
        self.db.commit()

    def update_task(self, task: BrowserTask, payload: dict) -> BrowserTask:
        for field in (
            "title", "instruction", "task_type", "target_url", "status",
            "summary", "report_text", "execution_time_ms",
        ):
            if field in payload:
                setattr(task, field, payload[field])
        for json_field, key in (
            ("results_json", "results"),
            ("logs_json", "logs"),
            ("errors_json", "errors"),
            ("pages_visited_json", "pages_visited"),
        ):
            if key in payload:
                setattr(task, json_field, json.dumps(payload[key]))
        self.db.commit()
        self.db.refresh(task)
        return task

    def get_metrics(self, organization_id: int) -> Dict:
        tasks = (
            self.db.query(BrowserTask)
            .filter(
                BrowserTask.organization_id == organization_id,
                BrowserTask.is_deleted.is_(False),
            )
            .all()
        )
        total = len(tasks)
        completed = sum(1 for t in tasks if t.status == "completed")
        failed = sum(1 for t in tasks if t.status == "failed")
        times = [t.execution_time_ms for t in tasks if t.execution_time_ms is not None]
        type_counter = Counter(t.task_type for t in tasks)
        return {
            "total_tasks": total,
            "completed_tasks": completed,
            "failed_tasks": failed,
            "average_execution_time_ms": round(sum(times) / len(times), 1) if times else None,
            "success_rate": round(completed * 100 / total, 1) if total else 0.0,
            "task_type_breakdown": [
                {"task_type": ttype, "count": count} for ttype, count in type_counter.most_common()
            ],
        }
