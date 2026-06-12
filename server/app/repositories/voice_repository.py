import json
from collections import Counter
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.operational_record import OperationalRecord
from app.models.voice_session import VoiceSession


class VoiceRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_session(self, organization_id: int, user_id: int, assistant_preference: Optional[str] = None) -> VoiceSession:
        session = VoiceSession(
            organization_id=organization_id,
            user_id=user_id,
            status="active",
            assistant_preference=assistant_preference,
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_session(self, organization_id: int, session_id: int) -> Optional[VoiceSession]:
        return (
            self.db.query(VoiceSession)
            .filter(
                VoiceSession.id == session_id,
                VoiceSession.organization_id == organization_id,
            )
            .first()
        )

    def list_sessions(self, organization_id: int, user_id: Optional[int] = None, limit: int = 50):
        query = self.db.query(VoiceSession).filter(VoiceSession.organization_id == organization_id)
        if user_id is not None:
            query = query.filter(VoiceSession.user_id == user_id)
        return query.order_by(VoiceSession.started_at.desc()).limit(limit).all()

    def close_session(self, session: VoiceSession) -> VoiceSession:
        now = datetime.now(timezone.utc)
        session.status = "closed"
        session.ended_at = now
        if session.started_at:
            started = session.started_at
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            session.duration_seconds = max(0, int((now - started).total_seconds()))
        self.db.commit()
        self.db.refresh(session)
        return session

    def create_interaction(
        self,
        organization_id: int,
        user_id: int,
        payload: dict,
    ) -> OperationalRecord:
        record = OperationalRecord(
            organization_id=organization_id,
            created_by_user_id=user_id,
            module="voice",
            record_type=payload.get("record_type", "interaction"),
            title=payload["title"],
            status=payload.get("status", "completed"),
            data_json=json.dumps(payload.get("data", {})),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def list_interactions(self, organization_id: int, session_id: Optional[int] = None, limit: int = 100):
        records = (
            self.db.query(OperationalRecord)
            .filter(
                OperationalRecord.organization_id == organization_id,
                OperationalRecord.module == "voice",
                OperationalRecord.record_type == "interaction",
            )
            .order_by(OperationalRecord.created_at.desc())
            .limit(limit * 3)
            .all()
        )
        if session_id is None:
            return records[:limit]
        filtered = []
        for record in records:
            data = json.loads(record.data_json or "{}")
            if data.get("session_id") == session_id:
                filtered.append(record)
            if len(filtered) >= limit:
                break
        return filtered

    def list_meetings(self, organization_id: int, limit: int = 50):
        return (
            self.db.query(OperationalRecord)
            .filter(
                OperationalRecord.organization_id == organization_id,
                OperationalRecord.module == "voice",
                OperationalRecord.record_type == "meeting",
            )
            .order_by(OperationalRecord.created_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def serialize_session(session: VoiceSession, interaction_count: int = 0) -> dict:
        return {
            "id": session.id,
            "organization_id": session.organization_id,
            "user_id": session.user_id,
            "status": session.status,
            "assistant_preference": session.assistant_preference,
            "started_at": session.started_at,
            "ended_at": session.ended_at,
            "duration_seconds": session.duration_seconds,
            "interaction_count": interaction_count,
        }

    @staticmethod
    def serialize_interaction(record: OperationalRecord) -> dict:
        data = json.loads(record.data_json or "{}")
        return {
            "id": record.id,
            "session_id": data.get("session_id"),
            "transcript": data.get("transcript", record.title),
            "answer": data.get("answer", ""),
            "intent": data.get("intent"),
            "module_invoked": data.get("module_invoked"),
            "assistant_used": data.get("assistant_used"),
            "duration_ms": data.get("duration_ms"),
            "metadata": data.get("metadata", {}),
            "created_at": record.created_at,
        }

    @staticmethod
    def serialize_meeting(record: OperationalRecord) -> dict:
        data = json.loads(record.data_json or "{}")
        return {
            "id": record.id,
            "title": record.title,
            "status": record.status,
            "notes": data.get("notes", ""),
            "summary": data.get("summary", ""),
            "action_items": data.get("action_items", []),
            "follow_up_recommendations": data.get("follow_up_recommendations", ""),
            "session_id": data.get("session_id"),
            "created_at": record.created_at,
        }

    def count_interactions_for_session(self, organization_id: int, session_id: int) -> int:
        records = self.list_interactions(organization_id, session_id=session_id, limit=1000)
        return len(records)

    def analytics(self, organization_id: int) -> dict:
        sessions = self.list_sessions(organization_id, limit=500)
        interactions = self.list_interactions(organization_id, limit=500)
        meetings = self.list_meetings(organization_id, limit=500)

        assistant_counter: Counter = Counter()
        intent_counter: Counter = Counter()
        module_counter: Counter = Counter()

        for record in interactions:
            data = json.loads(record.data_json or "{}")
            if data.get("assistant_used"):
                assistant_counter[data["assistant_used"]] += 1
            if data.get("intent"):
                intent_counter[data["intent"]] += 1
            if data.get("module_invoked"):
                module_counter[data["module_invoked"]] += 1

        durations = [s.duration_seconds for s in sessions if s.duration_seconds is not None]
        avg_duration = round(sum(durations) / len(durations), 1) if durations else None

        return {
            "total_interactions": len(interactions),
            "total_sessions": len(sessions),
            "active_sessions": sum(1 for s in sessions if s.status == "active"),
            "total_meetings": len(meetings),
            "most_used_assistants": [
                {"assistant": k, "count": v} for k, v in assistant_counter.most_common(10)
            ],
            "most_used_commands": [
                {"intent": k, "count": v} for k, v in intent_counter.most_common(10)
            ],
            "most_used_modules": [
                {"module": k, "count": v} for k, v in module_counter.most_common(10)
            ],
            "average_session_duration_seconds": avg_duration,
        }
