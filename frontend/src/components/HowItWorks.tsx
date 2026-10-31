import React from 'react';
import { MessageSquare, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n/context';
import './HowItWorks.css';

const stepIcons = [
  <MessageSquare size={22} key="0" />,
  <Sparkles size={22} key="1" />,
  <Shield size={22} key="2" />,
  <ArrowRight size={22} key="3" />,
];

export default function HowItWorks() {
  const { t } = useI18n();

  return (
    <section className="how-section" id="how-it-works" aria-label="How it works">
      <div className="container">
        <div className="how-header">
          <span className="section-label">{t.how.label}</span>
          <h2 className="how-heading">{t.how.heading}</h2>
          <p className="how-sub">{t.how.sub}</p>
        </div>

        <div className="how-steps">
          {t.how.steps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="how-step">
                <div className="how-step-icon-wrap">
                  <div className={`how-step-icon ${i === t.how.steps.length - 1 ? 'last' : ''}`}>
                    {stepIcons[i]}
                  </div>
                </div>
                <div className="how-step-num">{step.num}</div>
                <h3 className="how-step-title">{step.title}</h3>
                <p className="how-step-desc">{step.desc}</p>
              </div>
              {i < t.how.steps.length - 1 && (
                <div className="how-connector" aria-hidden="true">
                  <div className="how-connector-line" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
