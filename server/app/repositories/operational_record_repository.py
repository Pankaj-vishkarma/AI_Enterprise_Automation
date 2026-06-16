import json

from sqlalchemy.orm import Session

from app.models.operational_record import OperationalRecord


class OperationalRecordRepository:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def serialize(record: OperationalRecord) -> dict:
        return {
            "id": record.id,
            "organization_id": record.organization_id,
            "created_by_user_id": record.created_by_user_id,
            "module": record.module,
            "record_type": record.record_type,
            "title": record.title,
            "status": record.status,
            "data": json.loads(record.data_json or "{}"),
            "created_at": record.created_at,
            "updated_at": record.updated_at,
        }

    def list(self, organization_id: int, module: str):
        return (
            self.db.query(OperationalRecord)
            .filter(
                OperationalRecord.organization_id == organization_id,
                OperationalRecord.module == module,
            )
            .order_by(OperationalRecord.updated_at.desc(), OperationalRecord.id.desc())
            .all()
        )

    def get(self, organization_id: int, module: str, record_id: int):
        return (
            self.db.query(OperationalRecord)
            .filter(
                OperationalRecord.id == record_id,
                OperationalRecord.organization_id == organization_id,
                OperationalRecord.module == module,
            )
            .first()
        )

    def create(self, organization_id: int, user_id: int, module: str, payload: dict):
        record = OperationalRecord(
            organization_id=organization_id,
            created_by_user_id=user_id,
            module=module,
            record_type=payload.get("record_type", "item"),
            title=payload["title"],
            status=payload.get("status", "active"),
            data_json=json.dumps(payload.get("data", {})),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def update(self, record: OperationalRecord, payload: dict):
        if payload.get("title") is not None:
            record.title = payload["title"]
        if payload.get("status") is not None:
            record.status = payload["status"]
        if payload.get("data") is not None:
            current = json.loads(record.data_json or "{}")
            current.update(payload["data"])
            record.data_json = json.dumps(current)
        self.db.commit()
        self.db.refresh(record)
        return record

    def count(self, organization_id: int, module: str, status: str | None = None) -> int:
        query = self.db.query(OperationalRecord).filter(
            OperationalRecord.organization_id == organization_id,
            OperationalRecord.module == module,
        )
        if status:
            query = query.filter(OperationalRecord.status == status)
        return query.count()
