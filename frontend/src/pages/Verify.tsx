import { useState } from 'react';
import { Shield, CheckCircle2, AlertCircle, X, Loader2, ArrowLeft, ExternalLink, Info, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFeaturesDrawer } from '../context/FeaturesDrawerContext';
import './Verify.css';

interface SubClaim {
  text: string;
  verdict: 'verified' | 'misleading' | 'false' | 'unverifiable' | 'outdated';
  evidence?: string;
  source?: string;
}

interface VerifyResult {
  original: string;
  overall: 'verified' | 'partially_correct' | 'misleading' | 'false' | 'unverifiable';
  subClaims: SubClaim[];
  timestamp: Date;
}

// Known claim database (MVP)
const KNOWN_CLAIMS: Array<{ pattern: RegExp; verdict: SubClaim['verdict']; evidence: string; source: string }> = [
  { pattern: /student.*receive.*10.?000|scholarship.*10.?000/i, verdict: 'verified', evidence: 'Central Sector Scholarship provides ₹10,000/year for UG and ₹20,000/year for PG students.', source: 'scholarships.gov.in - MoE Guidelines 2024-25' },
  { pattern: /pm.?kisan.*6000|₹6.?000.*pm.?kisan/i, verdict: 'verified', evidence: 'PM-KISAN provides ₹6,000 per year in 3 installments of ₹2,000 each.', source: 'pmkisan.gov.in' },
  { pattern: /pm.?kisan.*12000|₹12.?000.*kisan/i, verdict: 'false', evidence: 'PM-KISAN provides ₹6,000/year, NOT ₹12,000. This is a common misinformation.', source: 'pmkisan.gov.in' },
  { pattern: /ayushman.*5 ?lakh|₹5.*lakh.*health/i, verdict: 'verified', evidence: 'Ayushman Bharat PM-JAY provides health cover of ₹5 lakh per family per year.', source: 'pmjay.gov.in' },
  { pattern: /ayushman.*10 ?lakh|₹10.*lakh.*ayushman/i, verdict: 'false', evidence: 'Ayushman Bharat PM-JAY provides ₹5 lakh, not ₹10 lakh. Always check official portal.', source: 'pmjay.gov.in' },
  { pattern: /mudra.*50 ?lakh|mudra loan.*50/i, verdict: 'false', evidence: 'PM Mudra Yojana maximum is ₹10 lakh (Tarun category). Not ₹50 lakh.', source: 'mudra.org.in' },
  { pattern: /mudra.*10 ?lakh/i, verdict: 'verified', evidence: 'PM Mudra Yojana Tarun category provides loans up to ₹10 lakh.', source: 'mudra.org.in' },
  { pattern: /free.*laptop.*government|government.*free.*laptop/i, verdict: 'unverifiable', evidence: 'No central government scheme currently provides free laptops to all students. Some state governments have local schemes. Verify with your state government.', source: 'N/A - State level varies' },
];

async function verifyClaim(claim: string): Promise<VerifyResult> {
  // Check local database first for instant known matches
  const localMatches = KNOWN_CLAIMS.filter(kc => kc.pattern.test(claim));

  let subClaims: SubClaim[] = localMatches.map(m => ({
    text: claim,
    verdict: m.verdict,
    evidence: m.evidence,
    source: m.source,
  }));

  // If local direct match is verified or false, we can use it immediately
  if (subClaims.length > 0 && subClaims[0].verdict !== 'unverifiable') {
    return {
      original: claim,
      overall: inferOverall(subClaims),
      subClaims,
      timestamp: new Date(),
    };
  }

  // Otherwise, call Flask Backend (Groq) for deeper atomic claim analysis
  const endpoints = ['/api/verify', 'http://127.0.0.1:5000/api/verify', 'http://localhost:5000/api/verify'];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim }),
      });

      if (res.ok) {
        const parsed = await res.json();
        if (parsed?.subClaims && Array.isArray(parsed.subClaims)) {
          const formattedSubClaims = parsed.subClaims.map((sc: any) => ({
            text: sc.text || claim,
            verdict: String(sc.verdict || 'unverifiable').toLowerCase().replace('_', '') as SubClaim['verdict'],
            evidence: sc.evidence || '',
            source: sc.source || 'Official Portals',
          }));

          return {
            original: claim,
            overall: parsed.overall || inferOverall(formattedSubClaims),
            subClaims: formattedSubClaims,
            timestamp: new Date(),
          };
        }
      }
    } catch {
      // Try next endpoint or fall through to fallback
    }
  }

  // Fallback: local analysis
  if (subClaims.length === 0) {
    subClaims = [{
      text: claim,
      verdict: 'unverifiable',
      evidence: 'This specific claim was not found in our local scheme database. Please verify on official government portals.',
      source: 'N/A',
    }];
  }

  return { original: claim, overall: inferOverall(subClaims), subClaims, timestamp: new Date() };
}

function inferOverall(subs: SubClaim[]): VerifyResult['overall'] {
  if (subs.every(s => s.verdict === 'verified')) return 'verified';
  if (subs.some(s => s.verdict === 'false')) return 'false';
  if (subs.some(s => s.verdict === 'misleading')) return 'misleading';
  if (subs.every(s => s.verdict === 'unverifiable')) return 'unverifiable';
  return 'partially_correct';
}

const verdictConfig = {
  verified: { label: 'Verified', color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0', icon: <CheckCircle2 size={16} /> },
  partially_correct: { label: 'Partially Correct', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', icon: <AlertCircle size={16} /> },
  misleading: { label: 'Misleading', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: <AlertCircle size={16} /> },
  false: { label: 'False', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', icon: <X size={16} /> },
  unverifiable: { label: 'Unverifiable', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: <Info size={16} /> },
  outdated: { label: 'Outdated', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: <AlertCircle size={16} /> },
};

const EXAMPLE_CLAIMS = [
  'A student will receive ₹10,000 as scholarship from the government',
  'PM-KISAN gives ₹12,000 per year to farmers',
  'Ayushman Bharat provides ₹5 lakh health cover per family',
  'The government is giving free laptops to all students',
  'PM Mudra loan goes up to ₹50 lakh',
];

export default function Verify() {
  const { openDrawer } = useFeaturesDrawer();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setHistory] = useState<VerifyResult[]>([]);

  const verify = async (claim?: string) => {
    const text = (claim || input).trim();
    if (!text) return;
    setLoading(true);
    setResult(null);
    const r = await verifyClaim(text);
    setResult(r);
    setHistory(prev => [r, ...prev].slice(0, 5));
    setLoading(false);
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
          <p className="verify-sub">Paste any WhatsApp forward, SMS, or social media post about a government scheme. We'll check it against official sources.</p>

          <textarea
            className="verify-textarea"
            placeholder="Paste the claim or statement here..."
            value={input}
            onChange={e => setInput(e.target.value)}
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
              <p>Analyzing claim against official scheme data...</p>
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

              <div className="vr-disclaimer">
                Always verify critical information directly on official government portals before making decisions.
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="verify-empty">
              <Shield size={48} className="verify-empty-icon" />
              <h3>Fact-check government claims</h3>
              <p>Paste any claim about a government scheme on the left and we'll verify it against official sources.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
