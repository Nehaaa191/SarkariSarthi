"""
Comprehensive Test Suite for Sarkari Saathi PDF RAG Module
Tests all 10 evaluation scenarios using Flask test_client and direct module assertions.
"""

import os
import io
import json
import unittest
from unittest.mock import MagicMock, patch

# Ensure backend directory is in path
import sys
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import app
from rag import (
    ingest_pdf_document,
    answer_question_from_document,
    get_metadata,
    document_exists,
    retrieve_relevant_passages
)
from rag.extractor import extract_pdf_pages


def create_minimal_pdf_bytes(pages_text):
    """Generates a minimal valid text-based PDF in pure Python for testing."""
    catalog = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
    font = '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
    
    page_objs = []
    content_objs = []
    curr_obj_id = 4
    
    for text in pages_text:
        page_id = curr_obj_id
        content_id = curr_obj_id + 1
        curr_obj_id += 2
        
        # Safe escape for PDF string
        escaped_text = text.replace('(', '\\(').replace(')', '\\)')
        stream_content = f'BT /F1 12 Tf 50 700 Td ({escaped_text}) Tj ET'
        stream_len = len(stream_content)
        content_str = f'{content_id} 0 obj\n<< /Length {stream_len} >>\nstream\n{stream_content}\nendstream\nendobj\n'
        content_objs.append(content_str)
        
        page_str = f'{page_id} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {content_id} 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n'
        page_objs.append((page_id, page_str))
        
    kids_str = ' '.join(f'{pid} 0 R' for pid, _ in page_objs)
    pages_obj = f'2 0 obj\n<< /Type /Pages /Kids [{kids_str}] /Count {len(page_objs)} >>\nendobj\n'
    
    all_objs = [catalog, pages_obj, font] + [p[1] for p in page_objs] + content_objs
    
    body = '%PDF-1.4\n'
    xref = ['xref\n', f'0 {len(all_objs) + 1}\n', '0000000000 65535 f \n']
    
    for i, obj in enumerate(all_objs):
        pos = len(body)
        xref.append(f'{pos:010d} 00000 n \n')
        body += obj
        
    xref_pos = len(body)
    trailer = f'trailer\n<< /Size {len(all_objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF'
    return (body + ''.join(xref) + trailer).encode('latin-1')


class TestSarkariSaathiRAG(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        cls.client = app.test_client()

    # Scenario 1: Valid text-based PDF upload
    def test_01_valid_pdf_upload(self):
        pdf_bytes = create_minimal_pdf_bytes([
            "Pradhan Mantri Kisan Samman Nidhi provides financial benefit of 6000 rupees per annum.",
            "Ayushman Bharat PM-JAY covers up to 5 lakh rupees per family per year for secondary and tertiary healthcare."
        ])
        data = {
            "file": (io.BytesIO(pdf_bytes), "pm_kisan_guide.pdf")
        }
        res = self.client.post("/api/documents/upload", data=data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 201)
        resp = res.get_json()
        self.assertEqual(resp["status"], "success")
        self.assertIn("document", resp)
        doc = resp["document"]
        self.assertEqual(doc["filename"], "pm_kisan_guide.pdf")
        self.assertEqual(doc["page_count"], 2)
        self.assertGreater(doc["chunk_count"], 0)
        self.assertTrue(document_exists(doc["document_id"]))

    # Scenario 2: Question answered using actual PDF evidence
    def test_02_question_answered_with_evidence(self):
        pdf_bytes = create_minimal_pdf_bytes([
            "CSSS Scholarship provides rupees 10000 per year at graduation level and 20000 per year at post-graduation level.",
            "Family income ceiling is 8 lakh rupees per annum for the CSSS scheme."
        ])
        meta = ingest_pdf_document(io.BytesIO(pdf_bytes), "csss_scholarship.pdf")
        doc_id = meta["document_id"]

        # Mock Groq client
        mock_groq = MagicMock()
        mock_groq.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content="Under CSSS, eligible students receive ₹10,000 per year for graduation and ₹20,000 per year for post-graduation [Page 1]. The family income limit is ₹8 lakh per year [Page 2]."))
        ]

        result = answer_question_from_document(
            doc_id=doc_id,
            question="How much scholarship money is provided under CSSS?",
            groq_client=mock_groq
        )
        self.assertTrue(result["sufficient_evidence"])
        self.assertIn("CSSS", result["answer"])
        self.assertGreater(len(result["citations"]), 0)
        # Check that actual page 1 is in citations
        pages = [c["page"] for c in result["citations"]]
        self.assertIn(1, pages)

    # Scenario 3: Question with no supporting evidence (out of scope)
    def test_03_question_with_insufficient_evidence(self):
        pdf_bytes = create_minimal_pdf_bytes([
            "This document only discusses the construction of rural roads under PMGSY.",
            "Road specifications require 3.75 meter carriage width in plain areas."
        ])
        meta = ingest_pdf_document(io.BytesIO(pdf_bytes), "pmgsy_roads.pdf")
        doc_id = meta["document_id"]

        mock_groq = MagicMock()

        result = answer_question_from_document(
            doc_id=doc_id,
            question="What is the maximum subsidy for drone purchases by women SHGs?",
            groq_client=mock_groq
        )
        # Should detect lack of semantic similarity and return insufficient evidence
        self.assertFalse(result["sufficient_evidence"])
        self.assertIn("insufficient evidence", result["answer"].lower())
        self.assertEqual(len(result["citations"]), 0)
        mock_groq.chat.completions.create.assert_not_called()

    # Scenario 4: Invalid or corrupted PDF
    def test_04_corrupted_pdf_upload(self):
        corrupted_bytes = b"%PDF-1.4\ncorrupted gibberish that cannot be parsed by pypdf %%EOF"
        data = {
            "file": (io.BytesIO(corrupted_bytes), "broken.pdf")
        }
        res = self.client.post("/api/documents/upload", data=data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 400)
        resp = res.get_json()
        self.assertIn("error", resp)

    # Scenario 5: Empty or image-only PDF
    def test_05_empty_or_scanned_pdf(self):
        empty_stream = io.BytesIO(b"")
        with self.assertRaises(ValueError) as ctx:
            extract_pdf_pages(empty_stream)
        self.assertIn("empty", str(ctx.exception).lower())

    # Scenario 6: Missing document ID in ask endpoint
    def test_06_missing_document_id(self):
        res = self.client.post("/api/documents/ask", json={"question": "What is the benefit?"})
        self.assertEqual(res.status_code, 400)
        resp = res.get_json()
        self.assertIn("Missing 'document_id'", resp.get("error", ""))

    # Scenario 7: Missing Groq API key handling
    def test_07_missing_groq_api_key(self):
        pdf_bytes = create_minimal_pdf_bytes(["Sample text about PM Awas Yojana."])
        meta = ingest_pdf_document(io.BytesIO(pdf_bytes), "pmay.pdf")
        doc_id = meta["document_id"]

        with patch.dict(os.environ, {"GROQ_API_KEY": ""}, clear=False):
            # Patch get_groq_client to raise ValueError
            with patch("app.get_groq_client", side_effect=ValueError("GROQ_API_KEY is not configured")):
                res = self.client.post("/api/documents/ask", json={
                    "document_id": doc_id,
                    "question": "What is the scheme about?"
                })
                self.assertEqual(res.status_code, 503)
                resp = res.get_json()
                self.assertIn("API key is not configured", resp.get("error", ""))

    # Scenario 8: Repeated upload with same filename (UUID prevents collision)
    def test_08_repeated_upload_same_filename(self):
        pdf_bytes_1 = create_minimal_pdf_bytes(["Version 1 of the guideline document."])
        pdf_bytes_2 = create_minimal_pdf_bytes(["Version 2 of the guideline document with newer rules."])

        data1 = {"file": (io.BytesIO(pdf_bytes_1), "guidelines.pdf")}
        data2 = {"file": (io.BytesIO(pdf_bytes_2), "guidelines.pdf")}

        res1 = self.client.post("/api/documents/upload", data=data1, content_type="multipart/form-data")
        res2 = self.client.post("/api/documents/upload", data=data2, content_type="multipart/form-data")

        self.assertEqual(res1.status_code, 201)
        self.assertEqual(res2.status_code, 201)

        doc1 = res1.get_json()["document"]
        doc2 = res2.get_json()["document"]

        # Filename is identical but UUIDs must be distinct
        self.assertEqual(doc1["filename"], "guidelines.pdf")
        self.assertEqual(doc2["filename"], "guidelines.pdf")
        self.assertNotEqual(doc1["document_id"], doc2["document_id"])
        self.assertTrue(document_exists(doc1["document_id"]))
        self.assertTrue(document_exists(doc2["document_id"]))

    # Scenario 9: Different PDFs containing different information (Isolation check)
    def test_09_multi_document_isolation(self):
        docA_bytes = create_minimal_pdf_bytes(["Solar Rooftop Yojana provides subsidy up to 78000 rupees for solar panels."])
        docB_bytes = create_minimal_pdf_bytes(["PM Vishwakarma provides collateral-free enterprise development loan up to 3 lakh rupees."])

        metaA = ingest_pdf_document(io.BytesIO(docA_bytes), "solar.pdf")
        metaB = ingest_pdf_document(io.BytesIO(docB_bytes), "vishwakarma.pdf")

        # Query Document A about Solar
        passagesA, _ = retrieve_relevant_passages(metaA["document_id"], "How much subsidy for solar panels?")
        self.assertGreater(len(passagesA), 0)
        self.assertIn("78000", passagesA[0]["text"])

        # Query Document B about Solar (should NOT find Solar content in Vishwakarma document)
        passagesB, scoreB = retrieve_relevant_passages(metaB["document_id"], "How much subsidy for solar panels?")
        for p in passagesB:
            self.assertNotIn("78000", p["text"])
            self.assertNotIn("Solar", p["text"])

    # Scenario 10: Metadata retrieval endpoint
    def test_10_get_document_metadata(self):
        pdf_bytes = create_minimal_pdf_bytes(["Official government policy document guidelines for metadata retrieval test."])
        meta = ingest_pdf_document(io.BytesIO(pdf_bytes), "meta_test.pdf")
        doc_id = meta["document_id"]

        res = self.client.get(f"/api/documents/{doc_id}")
        self.assertEqual(res.status_code, 200)
        resp = res.get_json()
        self.assertEqual(resp["status"], "success")
        self.assertEqual(resp["document"]["document_id"], doc_id)
        self.assertEqual(resp["document"]["filename"], "meta_test.pdf")

        # Non-existent document
        res_404 = self.client.get("/api/documents/non_existent_uuid_12345")
        self.assertEqual(res_404.status_code, 404)


if __name__ == "__main__":
    unittest.main()
