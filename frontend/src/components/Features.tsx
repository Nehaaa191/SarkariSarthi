import React from 'react';
import { ArrowRight, FileText, Mic, Shield, FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/context';
import './Features.css';

const featureRoutes = ['/schemes', '/chat', '/eligibility', '/verify', '/apply'];

const FeaturePreviews = [
  /* Policy Explainer */
  () => (
    <div className="fp fp-policy">
      <div className="fp-doc-row">
        <div className="fp-doc-icon"><FileText size={13} /></div>
        <span className="fp-doc-name">Policy document</span>
      </div>
      <div className="fp-doc-lines">
        <div className="fp-line full" />
        <div className="fp-line w80" />
        <div className="fp-line w60" />
      </div>
      <div className="fp-summary-badge">
        <span className="fp-sum-icon">✦</span>
        <span>A summary</span>
      </div>
    </div>
  ),
  /* Voice */
  () => (
    <div className="fp fp-voice">
      <div className="fp-voice-text">नमस्ते, मैं आपकी कैसे मदद कर सकता हूँ?</div>
      <div className="fp-waveform">
        {[3,6,9,12,8,5,11,7,4,10,6,8].map((h,i) => (
          <div key={i} className="fp-wave-bar" style={{ height: `${h * 2.5}px`, animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
      <div className="fp-listen-label">
        <span className="fp-listen-dot" />
        Listening in Hindi
      </div>
    </div>
  ),
  /* Eligibility */
  () => (
    <div className="fp fp-eligibility">
      <div className="fp-elig-header">
        <span>Eligibility match</span>
        <span className="fp-elig-pct">76%</span>
      </div>
      <div className="fp-elig-ring-wrap">
        <svg viewBox="0 0 60 60" className="fp-elig-ring">
          <circle cx="30" cy="30" r="24" fill="none" stroke="#E2E8F0" strokeWidth="5" />
          <circle cx="30" cy="30" r="24" fill="none" stroke="#1B2060" strokeWidth="5"
            strokeDasharray={`${2 * Math.PI * 24 * 0.75} ${2 * Math.PI * 24 * 0.25}`}
            strokeLinecap="round" transform="rotate(-90 30 30)" />
          <text x="30" y="34" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1B2060">3/4</text>
        </svg>
      </div>
      <div className="fp-elig-note">✓ Some requirements included</div>
    </div>
  ),
  /* Claim Verifier */
  () => (
    <div className="fp fp-claim">
      <div className="fp-claim-text">"A student will receive ₹10,000"</div>
      <div className="fp-verdict">
        <div className="fp-verdict-icon">🔍</div>
        <div>
          <div className="fp-verdict-title">Content needed</div>
          <div className="fp-verdict-sub">Confirm in policy notice</div>
        </div>
      </div>
    </div>
  ),
  /* Application */
  () => (
    <div className="fp fp-apply">
      <div className="fp-apply-header">
        <span>Application checklist</span>
        <span className="fp-apply-count">3/6</span>
      </div>
      {['Aadhar card', 'Income certificate', 'Bank details'].map((item, i) => (
        <div key={i} className="fp-apply-item checked">
          <div className="fp-checkbox checked" />
          <span>{item}</span>
        </div>
      ))}
      <div className="fp-apply-item">
        <div className="fp-checkbox" />
        <span>Caste certificate</span>
      </div>
    </div>
  ),
];

const icons = [
  <FileText size={20} key="0" />,
  <Mic size={20} key="1" />,
  <Shield size={20} key="2" />,
  <Shield size={20} key="3" />,
  <FileCheck size={20} key="4" />,
];

const iconColors = ['#172554', '#E89A36', '#172554', '#172554', '#E89A36'];

export default function Features() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <section className="features-section" id="features" aria-label="Features">
      <div className="container">
        <div className="features-header">
          <span className="section-label">{t.features.label}</span>
          <h2 className="features-heading">
            {t.features.heading}
            <br />
            {t.features.heading2}
          </h2>
          <p className="features-sub">{t.features.sub}</p>
        </div>

        <div className="features-grid">
          {t.features.cards.map((card, i) => {
            const Preview = FeaturePreviews[i];
            return (
              <div key={i} className={`feature-card fc-${i}`} style={{ '--icon-color': iconColors[i] } as React.CSSProperties}>
                <div className="fc-icon" style={{ color: iconColors[i] }}>
                  {icons[i]}
                </div>
                <h3 className="fc-title">{card.title}</h3>
                <p className="fc-desc">{card.desc}</p>
                <button
                  className="fc-cta"
                  onClick={() => navigate(featureRoutes[i])}
                  id={`feature-cta-${i}`}
                >
                  {card.cta}
                  <ArrowRight size={14} />
                </button>
                <div className="fc-preview">
                  <Preview />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
