import os
import re
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from .extractor import extract_pdf_pages
from .chunker import chunk_document_pages
from .embeddings import embed_texts
from .store import save_document, get_metadata, document_exists
from .retriever import retrieve_relevant_passages

logger = logging.getLogger("sarkari-saathi-rag.pipeline")


def sanitize_filename(filename: str) -> str:
    """Sanitizes user filename while preserving extension."""
    if not filename:
        return "document.pdf"
    # Remove directory separators
    name = os.path.basename(filename)
    # Strip dangerous characters
    name = re.sub(r'[^a-zA-Z0-9_\-\. ]+', '', name)
    name = name.strip()
    if not name.lower().endswith(".pdf"):
        name = f"{name}.pdf"
    return name[:120] if len(name) > 120 else name


def ingest_pdf_document(file_stream, filename: str) -> Dict[str, Any]:
    """
    Full ingestion pipeline:
    1. Validates and extracts pages from PDF (preserving 1-indexed page numbers)
    2. Chunks pages into overlapping passages
    3. Generates sentence-transformer embeddings (all-MiniLM-L6-v2)
    4. Persists metadata, chunks, and embeddings to disk
    
    Returns:
        dict: Safe metadata of the newly ingested document.
    """
    safe_filename = sanitize_filename(filename)
    doc_id = str(uuid.uuid4())

    logger.info(f"Ingesting PDF '{safe_filename}' as document_id={doc_id}...")

    # Step 1: Extract pages
    extracted = extract_pdf_pages(file_stream)
    page_count = extracted["page_count"]
    pages = extracted["pages"]
    total_chars = extracted["total_chars"]

    # Step 2: Chunk pages
    chunks = chunk_document_pages(doc_id, safe_filename, pages)
    if not chunks:
        raise ValueError("Could not extract any meaningful text passages from this PDF.")

    logger.info(f"Generated {len(chunks)} chunks across {page_count} pages for {doc_id}.")

    # Step 3: Embed chunks
    chunk_texts = [c["text"] for c in chunks]
    embeddings = embed_texts(chunk_texts)

    # Step 4: Save to store
    metadata = {
        "document_id": doc_id,
        "filename": safe_filename,
        "page_count": page_count,
        "chunk_count": len(chunks),
        "total_chars": total_chars,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }

    save_document(doc_id, metadata, chunks, embeddings)
    logger.info(f"Successfully completed RAG ingestion for document_id={doc_id}.")

    return metadata


def answer_question_from_document(
    doc_id: str,
    question: str,
    groq_client: Any,
    model_name: str = "qwen/qwen3.8-27b",
    top_k: int = 4
) -> Dict[str, Any]:
    """
    Full document Q&A pipeline:
    1. Validates document existence
    2. Retrieves top-k semantically relevant passages
    3. Dispatches grounded answer prompt to Groq LLM
    4. Enforces strict factual citations (page numbers)
    
    Returns:
        dict: {
            "answer": str,
            "citations": List[dict],
            "sufficient_evidence": bool,
            "document_id": str,
            "filename": str
        }
    """
    clean_question = question.strip() if question else ""
    if not clean_question:
        raise ValueError("Question text cannot be empty.")

    meta = get_metadata(doc_id)
    if not meta:
        raise FileNotFoundError(f"Document with ID '{doc_id}' not found.")

    filename = meta.get("filename", "document.pdf")

    # Step 1: Semantic retrieval
    passages, max_score = retrieve_relevant_passages(
        doc_id=doc_id,
        query=clean_question,
        top_k=top_k,
        min_similarity=0.20
    )

    # Step 2: Check evidence threshold
    if not passages or max_score < 0.22:
        logger.info(f"Insufficient evidence for query '{clean_question[:40]}...' (max_score={max_score:.4f})")
        return {
            "answer": (
                f"Based on the uploaded document \"{filename}\", there is insufficient evidence to answer this question. "
                "The document does not contain relevant information regarding this inquiry."
            ),
            "citations": [],
            "sufficient_evidence": False,
            "document_id": doc_id,
            "filename": filename
        }

    # Step 3: Format grounded prompt for LLM
    context_blocks = []
    for p in passages:
        context_blocks.append(f"[Page {p['page']}]:\n{p['text']}")

    context_str = "\n\n".join(context_blocks)

    system_prompt = (
        "You are Saathi AI — an authoritative, source-grounded policy analyst assisting Indian citizens.\n"
        "Your task is to answer the user's question STRICTLY AND ONLY using the provided evidence excerpts from the document.\n"
        "RULES:\n"
        "1. Answer ONLY using the facts stated in the provided excerpts. Do NOT assume, speculate, or extrapolate.\n"
        "2. For every factual claim, cite the exact page number in brackets, e.g., '[Page 1]' or '[Page 3]'.\n"
        "3. If the provided excerpts do not contain enough details to fully answer, state what is known from the text and note what is missing.\n"
        "4. Be direct, clear, and easy for citizens to understand."
    )

    user_prompt = f"DOCUMENT EVIDENCE EXCERPTS:\n{context_str}\n\nUSER QUESTION:\n{clean_question}"

    try:
        completion = groq_client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            max_tokens=800
        )
        answer_text = completion.choices[0].message.content or "No answer could be generated."

        return {
            "answer": answer_text,
            "citations": passages,
            "sufficient_evidence": True,
            "document_id": doc_id,
            "filename": filename
        }
    except Exception as e:
        logger.exception(f"Error calling Groq in RAG answer pipeline: {e}")
        raise
