import { useEffect, useRef } from 'react';
import { ArrowRight, MessageCircle, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/context';
import './CTASection.css';

function AIOrb() {
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame: number;
    let t = 0;
    const animate = () => {
      t += 0.01;
      if (orbRef.current) {
        orbRef.current.style.transform = `translateY(${Math.sin(t) * 10}px)`;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="cta-orb-wrap" aria-hidden="true">
      {/* Rings */}
      <div className="cta-ring cta-ring-1" />
      <div className="cta-ring cta-ring-2" />

      {/* Orb */}
      <div className="cta-orb" ref={orbRef}>
        <span className="cta-orb-icon">✦</span>
      </div>

      {/* Floating tags */}
      <div className="cta-tag cta-tag-1">
        <MessageCircle size={12} />
        <span>Ask naturally</span>
      </div>
      <div className="cta-tag cta-tag-2">
        <Shield size={12} />
        <span>Verify clearly</span>
      </div>
    </div>
  );
}

export default function CTASection() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <section className="cta-section" id="get-started" aria-label="Get started">
      <div className="container">
        <div className="cta-layout">
          {/* Left */}
          <div className="cta-left">
            <span className="section-label light">{t.cta.label}</span>
            <h2 className="cta-heading">
              {t.cta.heading1}
              <br />
              {t.cta.heading2}
            </h2>
            <p className="cta-sub">{t.cta.sub}</p>
            <button
              className="btn-gold cta-btn"
              onClick={() => navigate('/chat')}
              id="cta-get-started-btn"
            >
              {t.cta.btn}
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Right: AI orb */}
          <div className="cta-right">
            <AIOrb />
          </div>
        </div>
      </div>
    </section>
  );
}
