import { CheckCircle2, Upload, FileText } from 'lucide-react';
import { useI18n } from '../i18n/context';
import './DashboardPreview.css';

function DashboardMockup() {
  return (
    <div className="db-mockup" aria-hidden="true">
      {/* Top bar */}
      <div className="db-topbar">
        <div className="db-logo">
          <span className="db-logo-icon">🪄</span>
          <span className="db-logo-text"><b>Sarkari</b><span className="db-logo-gold">Saathi</span></span>
        </div>
        <div className="db-search">
          <span className="db-search-icon">🔍</span>
          <span className="db-search-placeholder">Search policies and schemes...</span>
        </div>
        <div className="db-topbar-right">
          <span className="db-lang">En</span>
          <div className="db-avatar">AK</div>
        </div>
      </div>

      <div className="db-body">
        {/* Sidebar */}
        <div className="db-sidebar">
          <div className="db-sidebar-label">WORKSPACE</div>
          {[
            { icon: '⊞', label: 'Overview', active: false },
            { icon: '✦', label: 'Ask Saathi', active: false },
            { icon: '📄', label: 'Policy Reader', active: true },
            { icon: '✓', label: 'Eligibility', active: false },
            { icon: '🛡', label: 'Claim Verifier', active: false },
          ].map((item, i) => (
            <div key={i} className={`db-nav-item ${item.active ? 'active' : ''}`}>
              <span className="db-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
          <div className="db-need-help">
            <div className="db-help-icon">✦</div>
            <div>
              <div className="db-help-title">Need help?</div>
              <div className="db-help-sub">Ask Saathi to guide you through policy</div>
              <span className="db-help-link">Start chat →</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="db-main">
          <div className="db-breadcrumb">Policy Reader</div>
          <div className="db-doc-header">
            <div>
              <h3 className="db-doc-title">Central Sector Scholarship</h3>
              <div className="db-doc-meta">Guidelines by <span className="db-doc-meta-link">College and University Students, 2024–26</span></div>
            </div>
            <button className="db-upload-btn">
              <Upload size={12} /> Upload document
            </button>
          </div>

          <div className="db-tabs">
            {['Policy reader', 'Eligibility', 'Claim checker'].map((tab, i) => (
              <span key={i} className={`db-tab ${i === 0 ? 'active' : ''}`}>{tab}</span>
            ))}
          </div>

          <div className="db-content-area">
            {/* Document preview */}
            <div className="db-doc-preview">
              <div className="db-doc-page-label">Page 1 of 3</div>
              <div className="db-doc-ministry">MINISTRY OF EDUCATION</div>
              <div className="db-doc-heading">Central Sector Scheme of Scholarship</div>
              <div className="db-doc-sub">Equity and merit-driven</div>
              <div className="db-doc-lines">
                <div className="db-line full" />
                <div className="db-line w90 yellow" />
                <div className="db-line w85 yellow" />
                <div className="db-line full" />
                <div className="db-line w70" />
              </div>
              <div className="db-highlight-box">
                Students who are above the 80th percentile of successful candidates in the scheme area may be considered, subject to application conditions.
              </div>
            </div>

            {/* AI sidebar */}
            <div className="db-ai-sidebar">
              <div className="db-ai-header">
                <span className="db-ai-icon">✦</span>
                <span>Ask about this policy</span>
              </div>
              <div className="db-ai-suggestion">Explain the income requirements in simple.</div>
              <div className="db-ai-response">
                The income limit for families applying is ₹8 lakh per annum. You'll need to provide an income certificate.
                <div className="db-ai-ref"><FileText size={10} /> Sourced Page 4 (point 3.2)</div>
              </div>
              <div className="db-ai-suggested">
                <div className="db-ai-sug-q">What documents do I need?</div>
                <div className="db-ai-sug-q">How is merit calculated?</div>
              </div>
              <div className="db-ai-input-bar">
                <span className="db-ai-placeholder">Continue the policy...</span>
                <div className="db-ai-send">➤</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPreview() {
  const { t } = useI18n();

  return (
    <section className="dbprev-section" id="dashboard" aria-label="Dashboard preview">
      <div className="container">
        <div className="dbprev-layout">
          {/* Left text */}
          <div className="dbprev-left">
            <span className="section-label">{t.dashboard.label}</span>
            <h2 className="dbprev-heading">
              {t.dashboard.heading1}
              <br />
              <span className="dbprev-h-accent">{t.dashboard.heading2}</span>
            </h2>
            <p className="dbprev-sub">{t.dashboard.sub}</p>
            <div className="dbprev-badges">
              <span className="dbprev-badge">
                <CheckCircle2 size={13} /> {t.dashboard.badge1}
              </span>
              <span className="dbprev-badge">
                <CheckCircle2 size={13} /> {t.dashboard.badge2}
              </span>
            </div>
          </div>

          {/* Right: full dashboard mockup */}
          <div className="dbprev-right">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
