import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from groq import Groq, APIError, RateLimitError, APIConnectionError, AuthenticationError
from rag import (
    ingest_pdf_document,
    answer_question_from_document,
    verify_claim_against_document,
    get_metadata as get_doc_metadata,
    list_all_documents,
    document_exists
)

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sarkari-saathi-backend")

# Load environment variables from backend directory or current dir
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, ".env"))
load_dotenv()

app = Flask(__name__)

# CORS — allow all origins (safe since auth uses Bearer tokens, not cookies)
CORS(app, resources={r"/api/*": {"origins": "*"}},
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# ----- Auth routes -----
from auth_routes import api as auth_bp
app.register_blueprint(auth_bp, url_prefix="/api")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-8b-8192").strip()

# Primary Government Schemes Context for Saathi AI
SCHEMES_CONTEXT = """You are Saathi AI — an expert AI companion for Indian government schemes and civic policies.
Always cite official sources and official portals. Be helpful, clear, and honest.
If you don't know or official data is unavailable, state it clearly.
Use Hindi words naturally where helpful (e.g., "prakriya" for process, "patrata" for eligibility).
When answering questions in Hindi, reply in fluent, natural Hindi.

SCHEME DATA REFERENCE:

1. CENTRAL SECTOR SCHEME OF SCHOLARSHIP (CSSS)
   Ministry: Ministry of Education
   Amount: ₹10,000/year (UG), ₹20,000/year (PG)
   Eligibility: Scored above 80th percentile in class 12, family income ≤ ₹8 lakh/year, 
   first-year UG student, age ≤ 25 years, not benefiting from another scholarship
   Documents: Aadhar, income certificate, marksheet, bank details, caste cert (if SC/ST/OBC)
   Apply: National Scholarship Portal (scholarships.gov.in)
   Source: scholarships.gov.in, Ministry of Education Guidelines 2024-25

2. PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)
   Ministry: Ministry of Agriculture & Farmers Welfare
   Amount: ₹6,000/year (₹2,000 every 4 months in 3 installments)
   Eligibility: Small and marginal farmers owning ≤ 2 hectares land, Indian citizen
   Exclusions: Income tax payers, constitutional post holders, institutional landholders, professionals (doctors, engineers, lawyers, CAs)
   Apply: pmkisan.gov.in or nearest CSC/Common Service Centre
   Source: pmkisan.gov.in, Ministry of Agriculture Guidelines

3. AYUSHMAN BHARAT - PM-JAY (Pradhan Mantri Jan Arogya Yojana)
   Ministry: Ministry of Health & Family Welfare
   Amount: ₹5 lakh cashless health cover per family per year
   Eligibility: Listed in SECC 2011 database, BPL/deprived families, specified occupational categories
   Covers: Secondary and tertiary healthcare, 1,929+ medical procedures, pre and post hospitalization
   Apply: Ayushman card at empanelled hospital, CSC, or pmjay.gov.in
   Source: pmjay.gov.in, National Health Authority (NHA) Guidelines

4. PM AWAS YOJANA (PMAY) - Urban
   Ministry: Ministry of Housing and Urban Affairs  
   Amount: Subsidy up to ₹2.67 lakh (EWS/LIG), interest subsidy on home loans
   Eligibility: EWS (annual income ≤ ₹3 lakh), LIG (₹3-6 lakh), MIG-I (₹6-12 lakh)
   Condition: Beneficiary family must not own a pucca house anywhere in India
   Source: pmaymis.gov.in

5. BETI BACHAO BETI PADHAO / SUKANYA SAMRIDDHI YOJANA (SSY)
   Ministry: Ministry of Women & Child Development
   Focus: Girl child education and welfare
   Scheme: Sukanya Samriddhi Yojana (SSY) - small savings scheme for girl child
   Key details: Attractive interest rate (~8.2%), annual deposit ₹250 to ₹1.5 lakh, maturity at 21 years
   Open at: Any post office or authorized commercial bank for girls below 10 years
   Source: wcd.nic.in, indiapost.gov.in

6. PRADHAN MANTRI MUDRA YOJANA (PMMY)
   Ministry: Ministry of Finance
   Loans: Shishu (loans up to ₹50,000), Kishor (₹50,000 to ₹5 lakh), Tarun (₹5 lakh to ₹10 lakh)
   Eligibility: Non-farm income-generating micro/small businesses
   Apply: Any commercial bank, RRB, small finance bank, MFI, or NBFC
   Source: mudra.org.in

7. PM MATRU VANDANA YOJANA (PMMVY)
   Ministry: Ministry of Women & Child Development
   Amount: ₹5,000 for first live child (credited in installments)
   Eligibility: Pregnant women and lactating mothers aged 19 and above
   Apply: Nearest Anganwadi centre or approved health facility
   Source: wcd.nic.in/PMMVY

8. NATIONAL SCHOLARSHIP PORTAL (NSP)
   Manages: Pre-matric and post-matric scholarships for SC, ST, OBC, minority, and differently abled students
   Apply: scholarships.gov.in
   Key window: Usually opens around July-August, deadlines in October-November each year
   Source: scholarships.gov.in

CORE GUIDELINES:
- For eligibility inquiries: politely request necessary profile attributes if missing (age, family income, occupation, category, state).
- Always mention the official portal name (e.g. pmkisan.gov.in, scholarships.gov.in).
- If a claim or query contains misinformation, kindly clarify with the official scheme rule.
- If asked in Hindi, respond in clean, helpful Hindi.
- Structure responses with clear bullet points, bold highlights, and readable sections.
"""

def get_groq_client():
    api_key = os.getenv("GROQ_API_KEY", "").strip() or GROQ_API_KEY
    if not api_key or api_key == "YOUR_GROQ_API_KEY_HERE":
        raise ValueError("GROQ_API_KEY is not configured in backend environment variables.")
    return Groq(api_key=api_key)


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint to verify backend status."""
    has_key = bool(os.getenv("GROQ_API_KEY", "").strip() or GROQ_API_KEY)
    return jsonify({
        "status": "ok",
        "service": "SarkariSaathi AI Backend",
        "provider": "Groq",
        "model": os.getenv("GROQ_MODEL", GROQ_MODEL),
        "api_key_configured": has_key
    }), 200


@app.route("/api/chat", methods=["POST"])
def chat():
    """Chat endpoint communicating with Groq API."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request. JSON body expected."}), 400

    # Handle both `messages` array and single `message` + optional `history`
    raw_messages = data.get("messages")
    single_message = data.get("message")

    conversation = []

    if isinstance(raw_messages, list) and len(raw_messages) > 0:
        for m in raw_messages:
            if isinstance(m, dict) and "role" in m and "content" in m:
                role = m["role"]
                # Standardize roles for Groq
                if role not in ("system", "user", "assistant"):
                    role = "assistant" if role in ("model", "bot") else "user"
                content = str(m.get("content", "")).strip()
                if content:
                    conversation.append({"role": role, "content": content})
    elif isinstance(single_message, str) and single_message.strip():
        history = data.get("history", [])
        if isinstance(history, list):
            for h in history:
                if isinstance(h, dict) and "role" in h and "content" in h:
                    role = h["role"]
                    if role not in ("system", "user", "assistant"):
                        role = "assistant" if role in ("model", "bot") else "user"
                    conversation.append({"role": role, "content": str(h["content"])})
        conversation.append({"role": "user", "content": single_message.strip()})
    else:
        return jsonify({"error": "No message content provided."}), 400

    if not conversation:
        return jsonify({"error": "Empty message list."}), 400

    # Ensure system message is first
    messages_payload = [{"role": "system", "content": SCHEMES_CONTEXT}]
    # Filter out redundant system messages from user conversation
    for m in conversation:
        if m["role"] != "system":
            messages_payload.append(m)

    model_name = os.getenv("GROQ_MODEL", GROQ_MODEL).strip() or "llama3-8b-8192"

    try:
        client = get_groq_client()
        logger.info(f"Dispatching chat completion to Groq (model={model_name}, messages={len(messages_payload)})")

        completion = client.chat.completions.create(
            model=model_name,
            messages=messages_payload,
            temperature=0.3,
            max_tokens=1024,
        )

        reply = completion.choices[0].message.content or "No response received."

        return jsonify({
            "response": reply,
            "model": model_name,
            "status": "success"
        }), 200

    except ValueError as ve:
        logger.error(f"Configuration error: {ve}")
        return jsonify({
            "error": "The AI assistant is temporarily unavailable because the backend API key is not configured.",
            "details": "Please set GROQ_API_KEY in the backend environment."
        }), 503

    except AuthenticationError:
        logger.error("Groq AuthenticationError: Invalid API Key")
        return jsonify({
            "error": "Authentication with the AI service failed. Please check the backend GROQ_API_KEY."
        }), 401

    except RateLimitError:
        logger.warning("Groq RateLimitError: Rate limit exceeded")
        return jsonify({
            "error": "The AI service is experiencing high demand. Please wait a moment and try again."
        }), 429

    except APIConnectionError as ce:
        logger.error(f"Groq APIConnectionError: {ce}")
        return jsonify({
            "error": "Could not connect to the AI service. Please verify internet connectivity."
        }), 502

    except APIError as ae:
        logger.error(f"Groq APIError: {ae}")
        return jsonify({
            "error": "An error occurred while generating the response from Groq.",
            "message": str(ae.message) if hasattr(ae, 'message') else "AI service error"
        }), 500

    except Exception as e:
        logger.exception("Unexpected error in /api/chat")
        return jsonify({
            "error": "An unexpected error occurred while processing your request. Please try again."
        }), 500


@app.route("/api/verify", methods=["POST"])
def verify_claim():
    """Verify policy claim endpoint using Groq and optional RAG document grounding."""
    data = request.get_json(silent=True)
    if not data or "claim" not in data:
        return jsonify({"error": "Missing 'claim' in request body."}), 400

    claim = str(data["claim"]).strip()
    if not claim:
        return jsonify({"error": "Claim text cannot be empty."}), 400

    model_name = os.getenv("GROQ_MODEL", GROQ_MODEL).strip() or "llama3-8b-8192"

    # Stage 2: RAG-Grounded Claim Verification if document_id is provided in request
    if "document_id" in data:
        raw_doc_id = data.get("document_id")
        doc_id = str(raw_doc_id).strip() if raw_doc_id is not None else ""

        # Missing or empty document_id: never generate VERIFIED or FALSE
        if not doc_id:
            return jsonify({
                "error": "Missing or empty 'document_id'. Please select a valid document for verification.",
                "subClaims": [{
                    "text": claim,
                    "verdict": "UNVERIFIABLE",
                    "evidence": "No document ID was provided for verification.",
                    "source": "N/A"
                }],
                "overall": "unverifiable",
                "sufficient_evidence": False,
                "citations": []
            }), 400

        # Invalid document_id: never generate VERIFIED or FALSE
        if not document_exists(doc_id):
            return jsonify({
                "error": f"Document '{doc_id}' not found.",
                "subClaims": [{
                    "text": claim,
                    "verdict": "UNVERIFIABLE",
                    "evidence": f"Document '{doc_id}' does not exist on the server.",
                    "source": "N/A"
                }],
                "overall": "unverifiable",
                "sufficient_evidence": False,
                "citations": []
            }), 404

        # Document exists -> verify strictly against this document
        try:
            client = get_groq_client()
        except Exception as e:
            logger.error(f"Groq client unavailable: {e}")
            meta = get_doc_metadata(doc_id) or {}
            filename = meta.get("filename", "document.pdf")
            return jsonify({
                "subClaims": [{
                    "text": claim,
                    "verdict": "UNVERIFIABLE",
                    "evidence": "Verification service unavailable at this moment. Please check official government portals.",
                    "source": filename
                }],
                "overall": "unverifiable",
                "sufficient_evidence": False,
                "citations": [],
                "document_id": doc_id,
                "filename": filename
            }), 200

        try:
            result = verify_claim_against_document(
                doc_id=doc_id,
                claim=claim,
                groq_client=client,
                model_name=model_name
            )
            return jsonify(result), 200
        except Exception as e:
            logger.exception(f"Error in verify_claim_against_document for doc {doc_id}")
            meta = get_doc_metadata(doc_id) or {}
            filename = meta.get("filename", "document.pdf")
            return jsonify({
                "subClaims": [{
                    "text": claim,
                    "verdict": "UNVERIFIABLE",
                    "evidence": "An error occurred while verifying the claim against the document.",
                    "source": filename
                }],
                "overall": "unverifiable",
                "sufficient_evidence": False,
                "citations": [],
                "document_id": doc_id,
                "filename": filename
            }), 200

    # Backwards compatibility: General scheme verification when document_id is not specified in request
    prompt = f"""You are a fact-checker for Indian government schemes.

Claim to verify: "{claim}"

Task:
1. Decompose this claim into atomic sub-claims
2. For each sub-claim, evaluate against official scheme data:
   - VERIFIED: matches official data
   - MISLEADING: technically not wrong but misleads
   - FALSE: directly contradicts official data
   - UNVERIFIABLE: cannot be checked against known sources
   - OUTDATED: may have been correct before but is now changed

Known scheme data:
- PM-KISAN: ₹6,000/year in 3 installments (₹2,000 each)
- CSSS Scholarship: ₹10,000/year (UG), ₹20,000/year (PG), income ≤ ₹8 lakh, 80th percentile in class 12
- Ayushman Bharat: ₹5 lakh health cover per family per year
- PM Mudra: max ₹10 lakh (Tarun category)
- PM Awas Yojana: subsidy for EWS/LIG/MIG

Respond strictly in valid JSON format with this exact structure:
{{
  "subClaims": [
    {{"text": "sub-claim text", "verdict": "VERIFIED|MISLEADING|FALSE|UNVERIFIABLE|OUTDATED", "evidence": "explanation with official data", "source": "official portal"}}
  ],
  "overall": "verified|partially_correct|misleading|false|unverifiable"
}}"""

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a precise JSON-only fact checker for Indian government schemes."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=600,
        )

        raw_text = completion.choices[0].message.content or "{}"
        # Extract JSON object from output
        json_start = raw_text.find("{")
        json_end = raw_text.rfind("}")
        if json_start != -1 and json_end != -1:
            parsed = json.loads(raw_text[json_start:json_end+1])
            return jsonify(parsed), 200
        else:
            return jsonify({
                "subClaims": [{"text": claim, "verdict": "UNVERIFIABLE", "evidence": raw_text, "source": "Official Portals"}],
                "overall": "unverifiable"
            }), 200

    except Exception as e:
        logger.exception("Error in /api/verify")
        return jsonify({
            "subClaims": [{
                "text": claim,
                "verdict": "UNVERIFIABLE",
                "evidence": "Verification service unavailable at this moment. Please check official government portals.",
                "source": "N/A"
            }],
            "overall": "unverifiable"
        }), 200


# ─── Document RAG Endpoints ──────────────────────────────────────────

@app.route("/api/documents/upload", methods=["POST"])
def upload_document():
    """Upload and process an official PDF document for source-grounded RAG."""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Please provide a PDF file."}), 400

    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "Empty filename."}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are supported."}), 400

    try:
        metadata = ingest_pdf_document(file.stream, file.filename)
        return jsonify({
            "status": "success",
            "message": "Document processed and indexed successfully.",
            "document": metadata
        }), 201
    except ValueError as ve:
        logger.warning(f"Validation error during PDF upload: {ve}")
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.exception("Unexpected error during document ingestion")
        return jsonify({"error": "An internal error occurred while processing the PDF."}), 500


@app.route("/api/documents/ask", methods=["POST"])
def ask_document():
    """Ask a question about an uploaded document with source citations."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request. JSON body expected."}), 400

    doc_id = str(data.get("document_id", "")).strip()
    question = str(data.get("question", "")).strip()

    if not doc_id:
        return jsonify({"error": "Missing 'document_id' in request."}), 400

    if not question:
        return jsonify({"error": "Missing 'question' in request."}), 400

    if not document_exists(doc_id):
        return jsonify({"error": f"Document '{doc_id}' not found. Please upload the document first."}), 404

    try:
        client = get_groq_client()
    except ValueError as ve:
        logger.error(f"Configuration error: {ve}")
        return jsonify({
            "error": "The AI assistant is temporarily unavailable because the backend API key is not configured.",
            "details": "Please set GROQ_API_KEY in the backend environment."
        }), 503

    model_name = os.getenv("GROQ_MODEL", GROQ_MODEL).strip() or "qwen/qwen3.8-27b"

    try:
        result = answer_question_from_document(
            doc_id=doc_id,
            question=question,
            groq_client=client,
            model_name=model_name
        )
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except FileNotFoundError:
        return jsonify({"error": "Document not found."}), 404
    except Exception as e:
        logger.exception("Error answering question from document")
        return jsonify({"error": "Failed to generate answer from document."}), 500


@app.route("/api/documents/<doc_id>", methods=["GET"])
def get_document(doc_id):
    """Retrieve safe metadata for a specific document."""
    if not document_exists(doc_id):
        return jsonify({"error": "Document not found."}), 404

    meta = get_doc_metadata(doc_id)
    if not meta:
        return jsonify({"error": "Document metadata unavailable."}), 404

    return jsonify({
        "status": "success",
        "document": meta
    }), 200


@app.route("/api/documents", methods=["GET"])
def list_documents():
    """List all available indexed documents."""
    docs = list_all_documents()
    return jsonify({
        "status": "success",
        "count": len(docs),
        "documents": docs
    }), 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    logger.info(f"Starting SarkariSaathi Flask Backend on port {port} (Groq Model: {GROQ_MODEL})...")
    app.run(host="0.0.0.0", port=port, debug=False)
