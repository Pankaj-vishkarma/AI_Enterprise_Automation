import json

from sqlalchemy.orm import Session

from app.models.knowledge_query import KnowledgeQuery


class KnowledgeQueryRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        organization_id: int,
        user_id: int,
        question_text: str,
        answer_text: str,
        matched_document_ids: list[int],
        matched_chunk_ids: list[int],
        query_status: str = "answered",
    ):
        query = KnowledgeQuery(
            organization_id=organization_id,
            user_id=user_id,
            question_text=question_text,
            answer_text=answer_text,
            matched_document_ids=json.dumps(matched_document_ids),
            matched_chunk_ids=json.dumps(matched_chunk_ids),
            query_status=query_status,
        )

        self.db.add(query)
        self.db.commit()
        self.db.refresh(query)

        return query

    def list_by_organization(self, organization_id: int):
        return (
            self.db.query(KnowledgeQuery)
            .filter(KnowledgeQuery.organization_id == organization_id)
            .order_by(KnowledgeQuery.id.desc())
            .all()
        )
