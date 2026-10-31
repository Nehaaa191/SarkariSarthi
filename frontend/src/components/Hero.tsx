import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, CheckCircle2, FileText, Shield } from 'lucide-react';
import { useI18n } from '../i18n/context';
import './Hero.css';

function ChatPreview() {
  return (
    <div className="chat-preview-card" aria-hidden="true">
      {/* Card header */}
      <div className="cp-header">
        <div className="cp-avatar">
          <span>✦</span>
        </div>
        <div>
          <div className="cp-title">Saathi AI</div>
          <div className="cp-sub">● Illustrative Preview</div>
        </div>
        <div className="cp-dots"><span/><span/><span/></div>
      </div>

      {/* Official sources badge */}
      <div className="cp-body">
        <div className="cp-source-badge">
          <CheckCircle2 size={12} />
          <span>Sample Interaction · Grounded in official schemes</span>
        </div>

        {/* User message */}
        <div className="cp-msg user">
          Am I eligible for a central scholarship as a first-year college student?
        </div>

        {/* AI response */}
        <div className="cp-msg ai">
          I can help check that. Based on what you shared, you may qualify for the{' '}
          <strong>Central Sector Scholarship</strong>.
        </div>

        {/* PDF reference */}
        <div className="cp-pdf-card">
          <div className="cp-pdf-icon">
            <FileText size={14} />
          </div>
          <div className="cp-pdf-text">
            <div className="cp-pdf-name">Scholarship Guidelines 2024–25</div>
            <div className="cp-pdf-meta">Ministry of Education · PDF</div>
          </div>
          <ArrowRight size={14} className="cp-pdf-arrow" />
        </div>

        {/* Criteria status */}
        <div className="cp-match">
          <div className="cp-match-label">
            <CheckCircle2 size={12} className="cp-match-icon" />
            <span>Criteria Assessment</span>
          </div>
          <span className="cp-match-count">Sample</span>
        </div>

        {/* Criteria chips */}
        <div className="cp-chips">
          <span className="cp-chip"><CheckCircle2 size={10} /> First-year student</span>
          <span className="cp-chip"><CheckCircle2 size={10} /> Income criteria</span>
        </div>

        {/* Input */}
        <div className="cp-input-bar">
          <span className="cp-input-placeholder">Ask a follow-up...</span>
          <div className="cp-send-btn">
            <ArrowRight size={14} />
          </div>
        </div>
      </div>

      {/* Language badge */}
      <div className="cp-lang-badge">
        <Shield size={12} />
        <span>हिंदी सुरु</span>
      </div>

      {/* Decorative circle */}
      <div className="cp-circle" aria-hidden="true" />
    </div>
  );
}

export default function Hero() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero-section" aria-label="Hero">
      <div className="hero-bg-split" aria-hidden="true" />

      <div className="hero-container">
        {/* Left content */}
        <div className="hero-left">
          {/* Badge */}
          <div className="hero-badge">
            <span className="hero-badge-icon">✦</span>
            <span>{t.hero.badge}</span>
            <span className="hero-badge-new">{t.hero.badgeNew}</span>
          </div>

          {/* Heading */}
          <h1 className="hero-heading">
            <span className="hero-h-line">{t.hero.heading1}</span>
            <span className="hero-h-line hero-h-accent">{t.hero.heading2}</span>
            <span className="hero-h-line">{t.hero.heading3}</span>
          </h1>

          {/* Subtext */}
          <p className="hero-sub">{t.hero.sub}</p>

          {/* CTAs */}
          <div className="hero-ctas">
            <button
              className="btn-primary hero-btn-primary"
              onClick={() => navigate('/schemes')}
              id="hero-explore-btn"
            >
              {t.hero.cta1}
              <ArrowRight size={17} />
            </button>
            <button
              className="btn-secondary hero-btn-secondary"
              onClick={() => scrollTo('how-it-works')}
              id="hero-how-btn"
            >
              <Play size={15} fill="currentColor" />
              {t.hero.cta2}
            </button>
          </div>

          {/* Trust indicators */}
          <div className="hero-trust">
            {[t.hero.trust1, t.hero.trust2, t.hero.trust3].map((item) => (
              <span key={item} className="hero-trust-item">
                <CheckCircle2 size={14} />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Chat preview */}
        <div className="hero-right">
          <ChatPreview />
        </div>
      </div>
    </section>
  );
}
