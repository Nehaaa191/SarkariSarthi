import React from 'react';
import { Monitor, Globe, Sparkles, Lock, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../i18n/context';
import './TrustSection.css';

const trustIcons = [
  <Monitor size={24} key="0" />,
  <Globe size={24} key="1" />,
  <Sparkles size={24} key="2" />,
  <Lock size={24} key="3" />,
];

export default function TrustSection() {
  const { t } = useI18n();

  return (
    <section className="trust-section" id="trust" aria-label="Why choose us">
      <div className="container">
        <div className="trust-header">
          <span className="section-label">{t.trust.label}</span>
          <h2 className="trust-heading">{t.trust.heading}</h2>
          <p className="trust-sub">{t.trust.sub}</p>
        </div>

        <div className="trust-grid">
          {t.trust.cards.map((card, i) => (
            <div key={i} className="trust-card" id={`trust-card-${i}`}>
              <div className="tc-check">
                <CheckCircle2 size={14} />
              </div>
              <div className="tc-icon">
                {trustIcons[i]}
              </div>
              <h3 className="tc-title">{card.title}</h3>
              <p className="tc-desc">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
