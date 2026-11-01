// Verify.tsx - AI Claim Verifier page implementation
import { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Info,
  RefreshCw,
  Menu,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFeaturesDrawer } from '../context/FeaturesDrawerContext';
import './Verify.css';

// Types
interface SubClaim {
  text: string;
  verdict: 'VERIFIED' | 'FALSE' | 'MISLEADING' | 'PARTIALLY_TRUE' | 'UNVERIFIABLE' | 'OUTDATED';
  evidence: string;
  source?: string;
}

interface VerifyResult {
  original: string;
  overall: 'verified' | 'false' | 'partially_correct' | 'misleading' | 'unverifiable';
  verdict?: string;
  confidence?: number;
  explanation?: string;
  supporting_evidence?: string;
  contradicting_evidence?: string;
  caveats?: string;
  subClaims: SubClaim[];
  timestamp: Date;
}

// Document selector (scheme context)
const SCHEME_DOCS = [
  { value: '', label: 'General Knowledge Base (No Document)' },
  { value: 'pm-kisan', label: 'PM-KISAN – Pradhan Mantri Kisan Samman Nidhi' },
  { value: 'csss', label: 'Central Sector Scheme of Scholarship (CSSS)' },
  { value: 'ayushman', label: 'Ayushman Bharat – PM-JAY Health Coverage' },
  { value: 'pmay', label: 'PM Awas Yojana – Urban Housing Scheme' },
  { value: 'mudra', label: 'Pradhan Mantri MUDRA Yojana (PMMY)' },
  { value: 'pmmvy', label: 'PM Matru Vandana Yojana (PMMVY)' },
  { value: 'bbbp', label: 'Beti Bachao Beti Padhao / Sukanya Samriddhi' },
  { value: 'nsp', label: 'National Scholarship Portal (NSP)' },
];

// Verdict styling configuration
const VERDICT_CFG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode; badgeBg: string }> = {
  verified: {
    label: 'Verified',
    color: '#065f46',
    bg: '#ecfdf5',
    border: '#6ee7b7',
    badgeBg: '#10B981',
    icon: <CheckCircle2 size={18} />,
  },
  false: {
    label: 'False',
    color: '#991b1b',
    bg: '#fef2f2',
    border: '#fca5a5',
    badgeBg: '#EF4444',
    icon: <X size={18} />,
  },
  partially_correct: {
    label: 'Partially Correct',
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#93c5fd',
    badgeBg: '#3B82F6',
    icon: <AlertCircle size={18} />,
  },
  misleading: {
    label: 'Misleading',
    color: '#92400e',
    bg: '#fffbeb',
    border: '#fcd34d',
    badgeBg: '#D97706',
    icon: <AlertCircle size={18} />,
  },
  unverifiable: {
    label: 'Unverifiable',
    color: '#374151',
    bg: '#f9fafb',
    border: '#d1d5db',
    badgeBg: '#6B7280',
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
};

// Example claims shown in the UI
const EXAMPLE_CLAIMS = [
  'A student will receive ₹110,000 as scholarship from the government',
  'PM-KISAN gives ₹12,000 per year to farmers',
  'Ayushman Bharat provides ₹15 lakh health cover per family',
  'The government is giving free laptops to all students',
  'PM Mudra loan goes up to ₹150 lakh',
];

// API base – must be set as VITE_API_BASE in the .env of the frontend
const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\\+$/, '');

export default function Verify() {
  const { openDrawer } = useFeaturesDrawer();
  const [input, setInput] = useState('');
  const [selectedScheme, setSelectedScheme] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async (claimText?: string) => {
    const text = (claimText ?? input).trim();
    if (!text) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const endpoint = `${API_BASE}/verify`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: text, scheme_context: selectedScheme }),
      });
      const raw = await res.text();
      let data: Partial<VerifyResult> & { error?: string; overall?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(res.ok ? 'Unexpected response from verification service.' : `Server error ${res.status}: ${raw.slice(0, 120)}`);
      }
      if (!res.ok) {
        throw new Error(data.error || `Verification failed (HTTP ${res.status})`);
      }
      const overall = normaliseOverall(data.overall ?? 'unverifiable');
      const subClaims: SubClaim[] = Array.isArray(data.subClaims)
        ? data.subClaims.map(sc => ({
            text: sc.text ?? '',
            verdict: normaliseSubVerdict(sc.verdict ?? 'UNVERIFIABLE'),
            evidence: sc.evidence ?? '',
            source: sc.source,
          }))
        : [{ text, verdict: 'UNVERIFIABLE' as const, evidence: data.explanation ?? 'No analysis available.', source: undefined }];
      setResult({
        original: text,
        overall,
        verdict: data.verdict,
        confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
        explanation: data.explanation,
        supporting_evidence: data.supporting_evidence,
        contradicting_evidence: data.contradicting_evidence,
        caveats: data.caveats,
        subClaims,
        timestamp: new Date(),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const overallCfg = result ? VERDICT_CFG[result.overall] ?? VERDICT_CFG.unverifiable : null;

  return (
    <div className="verify-page">
      {/* Top Bar */}
      <div className="verify-topbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button className="topbar-drawer-btn" onClick={openDrawer} aria-label="Open Features Sidebar" title="Open Features" id="verify-drawer-btn">
            <Menu size={18} />
          </button>
          <Link to="/chat" className="verify-back">
            <ArrowLeft size={16} /> Dashboard
          </Link>
        </div>
      </div>

      <div className="verify-main">
        {/* Left Panel – Input */}
        <div className="verify-left">
          {/* Scheme selector */}
          <select
            className="verify-scheme-select"
            value={selectedScheme}
            onChange={e => setSelectedScheme(e.target.value)}
            aria-label="Select scheme / document"
          >
            {SCHEME_DOCS.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Error banner */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-md)', fontSize: 13, color: '#991b1b', marginBottom: 12 }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Verification failed:</strong> {error}
                <button onClick={() => verify()} style={{ marginLeft: 8, color: '#991b1b', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                  <RefreshCw size={12} style={{ marginRight: 3 }} />Retry
                </button>
              </div>
            </div>
          )}

          {/* Claim textarea */}
          <textarea
            className="verify-textarea"
            placeholder="Paste the claim or statement here"
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={4}
            id="verify-input"
          />

          {/* Verify button */}
          <button className="verify-btn" onClick={() => verify()} disabled={!input.trim() || loading} id="verify-submit-btn">
            {loading ? <><Loader2 size={17} className="spin" /> Analyzing...</> : <><Shield size={17} /> Verify Claim</>}
          </button>

          {/* Example chips */}
          <div className="verify-examples">
            <p className="verify-ex-label">Try these examples:</p>
            {EXAMPLE_CLAIMS.map((c, i) => (
              <button key={i} className="verify-ex-chip" onClick={() => { setInput(c); verify(c); }} id={`verify-ex-${i}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel – Results */}
        <div className="verify-right">
          {loading && (
            <div className="verify-loading">
              <Loader2 size={32} className="spin" />
              <p>Cross‑checking claim against official scheme data…</p>
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
                      background: overallCfg.badgeBg,
                      color: '#fff',
                      borderRadius: 999,
                      padding: '2px 10px',
                      fontSize: 13,
                      fontWeight: 700,
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
                <p className="vr-claim-text">"{result.original}"</p>
              </div>

              {/* Plain‑language explanation */}
              {result.explanation && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>{result.explanation}</p>
                </div>
              )}

              {/* Supporting / contradicting evidence */}
              {(result.supporting_evidence || result.contradicting_evidence) && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.supporting_evidence && (
                    <div style={{ fontSize: 13, color: '#065f46', background: '#ecfdf5', borderRadius: 8, padding: '8px 12px' }}>
                      <strong>Supporting evidence:</strong> {result.supporting_evidence}
                    </div>
                  )}
                  {result.contradicting_evidence && (
                    <div style={{ fontSize: 13, color: '#991b1b', background: '#fef2f2', borderRadius: 8, padding: '8px 12px' }}>
                      <strong>Contradicting evidence:</strong> {result.contradicting_evidence}
                    </div>
                  )}
                </div>
              )}

              {/* Sub‑claims breakdown */}
              {result.subClaims.length > 0 && (
                <div className="vr-subclaims">
                  <h3 className="vr-subclaims-title">Detailed Analysis</h3>
                  {result.subClaims.map((sc, i) => {
                    const scCfg = SUB_VERDICT_CFG[sc.verdict] ?? SUB_VERDICT_CFG.UNVERIFIABLE;
                    return (
                      <div key={i} className="vr-subclaim" style={{ borderColor: scCfg.border, background: scCfg.bg }}>
                        <div className="vr-sc-header" style={{ color: scCfg.color }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                            }}
                          >
                            {scCfg.label}
                          </span>
                        </div>
                        {sc.text && sc.text !== result.original && (
                          <p style={{ fontSize: 13, fontWeight: 600, margin: '4px 0 6px', color: 'var(--navy)' }}>{sc.text}</p>
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
                <div style={{ padding: '10px 16px', fontSize: 12, color: '#6b7280', background: '#f9fafb', borderTop: '1px solid var(--border)', borderRadius: '0 0 12px 12px' }}>
                  {result.caveats}
                </div>
              )}

              <div className="vr-disclaimer">
                Always verify critical information directly on official government portals before making decisions.
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !result && !error && (
            <div className="verify-empty">
              <Shield size={48} className="verify-empty-icon" />
              <h3>Fact‑check any claim</h3>
              <p>Enter a statement about a government scheme, policy, or benefit on the left. Our AI will verify it using official data and return a grounded verdict.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function normaliseOverall(v: string): VerifyResult['overall'] {
  const map: Record<string, VerifyResult['overall']> = {
    verified: 'verified',
    true: 'verified',
    false: 'false',
    partially_correct: 'partially_correct',
    partially_true: 'partially_correct',
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
