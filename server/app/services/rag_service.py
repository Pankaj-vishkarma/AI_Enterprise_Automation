from app.services.embedding_service import EmbeddingService
from app.services.vector_search_service import VectorSearchService
from app.services.knowledge_search_service import KnowledgeSearchService
from app.clients.groq_client import GroqClient
from app.repositories.knowledge_query_repository import KnowledgeQueryRepository


class RAGService:
    def __init__(self, db):
        self.db = db
        self.emb = EmbeddingService(db)
        self.search = VectorSearchService(db)
        self.groq = GroqClient()
        self.query_repo = KnowledgeQueryRepository(db)

    def retrieve_context(
        self,
        current_user,
        question_text: str,
        top_k: int = 5,
        document_ids: list | None = None,
    ) -> str:
        """Retrieve knowledge context without persisting a query record."""
        qvec = self.emb.embed_texts([question_text])[0]
        results = self.search.search(current_user.organization_id, qvec, top_k=top_k)
        if not results:
            ks = KnowledgeSearchService(self.db)
            _, chunks = ks.ask(current_user, question_text, top_k)
            results = [(1.0, c) for c in chunks]
        if document_ids:
            allowed = set(document_ids)
            results = [(score, chunk) for score, chunk in results if chunk.document_id in allowed]
        context_lines = [chunk.chunk_text.strip() for _, chunk in results]
        return "\n\n".join(context_lines)

    def ask(self, current_user, question_text: str, top_k: int = 5):
        qvec = self.emb.embed_texts([question_text])[0]
        results = self.search.search(current_user.organization_id, qvec, top_k=top_k)
        # hybrid fallback to keyword search if vector search yields no results
        if not results:
            ks = KnowledgeSearchService(self.db)
            _, chunks = ks.ask(current_user, question_text, top_k)
            results = [(1.0, c) for c in chunks]
        matched_chunk_ids = [c.id for _, c in results]
        matched_document_ids = []
        context_lines = []
        for score, chunk in results:
            if chunk.document_id not in matched_document_ids:
                matched_document_ids.append(chunk.document_id)
            context_lines.append(chunk.chunk_text.strip())

        context = "\n\n".join(context_lines)
        prompt = f"Use the following context to answer the question. Context:\n{context}\n\nQuestion: {question_text}\nAnswer:"
        resp = self.groq.generate(prompt)
        answer_text = (
            resp.get("output", {}).get("text", "")
            if isinstance(resp, dict)
            else str(resp)
        )

        query = self.query_repo.create(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            question_text=question_text,
            answer_text=answer_text,
            matched_document_ids=matched_document_ids,
            matched_chunk_ids=matched_chunk_ids,
        )

        return query, [c for _, c in results]
