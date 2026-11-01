<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { Shield, CheckCircle2, AlertCircle, X, Loader2, ArrowLeft, ExternalLink, Info, Menu, FileText, BookOpen } from 'lucide-react';
=======
import { useState } from 'react';
import {
  Shield, CheckCircle2, AlertCircle, X, Loader2,
  ArrowLeft, ExternalLink, Info, Menu, FileText, RefreshCw,
} from 'lucide-react';
>>>>>>> b90480e (made nec. changes)
import { Link } from 'react-router-dom';
import { useFeaturesDrawer } from '../context/FeaturesDrawerContext';
import './Verify.css';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SubClaim {
  text: string;
<<<<<<< HEAD
  verdict: 'verified' | 'partially_correct' | 'misleading' | 'false' | 'unverifiable' | 'outdated';
  evidence?: string;
=======
  verdict: 'VERIFIED' | 'FALSE' | 'MISLEADING' | 'PARTIALLY_TRUE' | 'UNVERIFIABLE' | 'OUTDATED';
  evidence: string;
>>>>>>> b90480e (made nec. changes)
  source?: string;
}

export interface Citation {
  document_id: string;
  filename: string;
  page: number;
  text: string;
  similarity_score?: number;
}

export interface DocMeta {
  document_id: string;
  filename: string;
  page_count: number;
  chunk_count?: number;
  uploaded_at?: string;
}

interface VerifyResult {
  original: string;
  overall: 'verified' | 'false' | 'partially_correct' | 'misleading' | 'unverifiable';
  verdict?: string;
  confidence?: number;
  explanation?: string;
  reasoning?: string;
  supporting_evidence?: string;
  contradicting_evidence?: string;
  caveats?: string;
  subClaims: SubClaim[];
  timestamp: Date;
  citations?: Citation[];
  sufficient_evidence?: boolean;
  document_id?: string;
  filename?: string;
}

<<<<<<< HEAD
function normalizeVerdict(val: unknown): SubClaim['verdict'] {
  if (typeof val !== 'string') return 'unverifiable';
  const clean = val.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (clean === 'verified') return 'verified';
  if (clean === 'partially_correct' || clean === 'partial') return 'partially_correct';
  if (clean === 'misleading') return 'misleading';
  if (clean === 'false' || clean === 'incorrect') return 'false';
  if (clean === 'outdated') return 'outdated';
  return 'unverifiable';
}

function inferOverall(subs: SubClaim[]): VerifyResult['overall'] {
  if (subs.length === 0) return 'unverifiable';
  if (subs.every(s => s.verdict === 'verified')) return 'verified';
  if (subs.some(s => s.verdict === 'false')) return 'false';
  if (subs.some(s => s.verdict === 'misleading')) return 'misleading';
  if (subs.every(s => s.verdict === 'unverifiable')) return 'unverifiable';
  return 'partially_correct';
}

function normalizeOverall(val: unknown, subs: SubClaim[]): VerifyResult['overall'] {
  if (typeof val === 'string') {
    const clean = val.toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (clean === 'verified') return 'verified';
    if (clean === 'partially_correct' || clean === 'partial') return 'partially_correct';
    if (clean === 'misleading') return 'misleading';
    if (clean === 'false' || clean === 'incorrect') return 'false';
    if (clean === 'unverifiable') return 'unverifiable';
  }
  return inferOverall(subs);
}

async function verifyClaim(claim: string, documentId?: string): Promise<VerifyResult> {
  const payload: { claim: string; document_id?: string } = { claim };
  if (documentId) {
    payload.document_id = documentId;
  }

  const res = await fetch('/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Verification service returned status ${res.status}`);
  }

  const data = await res.json();
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response received from verification service.');
  }

  const rawSubClaims = Array.isArray(data.subClaims) ? data.subClaims : [];
  const subClaims: SubClaim[] = rawSubClaims.map((sc: any) => ({
    text: sc.text || claim,
    verdict: normalizeVerdict(sc.verdict),
    evidence: sc.evidence || 'No detailed evidence returned by service.',
    source: sc.source || data.filename || 'Scheme Guidelines',
  }));

  if (subClaims.length === 0) {
    subClaims.push({
      text: claim,
      verdict: normalizeVerdict(data.overall),
      evidence: 'No specific sub-claims were decomposed for this statement.',
      source: data.filename || 'Scheme Guidelines',
    });
  }

  const overall = normalizeOverall(data.overall, subClaims);

  const rawCitations = Array.isArray(data.citations) ? data.citations : [];
  const citations: Citation[] = rawCitations.map((c: any) => ({
    document_id: c.document_id || data.document_id || '',
    filename: c.filename || data.filename || 'Official Document',
    page: Number(c.page) || 1,
    text: String(c.text || ''),
    similarity_score: typeof c.similarity_score === 'number' ? c.similarity_score : undefined,
  }));

  return {
    original: claim,
    overall,
    subClaims,
    timestamp: new Date(),
    citations,
    sufficient_evidence: data.sufficient_evidence,
    document_id: data.document_id,
    filename: data.filename,
  };
}

const verdictConfig = {
  verified: { label: 'Verified', color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0', icon: <CheckCircle2 size={16} /> },
  partially_correct: { label: 'Partially Correct', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', icon: <AlertCircle size={16} /> },
  misleading: { label: 'Misleading', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: <AlertCircle size={16} /> },
  false: { label: 'False', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', icon: <X size={16} /> },
  unverifiable: { label: 'Unverifiable', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: <Info size={16} /> },
  outdated: { label: 'Outdated', color: '#172554', bg: '#F1F5F9', border: '#E2E8F0', icon: <AlertCircle size={16} /> },
=======
// ─── Reference document options ───────────────────────────────────────────────
const SCHEME_DOCS = [
  { value: '', label: '— General Knowledge Base (No Document) —' },
  { value: 'pm-kisan', label: 'PM-KISAN — Pradhan Mantri Kisan Samman Nidhi' },
  { value: 'csss', label: 'Central Sector Scheme of Scholarship (CSSS)' },
  { value: 'ayushman', label: 'Ayushman Bharat — PM-JAY Health Coverage' },
  { value: 'pmay', label: 'PM Awas Yojana — Urban Housing Scheme' },
  { value: 'mudra', label: 'Pradhan Mantri MUDRA Yojana (PMMY)' },
  { value: 'pmmvy', label: 'PM Matru Vandana Yojana (PMMVY)' },
  { value: 'bbbp', label: 'Beti Bachao Beti Padhao / Sukanya Samriddhi' },
  { value: 'nsp', label: 'National Scholarship Portal (NSP)' },
];

// ─── Verdict config ────────────────────────────────────────────────────────────
const VERDICT_CFG: Record<string, {
  label: string; color: string; bg: string; border: string;
  icon: React.ReactNode; badgeBg: string;
}> = {
  verified: {
    label: 'Verified ✓',
    color: '#065f46', bg: '#ecfdf5', border: '#6ee7b7', badgeBg: '#10B981',
    icon: <CheckCircle2 size={18} />,
  },
  false: {
    label: 'False ✗',
    color: '#991b1b', bg: '#fef2f2', border: '#fca5a5', badgeBg: '#EF4444',
    icon: <X size={18} />,
  },
  partially_correct: {
    label: 'Partially Correct',
    color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd', badgeBg: '#3B82F6',
    icon: <AlertCircle size={18} />,
  },
  misleading: {
    label: 'Misleading ⚠',
    color: '#92400e', bg: '#fffbeb', border: '#fcd34d', badgeBg: '#D97706',
    icon: <AlertCircle size={18} />,
  },
  unverifiable: {
    label: 'Unverifiable',
    color: '#374151', bg: '#f9fafb', border: '#d1d5db', badgeBg: '#6B7280',
    icon: <Info size={18} />,
  },
};

const SUB_VERDICT_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  VERIFIED: { label: 'Verified', color: '#065f46', bg: '#ecfdf5', border: '#6ee7b7' },
  FALSE: { label: 'False', color: '#991b1b', bg: '#fef2f2', border: '#fca5a5' },
  PARTIALLY_TRUE: { label: 'Partially True', color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
  MISLEADING: { label: 'Misleading', color: '#92400e', bg: '#fffbeb', border: '#fcd34d' },
  UNVERIFIABLE: { label: 'Unverifiable', color: '#374151', bg: '#f9fafb', border: '#d1d5db' },
  OUTDATED: { label: 'Outdated', color: '#4a1d96', bg: '#f5f3ff', border: '#c4b5fd' },
>>>>>>> b90480e (made nec. changes)
};

const EXAMPLE_CLAIMS = [
  'A student will receive ₹10,000 as scholarship from the government',
  'PM-KISAN gives ₹12,000 per year to farmers',
  'Ayushman Bharat provides ₹5 lakh health cover per family',
  'The government is giving free laptops to all students',
  'PM Mudra loan goes up to ₹50 lakh',
];

// ─── API base (same as rest of app) ───────────────────────────────────────────
const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/+$/, '');

// ─── Main component ────────────────────────────────────────────────────────────
export default function Verify() {
  const { openDrawer } = useFeaturesDrawer();
  const [input, setInput] = useState('');
  const [selectedScheme, setSelectedScheme] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
<<<<<<< HEAD
  const [, setHistory] = useState<VerifyResult[]>([]);
  const [documents, setDocuments] = useState<DocMeta[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [, setDocsLoading] = useState<boolean>(true);

  // Load indexed official PDF documents for source grounding
  useEffect(() => {
    let isMounted = true;
    async function fetchDocuments() {
      try {
        const res = await fetch('/api/documents');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && Array.isArray(data.documents)) {
            setDocuments(data.documents);
            if (data.documents.length > 0 && !selectedDocId) {
              setSelectedDocId(data.documents[0].document_id);
            }
          }
        }
      } catch {
        // Fallback gracefully if document listing fails
      } finally {
        if (isMounted) setDocsLoading(false);
      }
    }
    fetchDocuments();
    return () => { isMounted = false; };
  }, []);

  const verify = async (claim?: string) => {
    const text = (claim || input).trim();
    if (!text) {
      setError('Please enter a claim or statement to verify.');
      return;
    }
=======

  const verify = async (claimText?: string) => {
    const text = (claimText ?? input).trim();
    if (!text) return;

>>>>>>> b90480e (made nec. changes)
    setLoading(true);
    setError(null);
    setResult(null);
<<<<<<< HEAD

    try {
      const r = await verifyClaim(text, selectedDocId || undefined);
      setResult(r);
      setHistory(prev => [r, ...prev].slice(0, 5));
    } catch (err: any) {
      setError(err?.message || 'Could not connect to the verification service. Please ensure the backend server is running.');
=======
    setError(null);

    try {
      const endpoint = `${API_BASE}/verify`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim: text,
          scheme_context: selectedScheme,
        }),
      });

      // Always try to read the body as text first so we can handle non-JSON gracefully
      const raw = await res.text();
      let data: Partial<VerifyResult> & { error?: string; subClaims?: SubClaim[]; overall?: string } = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        // Backend returned non-JSON (e.g. HTML error page from Render)
        throw new Error(
          res.ok
            ? 'Received an unexpected response from the verification service.'
            : `Server error ${res.status} — ${raw.slice(0, 120)}`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || `Verification failed (HTTP ${res.status})`);
      }

      // Normalise the response into our VerifyResult shape
      const overall = normaliseOverall(data.overall ?? 'unverifiable');
      const subClaims: SubClaim[] = Array.isArray(data.subClaims)
        ? data.subClaims.map((sc) => ({
            text: sc.text ?? '',
            verdict: normaliseSubVerdict(sc.verdict ?? 'UNVERIFIABLE'),
            evidence: sc.evidence ?? '',
            source: sc.source,
          }))
        : [{
            text: text,
            verdict: 'UNVERIFIABLE' as const,
            evidence: data.explanation ?? 'No detailed analysis available.',
            source: undefined,
          }];

      setResult({
        original: text,
        overall,
        verdict: data.verdict,
        confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
        explanation: data.explanation,
        reasoning: data.reasoning,
        supporting_evidence: data.supporting_evidence,
        contradicting_evidence: data.contradicting_evidence,
        caveats: data.caveats,
        subClaims,
        timestamp: new Date(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
>>>>>>> b90480e (made nec. changes)
    } finally {
      setLoading(false);
    }
  };

  const overallCfg = result ? (VERDICT_CFG[result.overall] ?? VERDICT_CFG.unverifiable) : null;

  return (
    <div className="verify-page">
      {/* ── Top bar ── */}
      <div className="verify-topbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            className="topbar-drawer-btn"
            onClick={openDrawer}
            aria-label="Open Features Sidebar"
            title="Open Features"
            id="verify-drawer-btn"
          >
            <Menu size={18} />
          </button>
          <Link to="/chat" className="verify-back">
            <ArrowLeft size={16} /> Dashboard
          </Link>
        </div>
        <div className="verify-topbar-title">
          <Shield size={18} /> AI Claim Verifier
        </div>
        <Link to="/" className="verify-home">← Home</Link>
      </div>

      {/* ── Main layout ── */}
      <div className="verify-content">
        {/* LEFT — Input panel */}
        <div className="verify-left">
          <h1 className="verify-h1">Verify a claim</h1>
<<<<<<< HEAD
          <p className="verify-sub">Paste any statement or social media claim about a government scheme. Grounded strictly in official scheme PDFs.</p>

          {/* Document Selector for Ground Truth */}
          <div className="verify-doc-group">
            <label htmlFor="verify-doc-select" className="verify-doc-label">
              <FileText size={15} /> Select Official Reference Document
            </label>
            <div className="verify-doc-select-wrapper">
              <select
                id="verify-doc-select"
                className="verify-doc-select"
                value={selectedDocId}
                onChange={e => {
                  setSelectedDocId(e.target.value);
                  if (error) setError(null);
                }}
              >
                <option value="">-- General Knowledge Base (No Document) --</option>
                {documents.map(d => (
                  <option key={d.document_id} value={d.document_id}>
                    {d.filename} ({d.page_count} {d.page_count === 1 ? 'page' : 'pages'})
                  </option>
                ))}
              </select>
            </div>
            {selectedDocId && (
              <div className="verify-doc-hint">
                <span>✓</span> Claims will be evaluated strictly against this uploaded PDF with page-numbered citations.
              </div>
            )}
          </div>

          {error && (
            <div className="verify-error-banner" style={{
              padding: '12px 16px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 'var(--radius-md)',
              color: '#991B1B',
              fontSize: '13px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
=======
          <p className="verify-sub">
            Paste any statement or social media claim. Our AI cross-checks it against official
            Indian government scheme data and returns a grounded verdict.
          </p>

          {/* Document selector */}
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor="scheme-doc-select"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600,
                fontSize: 13, color: 'var(--navy)', marginBottom: 6 }}
            >
              <FileText size={14} /> Select Official Reference Document
            </label>
            <select
              id="scheme-doc-select"
              value={selectedScheme}
              onChange={e => setSelectedScheme(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border)', background: '#fff',
                fontSize: 13, color: 'var(--navy)', cursor: 'pointer',
              }}
            >
              {SCHEME_DOCS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 14px', background: '#fef2f2',
              border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-md)',
              fontSize: 13, color: '#991b1b', marginBottom: 12,
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Verification failed:</strong> {error}
                <button
                  onClick={() => verify()}
                  style={{ marginLeft: 8, color: '#991b1b', fontWeight: 700,
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
                >
                  <RefreshCw size={12} style={{ marginRight: 3 }} />Retry
                </button>
              </div>
>>>>>>> b90480e (made nec. changes)
            </div>
          )}

          {/* Claim textarea */}
          <textarea
            className="verify-textarea"
            placeholder="Paste the claim or statement here…"
            value={input}
            onChange={e => {
              setInput(e.target.value);
              if (error) setError(null);
            }}
            rows={4}
            id="verify-input"
          />

          {/* Verify button */}
          <button
            className="verify-btn"
            onClick={() => verify()}
            disabled={!input.trim() || loading}
            id="verify-submit-btn"
          >
            {loading
              ? <><Loader2 size={17} className="spin" /> Analyzing…</>
              : <><Shield size={17} /> Verify Claim</>}
          </button>

          {/* Example chips */}
          <div className="verify-examples">
            <p className="verify-ex-label">Try these examples:</p>
            {EXAMPLE_CLAIMS.map((c, i) => (
              <button
                key={i}
                className="verify-ex-chip"
                onClick={() => { setInput(c); verify(c); }}
                id={`verify-ex-${i}`}
              >
                "{c}"
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT — Results panel */}
        <div className="verify-right">
          {loading && (
            <div className="verify-loading">
              <Loader2 size={32} className="spin" />
<<<<<<< HEAD
              <p>Analyzing claim against document evidence...</p>
=======
              <p>Cross-checking claim against official scheme data…</p>
>>>>>>> b90480e (made nec. changes)
            </div>
          )}

          {result && overallCfg && (
            <div className="verify-result" style={{ borderColor: overallCfg.border }}>
              {/* Overall verdict badge */}
              <div className="vr-overall" style={{ background: overallCfg.bg }}>
                <div className="vr-verdict" style={{ color: overallCfg.color }}>
                  {overallCfg.icon}
                  <span
                    className="vr-verdict-label"
                    style={{
                      background: overallCfg.badgeBg, color: '#fff',
                      borderRadius: 999, padding: '2px 10px', fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {overallCfg.label}
                  </span>
                  {result.confidence !== undefined && (
                    <span style={{ fontSize: 12, color: overallCfg.color, opacity: 0.8 }}>
                      {result.confidence}% confidence
                    </span>
                  )}
                </div>
                {result.filename && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: 'var(--navy)',
                    background: 'rgba(23, 37, 84, 0.08)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}>
                    <FileText size={12} /> Grounded in: {result.filename}
                  </div>
                )}
                <p className="vr-claim-text">"{result.original}"</p>
              </div>

              {/* Plain-language explanation */}
              {result.explanation && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
                    {result.explanation}
                  </p>
                </div>
              )}

              {/* Supporting / contradicting evidence */}
              {(result.supporting_evidence || result.contradicting_evidence) && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.supporting_evidence && (
                    <div style={{ fontSize: 13, color: '#065f46', background: '#ecfdf5', borderRadius: 8, padding: '8px 12px' }}>
                      <strong>✅ Supporting evidence:</strong> {result.supporting_evidence}
                    </div>
                  )}
                  {result.contradicting_evidence && (
                    <div style={{ fontSize: 13, color: '#991b1b', background: '#fef2f2', borderRadius: 8, padding: '8px 12px' }}>
                      <strong>❌ Contradicting evidence:</strong> {result.contradicting_evidence}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-claims breakdown */}
              {result.subClaims.length > 0 && (
                <div className="vr-subclaims">
                  <h3 className="vr-subclaims-title">Detailed Analysis</h3>
                  {result.subClaims.map((sc, i) => {
                    const scCfg = SUB_VERDICT_CFG[sc.verdict] ?? SUB_VERDICT_CFG.UNVERIFIABLE;
                    return (
                      <div key={i} className="vr-subclaim"
                        style={{ borderColor: scCfg.border, background: scCfg.bg }}>
                        <div className="vr-sc-header" style={{ color: scCfg.color }}>
                          <span style={{
                            fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}>
                            {scCfg.label}
                          </span>
                        </div>
                        {sc.text && sc.text !== result.original && (
                          <p style={{ fontSize: 13, fontWeight: 600, margin: '4px 0 6px',
                            color: 'var(--navy)' }}>
                            {sc.text}
                          </p>
                        )}
                        <p className="vr-sc-evidence">{sc.evidence}</p>
                        {sc.source && sc.source !== 'N/A' && (
                          <div className="vr-sc-source">
                            <ExternalLink size={11} />
                            <span>Source: {sc.source}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Caveats */}
              {result.caveats && (
                <div style={{ padding: '10px 16px', fontSize: 12, color: '#6b7280',
                  background: '#f9fafb', borderTop: '1px solid var(--border)', borderRadius: '0 0 12px 12px' }}>
                  ⚠️ {result.caveats}
                </div>
              )}

              {/* Retrieved Document Citations */}
              {result.citations && result.citations.length > 0 && (
                <div className="vr-citations-section">
                  <h3 className="vr-citations-title">
                    <BookOpen size={15} /> Retrieved Evidence Citations ({result.citations.length})
                  </h3>
                  <div className="vr-citations-list">
                    {result.citations.map((c, i) => (
                      <div key={i} className="vr-citation-card">
                        <div className="vr-citation-header">
                          <span className="vr-cit-file"><FileText size={12} /> {c.filename}</span>
                          <span className="vr-cit-page">Page {c.page}</span>
                          {typeof c.similarity_score === 'number' && (
                            <span className="vr-cit-score">{Math.round(c.similarity_score * 100)}% match</span>
                          )}
                        </div>
                        <p className="vr-citation-text">"{c.text}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="vr-disclaimer">
                Note: Analysis is evaluated strictly against official policy documents and guidelines. Always verify critical decisions directly on official government portals.
              </div>
            </div>
          )}

<<<<<<< HEAD
          {!loading && !result && error && (
            <div className="verify-empty" style={{ borderColor: '#FECACA' }}>
              <AlertCircle size={44} className="verify-empty-icon" style={{ color: '#EF4444' }} />
              <h3>Verification Service Unavailable</h3>
              <p style={{ color: '#991B1B' }}>{error}</p>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="verify-empty">
              <Shield size={48} className="verify-empty-icon" />
              <h3>Fact-check government claims</h3>
              <p>Paste any claim about a government scheme on the left to analyze it against policy guidelines.</p>
=======
          {!loading && !result && !error && (
            <div className="verify-empty">
              <Shield size={48} className="verify-empty-icon" />
              <h3>Fact-check any claim</h3>
              <p>
                Enter any statement about a government scheme, policy, or benefit on the left.
                Our AI will verify it using official scheme data and return a grounded verdict.
              </p>
>>>>>>> b90480e (made nec. changes)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normaliseOverall(v: string): VerifyResult['overall'] {
  const map: Record<string, VerifyResult['overall']> = {
    verified: 'verified', true: 'verified',
    false: 'false',
    partially_correct: 'partially_correct', partially_true: 'partially_correct',
    misleading: 'misleading',
    unverifiable: 'unverifiable',
  };
  return map[v.toLowerCase().replace(/ /g, '_')] ?? 'unverifiable';
}

function normaliseSubVerdict(v: string): SubClaim['verdict'] {
  const upper = v.toUpperCase().replace(/ /g, '_');
  const allowed: SubClaim['verdict'][] = ['VERIFIED', 'FALSE', 'MISLEADING', 'PARTIALLY_TRUE', 'UNVERIFIABLE', 'OUTDATED'];
  return allowed.includes(upper as SubClaim['verdict']) ? (upper as SubClaim['verdict']) : 'UNVERIFIABLE';
}
