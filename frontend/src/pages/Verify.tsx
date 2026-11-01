import { useState, useEffect } from 'react';
import { Shield, CheckCircle2, AlertCircle, X, Loader2, ArrowLeft, ExternalLink, Info, Menu, FileText, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFeaturesDrawer } from '../context/FeaturesDrawerContext';
import './Verify.css';

interface SubClaim {
  text: string;
  verdict: 'verified' | 'partially_correct' | 'misleading' | 'false' | 'unverifiable' | 'outdated';
  evidence?: string;
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
  overall: 'verified' | 'partially_correct' | 'misleading' | 'false' | 'unverifiable';
  subClaims: SubClaim[];
  timestamp: Date;
  citations?: Citation[];
  sufficient_evidence?: boolean;
  document_id?: string;
  filename?: string;
}

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
};

const EXAMPLE_CLAIMS = [
  'A student will receive \u20B910,000 as scholarship from the government',
  'PM-KISAN gives \u20B912,000 per year to farmers',
  'Ayushman Bharat provides \u20B95 lakh health cover per family',
  'The government is giving free laptops to all students',
  'PM Mudra loan goes up to \u20B950 lakh',
];

export default function Verify() {
  const { openDrawer } = useFeaturesDrawer();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const r = await verifyClaim(text, selectedDocId || undefined);
      setResult(r);
      setHistory(prev => [r, ...prev].slice(0, 5));
    } catch (err: any) {
      setError(err?.message || 'Could not connect to the verification service. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const overallCfg = result ? verdictConfig[result.overall] : null;

  return (
    <div className="verify-page">
      <div className="verify-topbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            className="topbar-drawer-btn"
            onClick={openDrawer}
            aria-label="Open 5 AI Features Sidebar"
            title="Open Features"
            id="verify-drawer-btn"
          >
            <Menu size={18} />
          </button>
          <Link to="/chat" className="verify-back"><ArrowLeft size={16} /> Dashboard</Link>
        </div>
        <div className="verify-topbar-title"><Shield size={18} /> AI Claim Verifier</div>
        <Link to="/" className="verify-home">← Home</Link>
      </div>

      <div className="verify-content">
        <div className="verify-left">
          <h1 className="verify-h1">Verify a claim</h1>
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
            </div>
          )}

          <textarea
            className="verify-textarea"
            placeholder="Paste the claim or statement here..."
            value={input}
            onChange={e => {
              setInput(e.target.value);
              if (error) setError(null);
            }}
            rows={4}
            id="verify-input"
          />

          <button
            className="verify-btn"
            onClick={() => verify()}
            disabled={!input.trim() || loading}
            id="verify-submit-btn"
          >
            {loading ? <><Loader2 size={17} className="spin" /> Analyzing...</> : <><Shield size={17} /> Verify Claim</>}
          </button>

          {/* Example claims */}
          <div className="verify-examples">
            <p className="verify-ex-label">Try these examples:</p>
            {EXAMPLE_CLAIMS.map((c, i) => (
              <button key={i} className="verify-ex-chip" onClick={() => { setInput(c); verify(c); }} id={`verify-ex-${i}`}>
                "{c}"
              </button>
            ))}
          </div>
        </div>

        <div className="verify-right">
          {loading && (
            <div className="verify-loading">
              <Loader2 size={32} className="spin" />
              <p>Analyzing claim against document evidence...</p>
            </div>
          )}

          {result && overallCfg && (
            <div className="verify-result" style={{ borderColor: overallCfg.border }}>
              {/* Overall verdict */}
              <div className="vr-overall" style={{ background: overallCfg.bg }}>
                <div className="vr-verdict" style={{ color: overallCfg.color }}>
                  {overallCfg.icon}
                  <span className="vr-verdict-label">{overallCfg.label}</span>
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

              {/* Sub-claims */}
              <div className="vr-subclaims">
                <h3 className="vr-subclaims-title">Detailed Analysis</h3>
                {result.subClaims.map((sc, i) => {
                  const scCfg = verdictConfig[sc.verdict] || verdictConfig.unverifiable;
                  return (
                    <div key={i} className="vr-subclaim" style={{ borderColor: scCfg.border, background: scCfg.bg }}>
                      <div className="vr-sc-header" style={{ color: scCfg.color }}>
                        {scCfg.icon} <span>{scCfg.label}</span>
                      </div>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
