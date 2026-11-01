from typing import List, Dict, Any


def chunk_document_pages(
    document_id: str,
    filename: str,
    pages: List[Dict[str, Any]],
    chunk_size: int = 600,
    chunk_overlap: int = 120
) -> List[Dict[str, Any]]:
    """
    Chunks document pages into overlapping passages while strictly preserving
    the exact 1-indexed page number on every chunk.
    
    Args:
        document_id: Unique UUID of the document
        filename: Original file name
        pages: List of {"page": int, "text": str}
        chunk_size: Target characters per chunk
        chunk_overlap: Overlap characters between consecutive chunks
        
    Returns:
        List of chunk dicts:
        [
            {
                "chunk_id": str,
                "document_id": str,
                "filename": str,
                "page": int,
                "text": str,
                "char_count": int
            },
            ...
        ]
    """
    chunks: List[Dict[str, Any]] = []

    for page_data in pages:
        page_num = page_data["page"]
        text = page_data["text"]

        if not text or len(text.strip()) == 0:
            continue

        text = text.strip()

        # If page text fits in a single chunk, keep it intact
        if len(text) <= chunk_size:
            chunk_id = f"{document_id}_p{page_num}_c0"
            chunks.append({
                "chunk_id": chunk_id,
                "document_id": document_id,
                "filename": filename,
                "page": page_num,
                "text": text,
                "char_count": len(text)
            })
            continue

        # Split into overlapping windows by words or paragraphs
        start = 0
        chunk_idx = 0
        text_len = len(text)

        while start < text_len:
            end = min(start + chunk_size, text_len)

            # Try to snap end to the end of a sentence or space if not at the very end
            if end < text_len:
                last_period = text.rfind(". ", start, end)
                last_newline = text.rfind("\n", start, end)
                last_space = text.rfind(" ", start, end)

                if last_period != -1 and last_period > start + (chunk_size // 2):
                    end = last_period + 1
                elif last_newline != -1 and last_newline > start + (chunk_size // 2):
                    end = last_newline
                elif last_space != -1 and last_space > start + (chunk_size // 2):
                    end = last_space

            chunk_slice = text[start:end].strip()

            if len(chunk_slice) >= 30:  # Avoid trivial chunks
                chunk_id = f"{document_id}_p{page_num}_c{chunk_idx}"
                chunks.append({
                    "chunk_id": chunk_id,
                    "document_id": document_id,
                    "filename": filename,
                    "page": page_num,
                    "text": chunk_slice,
                    "char_count": len(chunk_slice)
                })
                chunk_idx += 1

            if end >= text_len:
                break

            # Advance by step with overlap
            start = max(end - chunk_overlap, start + 1)

    return chunks
