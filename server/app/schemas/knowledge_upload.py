from pydantic import BaseModel


class UploadResponse(BaseModel):
    document_id: int
    status: str
