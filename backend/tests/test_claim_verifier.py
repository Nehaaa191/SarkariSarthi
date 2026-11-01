"""
Verification and Test Suite for Sarkari Saathi AI Claim Verifier
Tests the backend endpoint /api/verify and simulates frontend client response handling.
"""

import os
import sys
import json
import unittest
from unittest.mock import MagicMock, patch

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import app


def normalize_verdict(val):
    """Mirror of the frontend normalizeVerdict function."""
    if not isinstance(val, str):
        return "unverifiable"
    clean = val.lower().strip().replace(" ", "_").replace("-", "_")
    if clean == "verified":
        return "verified"
    if clean in ("partially_correct", "partial"):
        return "partially_correct"
    if clean == "misleading":
        return "misleading"
    if clean in ("false", "incorrect"):
        return "false"
    if clean == "outdated":
        return "outdated"
    return "unverifiable"


def infer_overall(subs):
    """Mirror of frontend inferOverall function."""
    if not subs:
        return "unverifiable"
    if all(s.get("verdict") == "verified" for s in subs):
        return "verified"
    if any(s.get("verdict") == "false" for s in subs):
        return "false"
    if any(s.get("verdict") == "misleading" for s in subs):
        return "misleading"
    if all(s.get("verdict") == "unverifiable" for s in subs):
        return "unverifiable"
    return "partially_correct"


def normalize_overall(val, subs):
    """Mirror of frontend normalizeOverall function."""
    if isinstance(val, str):
        clean = val.lower().strip().replace(" ", "_").replace("-", "_")
        if clean in ("verified", "partially_correct", "misleading", "false", "unverifiable"):
            return clean
    return infer_overall(subs)


class TestClaimVerifier(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        cls.client = app.test_client()

    # Scenario 1: Valid claim submission with successful Groq LLM decomposition
    def test_01_valid_claim_submission(self):
        mock_groq = MagicMock()
        mock_groq.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({
                "subClaims": [
                    {
                        "text": "PM-KISAN gives ₹12,000 per year to farmers",
                        "verdict": "FALSE",
                        "evidence": "PM-KISAN provides ₹6,000 per year in 3 four-monthly installments of ₹2,000 each.",
                        "source": "pmkisan.gov.in"
                    }
                ],
                "overall": "false"
            })))
        ]

        with patch("app.get_groq_client", return_value=mock_groq):
            res = self.client.post("/api/verify", json={"claim": "PM-KISAN gives ₹12,000 per year to farmers"})
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertIn("subClaims", data)
            self.assertIn("overall", data)

            # Test frontend normalization
            norm_subclaims = [
                {**sc, "verdict": normalize_verdict(sc["verdict"])}
                for sc in data["subClaims"]
            ]
            self.assertEqual(norm_subclaims[0]["verdict"], "false")
            self.assertEqual(normalize_overall(data["overall"], norm_subclaims), "false")

    # Scenario 2: Successful verification of a verified claim
    def test_02_verified_claim(self):
        mock_groq = MagicMock()
        mock_groq.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({
                "subClaims": [
                    {
                        "text": "Ayushman Bharat provides ₹5 lakh health cover per family per year",
                        "verdict": "VERIFIED",
                        "evidence": "PM-JAY provides cashless health cover up to ₹5,00,000 per eligible family per year.",
                        "source": "pmjay.gov.in"
                    }
                ],
                "overall": "verified"
            })))
        ]

        with patch("app.get_groq_client", return_value=mock_groq):
            res = self.client.post("/api/verify", json={"claim": "Ayushman Bharat provides ₹5 lakh health cover per family"})
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            norm_verdict = normalize_verdict(data["subClaims"][0]["verdict"])
            self.assertEqual(norm_verdict, "verified")
            self.assertEqual(normalize_overall(data["overall"], data["subClaims"]), "verified")

    # Scenario 3: Empty claim rejected with 400
    def test_03_empty_claim(self):
        res1 = self.client.post("/api/verify", json={"claim": ""})
        self.assertEqual(res1.status_code, 400)
        self.assertIn("Claim text cannot be empty", res1.get_json().get("error", ""))

        res2 = self.client.post("/api/verify", json={})
        self.assertEqual(res2.status_code, 400)
        self.assertIn("Missing 'claim'", res2.get_json().get("error", ""))

    # Scenario 4: Backend service fallback when Groq key is missing or service throws
    def test_04_backend_service_fallback(self):
        with patch("app.get_groq_client", side_effect=ValueError("GROQ_API_KEY is not configured")):
            res = self.client.post("/api/verify", json={"claim": "Free laptops for all students"})
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertEqual(data["overall"], "unverifiable")
            self.assertEqual(normalize_verdict(data["subClaims"][0]["verdict"]), "unverifiable")
            self.assertIn("unavailable", data["subClaims"][0]["evidence"].lower())

    # Scenario 5: Invalid LLM JSON response handled cleanly
    def test_05_invalid_llm_response(self):
        mock_groq = MagicMock()
        # Returns unparseable non-JSON text
        mock_groq.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content="I am not sure about this policy claim."))
        ]

        with patch("app.get_groq_client", return_value=mock_groq):
            res = self.client.post("/api/verify", json={"claim": "Subsidized scooters for women"})
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertEqual(data["overall"], "unverifiable")
            self.assertEqual(normalize_verdict(data["subClaims"][0]["verdict"]), "unverifiable")

    # Scenario 6: Multiple subclaims with mixed verdicts normalized properly
    def test_06_mixed_verdicts_normalization(self):
        raw_subclaims = [
            {"text": "PM-KISAN gives ₹6,000", "verdict": "VERIFIED"},
            {"text": "PM-KISAN gives an extra ₹10,000 festival bonus", "verdict": "FALSE"}
        ]
        norm = [normalize_verdict(sc["verdict"]) for sc in raw_subclaims]
        self.assertEqual(norm, ["verified", "false"])
        overall = infer_overall([{"verdict": v} for v in norm])
        self.assertEqual(overall, "false")


if __name__ == "__main__":
    unittest.main()
