import math
from typing import Dict, List


def chunk_text(text: str, max_tokens: int = 200, overlap: int = 50) -> List[Dict]:
    words = text.split()
    chunks = []
    if not words:
        return chunks
    step = max_tokens - overlap
    total = len(words)
    idx = 0
    chunk_index = 0
    while idx < total:
        part = words[idx : idx + max_tokens]
        chunk_text = " ".join(part)
        chunks.append(
            {
                "chunk_index": chunk_index,
                "chunk_text": chunk_text,
                "page_number": None,
                "section_heading": None,
                "token_count": len(part),
                "embedding_status": "pending",
                "embedding_ref": None,
            }
        )
        chunk_index += 1
        idx += step
    return chunks
