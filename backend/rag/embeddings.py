import logging
import numpy as np
from typing import List, Optional

logger = logging.getLogger("sarkari-saathi-rag.embeddings")

_EMBEDDING_MODEL = None
MODEL_NAME = "all-MiniLM-L6-v2"


def get_embedding_model():
    """Lazy-loads and caches the SentenceTransformer model in memory."""
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        logger.info(f"Loading local embedding model: {MODEL_NAME}...")
        from sentence_transformers import SentenceTransformer
        _EMBEDDING_MODEL = SentenceTransformer(MODEL_NAME)
        logger.info(f"Embedding model {MODEL_NAME} loaded successfully.")
    return _EMBEDDING_MODEL


def embed_texts(texts: List[str]) -> np.ndarray:
    """
    Generates normalized float32 embeddings for a list of text strings.
    
    Returns:
        np.ndarray of shape (len(texts), 384) with unit L2 norm.
    """
    if not texts:
        return np.empty((0, 384), dtype=np.float32)

    model = get_embedding_model()
    # model.encode supports batching and normalize_embeddings
    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=False,
        normalize_embeddings=True,
        convert_to_numpy=True
    )
    return embeddings.astype(np.float32)


def embed_query(query: str) -> np.ndarray:
    """
    Generates a single normalized float32 embedding vector for a query.
    
    Returns:
        np.ndarray of shape (384,) with unit L2 norm.
    """
    model = get_embedding_model()
    vec = model.encode(
        query,
        normalize_embeddings=True,
        convert_to_numpy=True
    )
    return vec.astype(np.float32).flatten()
