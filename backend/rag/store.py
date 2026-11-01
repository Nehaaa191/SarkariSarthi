import os
import json
import logging
import numpy as np
from typing import List, Dict, Any, Optional

logger = logging.getLogger("sarkari-saathi-rag.store")

# Storage directory relative to backend root
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
STORAGE_DIR = os.path.join(BASE_DIR, "storage", "documents")


def ensure_storage_dir(doc_id: Optional[str] = None) -> str:
    """Ensures that storage directories exist."""
    path = os.path.join(STORAGE_DIR, doc_id) if doc_id else STORAGE_DIR
    os.makedirs(path, exist_ok=True)
    return path


def save_document(
    doc_id: str,
    metadata: Dict[str, Any],
    chunks: List[Dict[str, Any]],
    embeddings: np.ndarray
) -> str:
    """
    Saves document metadata, chunk text, and embedding matrix to local persistent storage.
    """
    doc_dir = ensure_storage_dir(doc_id)

    meta_path = os.path.join(doc_dir, "meta.json")
    chunks_path = os.path.join(doc_dir, "chunks.json")
    emb_path = os.path.join(doc_dir, "embeddings.npy")

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    with open(chunks_path, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)

    np.save(emb_path, embeddings.astype(np.float32))

    logger.info(f"Persisted document {doc_id} ({metadata.get('filename')}) with {len(chunks)} chunks.")
    return doc_dir


def document_exists(doc_id: str) -> bool:
    """Checks whether the specified document exists on disk."""
    if not doc_id or not isinstance(doc_id, str):
        return False
    # Prevent path traversal
    safe_id = os.path.basename(doc_id)
    doc_dir = os.path.join(STORAGE_DIR, safe_id)
    return (
        os.path.isdir(doc_dir) and
        os.path.isfile(os.path.join(doc_dir, "meta.json")) and
        os.path.isfile(os.path.join(doc_dir, "chunks.json")) and
        os.path.isfile(os.path.join(doc_dir, "embeddings.npy"))
    )


def get_metadata(doc_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves safe document metadata without exposing server internal paths."""
    if not document_exists(doc_id):
        return None
    safe_id = os.path.basename(doc_id)
    meta_path = os.path.join(STORAGE_DIR, safe_id, "meta.json")
    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to read metadata for {doc_id}: {e}")
        return None


def get_chunks(doc_id: str) -> Optional[List[Dict[str, Any]]]:
    """Retrieves document chunks."""
    if not document_exists(doc_id):
        return None
    safe_id = os.path.basename(doc_id)
    chunks_path = os.path.join(STORAGE_DIR, safe_id, "chunks.json")
    try:
        with open(chunks_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to read chunks for {doc_id}: {e}")
        return None


def get_embeddings(doc_id: str) -> Optional[np.ndarray]:
    """Loads document embedding matrix from npy file."""
    if not document_exists(doc_id):
        return None
    safe_id = os.path.basename(doc_id)
    emb_path = os.path.join(STORAGE_DIR, safe_id, "embeddings.npy")
    try:
        return np.load(emb_path)
    except Exception as e:
        logger.error(f"Failed to read embeddings for {doc_id}: {e}")
        return None


def list_all_documents() -> List[Dict[str, Any]]:
    """Lists safe metadata for all persisted documents."""
    ensure_storage_dir()
    docs = []
    try:
        for entry in os.listdir(STORAGE_DIR):
            doc_dir = os.path.join(STORAGE_DIR, entry)
            if os.path.isdir(doc_dir):
                meta = get_metadata(entry)
                if meta:
                    docs.append(meta)
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
    return docs
