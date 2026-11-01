import logging
import numpy as np
from typing import List, Dict, Any, Tuple
from .embeddings import embed_query
from .store import get_chunks, get_embeddings, get_metadata, document_exists

logger = logging.getLogger("sarkari-saathi-rag.retriever")


def retrieve_relevant_passages(
    doc_id: str,
    query: str,
    top_k: int = 4,
    min_similarity: float = 0.20
) -> Tuple[List[Dict[str, Any]], float]:
    """
    Performs semantic search on a specific document's chunks using cosine similarity.
    
    Args:
        doc_id: Unique document ID
        query: User question
        top_k: Maximum number of passages to return
        min_similarity: Minimum cosine similarity threshold
        
    Returns:
        tuple: (passages, max_similarity_score)
        where each passage is:
        {
            "document_id": str,
            "filename": str,
            "page": int,
            "text": str,
            "similarity_score": float,
            "chunk_id": str
        }
    """
    if not document_exists(doc_id):
        raise FileNotFoundError(f"Document with ID '{doc_id}' does not exist.")

    chunks = get_chunks(doc_id)
    embeddings = get_embeddings(doc_id)
    metadata = get_metadata(doc_id) or {}
    filename = metadata.get("filename", "document.pdf")

    if not chunks or embeddings is None or len(chunks) == 0:
        return [], 0.0

    query_vec = embed_query(query)

    # Both embeddings and query_vec are L2-normalized, so dot product == cosine similarity
    scores = np.dot(embeddings, query_vec)

    # Sort descending
    sorted_indices = np.argsort(scores)[::-1]

    max_score = float(scores[sorted_indices[0]]) if len(sorted_indices) > 0 else 0.0

    passages: List[Dict[str, Any]] = []
    seen_texts = set()

    for idx in sorted_indices:
        score = float(scores[idx])
        if score < min_similarity:
            continue

        chunk = chunks[idx]
        text = chunk["text"]

        # Deduplicate identical or near-identical text
        text_key = text[:80]
        if text_key in seen_texts:
            continue
        seen_texts.add(text_key)

        passages.append({
            "document_id": doc_id,
            "filename": filename,
            "page": chunk["page"],
            "text": text,
            "similarity_score": round(score, 4),
            "chunk_id": chunk.get("chunk_id", f"{doc_id}_c{idx}")
        })

        if len(passages) >= top_k:
            break

    logger.info(f"Retrieved {len(passages)} passages for doc {doc_id} (max_score={max_score:.4f})")
    return passages, max_score
