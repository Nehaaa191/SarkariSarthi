"""
Sarkari Saathi RAG Package
Source-grounded PDF Retrieval Augmented Generation with page preservation.
"""

from .pipeline import ingest_pdf_document, answer_question_from_document
from .store import get_metadata, list_all_documents, document_exists
from .retriever import retrieve_relevant_passages

__all__ = [
    "ingest_pdf_document",
    "answer_question_from_document",
    "get_metadata",
    "list_all_documents",
    "document_exists",
    "retrieve_relevant_passages"
]
