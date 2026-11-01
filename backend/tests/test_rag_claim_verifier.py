"""
Comprehensive Test Suite for RAG-Grounded Claim Verification in Sarkari Saathi
Tests Stage 2 RAG Claim Verification scenarios:
1. Supported claim verified against document with citations and page numbers
2. Contradicted claim refuted against document with citations and page numbers
3. Unsupported claim (below similarity threshold) returns UNVERIFIABLE / insufficient evidence
4. Missing document_id returns 400 validation response (never VERIFIED or FALSE)
5. Invalid document_id returns 404 validation response (never VERIFIED or FALSE)
6. Groq unavailable handled gracefully with fallback UNVERIFIABLE
7. Conflicting PDFs: Verifying against different documents yields isolated, document-specific verdicts
"""

import os
import io
import json
import unittest
from unittest.mock import MagicMock, patch

import sys
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import app
from rag import ingest_pdf_document, document_exists


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


class TestRAGClaimVerifier(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        cls.client = app.test_client()

        # Ingest Document A: Official PM-KISAN guideline
        pdf_a = create_minimal_pdf_bytes([
            "Official Guidelines of PM Kisan Samman Nidhi scheme. Beneficiary farmers receive 6000 rupees annually in three equal installments of 2000 rupees each.",
            "Eligibility criteria: All landholding farmer families with cultivable landholding in their names are eligible for PM Kisan benefits."
        ])
        cls.doc_a = ingest_pdf_document(io.BytesIO(pdf_a), "pm_kisan_official.pdf")

        # Ingest Document B: Revised or conflicting scheme guideline
        pdf_b = create_minimal_pdf_bytes([
            "Special State Agricultural Relief scheme provides enhanced assistance of 15000 rupees per year to small and marginal farmers.",
            "The central scheme rate of 6000 rupees has been superseded under this specific state directive."
        ])
        cls.doc_b = ingest_pdf_document(io.BytesIO(pdf_b), "state_relief_act.pdf")

    # Scenario 1: Supported claim verified against document with citations and page numbers
    def test_01_supported_claim_verification(self):
        doc_id = self.doc_a["document_id"]
        mock_groq = MagicMock()
        mock_groq.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({
                "subClaims": [
                    {
                        "text": "PM-KISAN provides 6000 rupees per year to farmers",
                        "verdict": "VERIFIED",
                        "evidence": "Document explicitly states that beneficiary farmers receive 6000 rupees annually in three equal installments.",
                        "source": "pm_kisan_official.pdf, Page 1"
                    }
                ],
                "overall": "verified"
            })))
        ]

        with patch("app.get_groq_client", return_value=mock_groq):
            res = self.client.post("/api/verify", json={
                "claim": "PM-KISAN provides 6000 rupees per year to farmers",
                "document_id": doc_id
            })
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertEqual(data["overall"], "verified")
            self.assertEqual(data["subClaims"][0]["verdict"], "VERIFIED")
            self.assertTrue(data.get("sufficient_evidence"))
            self.assertEqual(data["document_id"], doc_id)
            self.assertEqual(data["filename"], "pm_kisan_official.pdf")
            self.assertIn("citations", data)
            self.assertGreater(len(data["citations"]), 0)
            self.assertEqual(data["citations"][0]["page"], 1)
            self.assertIn("pm_kisan_official.pdf", data["citations"][0]["filename"])

    # Scenario 2: Contradicted claim refuted against document with citations and page numbers
    def test_02_contradicted_claim_verification(self):
        doc_id = self.doc_a["document_id"]
        mock_groq = MagicMock()
        mock_groq.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({
                "subClaims": [
                    {
                        "text": "PM-KISAN provides 50000 rupees per year to farmers",
                        "verdict": "FALSE",
                        "evidence": "Document states beneficiary farmers receive 6000 rupees annually, not 50000 rupees.",
                        "source": "pm_kisan_official.pdf, Page 1"
                    }
                ],
                "overall": "false"
            })))
        ]

        with patch("app.get_groq_client", return_value=mock_groq):
            res = self.client.post("/api/verify", json={
                "claim": "PM-KISAN provides 50000 rupees per year to farmers",
                "document_id": doc_id
            })
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertEqual(data["overall"], "false")
            self.assertEqual(data["subClaims"][0]["verdict"], "FALSE")
            self.assertTrue(data.get("sufficient_evidence"))
            self.assertGreater(len(data["citations"]), 0)

    # Scenario 3: Unsupported claim (no relevant evidence in document) returns UNVERIFIABLE
    def test_03_unsupported_claim_insufficient_evidence(self):
        doc_id = self.doc_a["document_id"]
        # Claim about space satellites, totally unrelated to agricultural subsidies
        res = self.client.post("/api/verify", json={
            "claim": "ISRO launched an astronomical satellite with solar propulsion modules.",
            "document_id": doc_id
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["overall"], "unverifiable")
        self.assertEqual(data["subClaims"][0]["verdict"], "UNVERIFIABLE")
        self.assertFalse(data.get("sufficient_evidence"))
        self.assertEqual(len(data.get("citations", [])), 0)
        # MUST NEVER generate a VERIFIED or FALSE verdict
        self.assertNotIn(data["overall"], ("verified", "false"))

    # Scenario 4: Missing document_id returns 400 validation response (never VERIFIED or FALSE)
    def test_04_missing_document_id(self):
        res_empty = self.client.post("/api/verify", json={
            "claim": "PM-KISAN gives 6000 rupees per year",
            "document_id": ""
        })
        self.assertEqual(res_empty.status_code, 400)
        data_empty = res_empty.get_json()
        self.assertEqual(data_empty["overall"], "unverifiable")
        self.assertNotIn(data_empty["overall"], ("verified", "false"))

        res_none = self.client.post("/api/verify", json={
            "claim": "PM-KISAN gives 6000 rupees per year",
            "document_id": None
        })
        self.assertEqual(res_none.status_code, 400)
        data_none = res_none.get_json()
        self.assertEqual(data_none["overall"], "unverifiable")
        self.assertNotIn(data_none["overall"], ("verified", "false"))

    # Scenario 5: Invalid document_id returns 404 validation response (never VERIFIED or FALSE)
    def test_05_invalid_document_id(self):
        res = self.client.post("/api/verify", json={
            "claim": "PM-KISAN gives 6000 rupees per year",
            "document_id": "non-existent-guid-12345"
        })
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertEqual(data["overall"], "unverifiable")
        self.assertNotIn(data["overall"], ("verified", "false"))

    # Scenario 6: Groq unavailable returns graceful fallback with UNVERIFIABLE
    def test_06_groq_unavailable_fallback(self):
        doc_id = self.doc_a["document_id"]
        with patch("app.get_groq_client", side_effect=ValueError("GROQ_API_KEY is not configured")):
            res = self.client.post("/api/verify", json={
                "claim": "Beneficiary farmers receive 6000 rupees annually",
                "document_id": doc_id
            })
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertEqual(data["overall"], "unverifiable")
            self.assertEqual(data["subClaims"][0]["verdict"], "UNVERIFIABLE")
            self.assertFalse(data.get("sufficient_evidence"))

    # Scenario 7: Conflicting information in different PDFs evaluates strictly per selected document
    def test_07_different_pdfs_conflicting_information(self):
        claim = "Farmers receive 6000 rupees per year"
        doc_a_id = self.doc_a["document_id"]
        doc_b_id = self.doc_b["document_id"]

        # Against Doc A: Supported (6000 rupees)
        mock_groq_a = MagicMock()
        mock_groq_a.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({
                "subClaims": [{"text": claim, "verdict": "VERIFIED", "evidence": "Doc A confirms 6000 rupees."}],
                "overall": "verified"
            })))
        ]
        with patch("app.get_groq_client", return_value=mock_groq_a):
            res_a = self.client.post("/api/verify", json={"claim": claim, "document_id": doc_a_id})
            self.assertEqual(res_a.status_code, 200)
            data_a = res_a.get_json()
            self.assertEqual(data_a["overall"], "verified")
            self.assertEqual(data_a["filename"], "pm_kisan_official.pdf")

        # Against Doc B: Contradicted (15000 rupees, supersedes 6000)
        mock_groq_b = MagicMock()
        mock_groq_b.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({
                "subClaims": [{"text": claim, "verdict": "FALSE", "evidence": "Doc B specifies 15000 rupees and states 6000 is superseded."}],
                "overall": "false"
            })))
        ]
        with patch("app.get_groq_client", return_value=mock_groq_b):
            res_b = self.client.post("/api/verify", json={"claim": claim, "document_id": doc_b_id})
            self.assertEqual(res_b.status_code, 200)
            data_b = res_b.get_json()
            self.assertEqual(data_b["overall"], "false")
            self.assertEqual(data_b["filename"], "state_relief_act.pdf")


if __name__ == "__main__":
    unittest.main()
