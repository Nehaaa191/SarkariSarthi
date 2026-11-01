import pathlib, re, sys, json, os, logging
from pathlib import Path

file_path = Path(r'C:\Users\singh\OneDrive\Genai\SarkariSarthi\backend\app.py')
text = file_path.read_text(encoding='utf-8')

# Find the verify_claim function definition
pattern = r"def verify_claim\(\):\n(?:[ \t]+""".*?"""\n)?(?:[ \t]+.*\n)*?\n\n"
# We'll replace the whole function (from def line to the next blank line after its body)
# Simpler: locate start and end via markers in code (we have a comment '# Document RAG Endpoints')
start = text.find('def verify_claim():')
if start == -1:
    print('verify_claim not found')
    sys.exit(1)
# Find the next blank line after the function ends (two consecutive newlines)
end = text.find('\n\n', start)
# We'll replace up to that point
new_func = '''def verify_claim():
    """Verify policy claim endpoint using Groq with structured JSON response."""
    data = request.get_json(silent=True)
    if not data or "claim" not in data:
        return jsonify({"error": "Missing 'claim' in request body."}), 400

    claim = str(data["claim"]).strip()
    scheme_context = str(data.get("scheme_context", "")).strip().lower()
    if not claim:
        return jsonify({"error": "Claim text cannot be empty."}), 400

    model_name = os.getenv("GROQ_MODEL", GROQ_MODEL).strip() or "llama3-8b-8192"

    # Optional scheme-specific context
    SCHEME_KNOWLEDGE = {
        "pm-kisan": "PM‑KISAN: ₹16,000/year (₹12,000 each installment). Eligibility: small & marginal farmers owning ≤2 ha land.",
        "csss": "CSSS Scholarship: UG ₹110,000/yr, PG ₹120,000/yr, family income ≤₹18 lakh, 80th percentile in class 12.",
        "ayushman": "Ayushman Bharat (PM‑JAY): ₹15 lakh cashless health cover per family per year.",
        "pmay": "PM Awas Yojana: subsidy up to ₹2.67 lakh for EWS/LIG families.",
        "mudra": "PM MUDRA: loans up to ₹110 lakh (Tarun category).",
        "pmmvy": "PM Matru Vandana Yojana: ₹15,000 for first live child.",
        "bbbp": "Beti Bachao Beti Padhao / Sukanya Samriddhi: savings scheme for girl child.",
        "nsp": "National Scholarship Portal: centralised scholarship portal for SC/ST/OBC/minority students."
    }
    scheme_block = f"\nSelected scheme context: {SCHEME_KNOWLEDGE.get(scheme_context, '')}\n" if scheme_context and scheme_context in SCHEME_KNOWLEDGE else ""

    prompt = f"""You are a fact‑checker for Indian government schemes.

Claim: \"{claim}\"{scheme_block}

Produce a **valid JSON** object with these fields (no extra text):
- overall: one of verified, partially_correct, misleading, false, unverifiable
- verdict: one of VERIFIED, FALSE, PARTIALLY_TRUE, MISLEADING, UNVERIFIABLE, OUTDATED
- confidence: integer 0‑100
- explanation: short plain‑language summary
- supporting_evidence (optional)
- contradicting_evidence (optional)
- caveats (optional)
- subClaims: array of {{text, verdict, evidence, source}}

Only return the JSON object.
"""
    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a precise JSON‑only fact checker for Indian government schemes."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=900,
        )
        raw = completion.choices[0].message.content or "{}"
        start_js = raw.find('{')
        end_js = raw.rfind('}')
        if start_js == -1 or end_js == -1:
            raise ValueError('No JSON in response')
        parsed = json.loads(raw[start_js:end_js+1])
        # Ensure all expected keys exist
        parsed.setdefault('overall', 'unverifiable')
        parsed.setdefault('verdict', 'UNVERIFIABLE')
        parsed.setdefault('confidence', 0)
        parsed.setdefault('explanation', '')
        parsed.setdefault('supporting_evidence', '')
        parsed.setdefault('contradicting_evidence', '')
        parsed.setdefault('caveats', '')
        parsed.setdefault('subClaims', [])
        return jsonify(parsed), 200
    except Exception as e:
        logging.exception('Error in /api/verify')
        return jsonify({
            "subClaims": [{
                "text": claim,
                "verdict": "UNVERIFIABLE",
                "evidence": "Verification service unavailable or returned malformed output.",
                "source": "N/A"
            }],
            "overall": "unverifiable",
            "verdict": "UNVERIFIABLE",
            "confidence": 0,
            "explanation": "Unable to verify the claim at this time.",
            "supporting_evidence": "",
            "contradicting_evidence": "",
            "caveats": "Please check official government portals for accurate information."
        }), 200
'''
# Replace the old function with new
new_text = text[:start] + new_func + '\n' + text[end+2:]
file_path.write_text(new_text, encoding='utf-8')
print('verify_claim replaced')

