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

async function verifyClaim(claim: string, apiKey: string): Promise<VerifyResult> {
  if (!apiKey) {
    return {
      original: claim,
      overall: 'unverifiable',
      subClaims: [{
        text: claim,
        verdict: 'unverifiable',
        evidence: 'Automated claim verification requires an active Gemini AI connection. Connect your API key in Chat to enable live analysis, or verify directly with official government portals.',
        source: 'Official portals',
      }],
      timestamp: new Date(),
    };
  }

  // Use Gemini to decompose and verify
  const prompt = `You are a fact-checker for Indian government schemes.

Claim to verify: "${claim}"

Task: 
1. Decompose this claim into atomic sub-claims
2. For each sub-claim, evaluate against verified government scheme data:
   - VERIFIED: matches official data
   - MISLEADING: technically not wrong but misleads
   - FALSE: directly contradicts official data
   - UNVERIFIABLE: cannot be confirmed from official sources
   - OUTDATED: may have been correct before but is now changed

Respond in JSON:
{
  "subClaims": [
    {"text": "sub-claim text", "verdict": "VERIFIED|MISLEADING|FALSE|UNVERIFIABLE|OUTDATED", "evidence": "explanation", "source": "official portal"}
  ],
  "overall": "verified|partially_correct|misleading|false|unverifiable"
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
        })
      }
    );
    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const subClaims: SubClaim[] = parsed.subClaims.map((sc: any) => ({
          text: sc.text,
          verdict: (sc.verdict || 'unverifiable').toLowerCase().replace('_', '') as SubClaim['verdict'],
          evidence: sc.evidence,
          source: sc.source,
        }));
        return {
          original: claim,
          overall: parsed.overall || inferOverall(subClaims),
          subClaims,
          timestamp: new Date(),
        };
      }
    }
  } catch {
    // API failure fallback
  }

  return {
    original: claim,
    overall: 'unverifiable',
    subClaims: [{
      text: claim,
      verdict: 'unverifiable',
      evidence: 'Could not complete automated verification against official sources. Always verify critical information directly on official government portals.',
      source: 'Official portals',
    }],
    timestamp: new Date(),
  };
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
  outdated: { label: 'Outdated', color: '#172554', bg: '#F1F5F9', border: '#E2E8F0', icon: <AlertCircle size={16} /> },
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
  const apiKey = localStorage.getItem('gemini_api_key') || '';

  const verify = async (claim?: string) => {
    const text = (claim || input).trim();
    if (!text) return;
    setLoading(true);
    setResult(null);
    const r = await verifyClaim(text, apiKey);
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
          <p className="verify-sub">Paste any statement or social media claim about a government scheme. We'll verify it against official sources.</p>

          {!apiKey && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--yellow-light)',
              border: '1px solid var(--yellow)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12.5px',
              color: 'var(--navy)',
              marginBottom: '14px',
              lineHeight: 1.5,
            }}>
              ℹ️ Live AI claim verification requires a Gemini API key. You can connect your free API key in <Link to="/chat" style={{ fontWeight: 700, textDecoration: 'underline' }}>Chat</Link>.
            </div>
          )}

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
