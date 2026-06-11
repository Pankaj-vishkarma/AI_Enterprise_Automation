import json
from typing import Set

from app.repositories.knowledge_document_chunk_repository import (
    KnowledgeDocumentChunkRepository,
)
from app.repositories.knowledge_query_repository import KnowledgeQueryRepository


class KnowledgeSearchService:

    def __init__(self, db):
        self.db = db
        self.chunk_repo = KnowledgeDocumentChunkRepository(db)
        self.query_repo = KnowledgeQueryRepository(db)

    def _score_chunk(self, question_terms: Set[str], chunk):
        haystack = f"{chunk.chunk_text} {chunk.section_heading or ''}".lower()
        return sum(1 for term in question_terms if term in haystack)

    def ask(self, current_user, question_text: str, top_k: int = 5):
        chunks = self.chunk_repo.list_by_organization(current_user.organization_id)
        question_terms = {
            term.strip().lower()
            for term in question_text.split()
            if len(term.strip()) > 2
        }

        ranked_chunks = sorted(
            chunks,
            key=lambda chunk: self._score_chunk(question_terms, chunk),
            reverse=True,
        )

        top_chunks = [
            chunk
            for chunk in ranked_chunks
            if self._score_chunk(question_terms, chunk) > 0
        ][:top_k]

        matched_document_ids = []
        matched_chunk_ids = []
        answer_lines = []

        for chunk in top_chunks:
            matched_chunk_ids.append(chunk.id)
            if chunk.document_id not in matched_document_ids:
                matched_document_ids.append(chunk.document_id)
            answer_lines.append(chunk.chunk_text.strip())

        if answer_lines:
            answer_text = "Relevant knowledge found:\n" + "\n\n".join(answer_lines)
        else:
            answer_text = (
                "No relevant knowledge found in your organization's documents."
            )

        query = self.query_repo.create(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            question_text=question_text,
            answer_text=answer_text,
            matched_document_ids=matched_document_ids,
            matched_chunk_ids=matched_chunk_ids,
        )

        return query, top_chunks

    def list_history(self, current_user):
        return self.query_repo.list_by_organization(current_user.organization_id)
