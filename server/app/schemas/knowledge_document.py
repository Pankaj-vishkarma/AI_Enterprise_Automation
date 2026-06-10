from pydantic import BaseModel, Field

SUPPORTED_KNOWLEDGE_DOCUMENT_TYPES = [
    "Employee Handbooks",
    "Company Policies",
    "SOPs",
    "Contracts",
    "Product Documentation",
    "User Guides",
    "Training Materials",
    "FAQ Documents",
    "Internal Documentation",
]


class KnowledgeDocumentChunkCreate(BaseModel):
    chunk_index: int
    chunk_text: str
    page_number: int | None = None
    section_heading: str | None = None
    token_count: int | None = None
    embedding_status: str = "pending"
    embedding_ref: str | None = None


class KnowledgeDocumentChunkResponse(BaseModel):
    id: int
    document_id: int
    organization_id: int
    chunk_index: int
    chunk_text: str
    page_number: int | None = None
    section_heading: str | None = None
    token_count: int | None = None
    embedding_status: str
    embedding_ref: str | None = None

    class Config:
        from_attributes = True


class KnowledgeDocumentCreate(BaseModel):
    title: str
    document_type: str
    source_type: str = "upload"
    file_name: str
    storage_path: str
    mime_type: str | None = None
    checksum: str | None = None
    chunks: list[KnowledgeDocumentChunkCreate] = Field(default_factory=list)


class KnowledgeDocumentUpdate(BaseModel):
    title: str
    document_type: str
    source_type: str = "upload"
    file_name: str
    storage_path: str
    mime_type: str | None = None
    checksum: str | None = None
    status: str = "uploaded"
    is_active: bool = True


class KnowledgeDocumentResponse(BaseModel):
    id: int
    organization_id: int
    uploaded_by_user_id: int
    title: str
    document_type: str
    source_type: str
    file_name: str
    storage_path: str
    mime_type: str | None = None
    checksum: str | None = None
    status: str
    is_active: bool

    class Config:
        from_attributes = True
