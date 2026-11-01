
import { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom'; import {
  FileText,
  Mic,
  UserCheck,
  Shield,
  FileCheck,
  X,
  ArrowRight,
  Sparkles,
  LayoutDashboard
} from 'lucide-react';
import { useFeaturesDrawer } from '../context/FeaturesDrawerContext';
import { useI18n } from '../i18n/context';
import './FeaturesDrawer.css';

interface FeatureOptionConfig {
  id: string;
  route: string;
  icon: typeof FileText;
  color: string;
  bg: string;
  badgeEn: string;
  badgeHi: string;
}

const FEATURE_CONFIGS: FeatureOptionConfig[] = [
  {
    id: 'policy-explainer',
    route: '/schemes',
    icon: FileText,
    color: '#172554',
    bg: '#F1F5F9',
    badgeEn: 'Policy Reader',
    badgeHi: 'नीति पाठक',
  },
  {
    id: 'voice-assistant',
    route: '/chat',
    icon: Mic,
    color: '#E89A36',
    bg: '#FEF9E7',
    badgeEn: 'Voice & Chat',
    badgeHi: 'वॉयस और चैट',
  },
  {
    id: 'eligibility-checker',
    route: '/eligibility',
    icon: UserCheck,
    color: '#172554',
    bg: '#F1F5F9',
    badgeEn: 'Check Match',
    badgeHi: 'पात्रता जांच',
  },
  {
    id: 'claim-verifier',
    route: '/verify',
    icon: Shield,
    color: '#172554',
    bg: '#F1F5F9',
    badgeEn: 'Fact-Check',
    badgeHi: 'तथ्य जांच',
  },
  {
    id: 'application-assistant',
    route: '/apply',
    icon: FileCheck,
    color: '#172554',
    bg: '#F1F5F9',
    badgeEn: 'Application Guide',
    badgeHi: 'आवेदन गाइड',
  },
];

export default function FeaturesDrawer() {
  const { isOpen, closeDrawer } = useFeaturesDrawer();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  // Close drawer on Escape key and manage body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeDrawer();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeDrawer]);

  const handleSelectOption = (route: string) => {
    closeDrawer();
    navigate(route);
  };

  return (
    <div
      className={`features-drawer-container ${isOpen ? 'open' : ''}`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop overlay */}
      <div
        className="features-drawer-backdrop"
        onClick={closeDrawer}
        aria-label="Close sidebar"
      />

      {/* Drawer panel */}
      <aside className="features-drawer-panel" role="dialog" aria-modal="true" aria-label="Features menu">
        {/* Drawer header */}
        <div className="drawer-header">
          <Link to="/" className="drawer-brand" onClick={closeDrawer}>
            <div className="drawer-logo">🪄</div>
            <div className="drawer-brand-text">
              <span className="brand-dark">Sarkari</span>
              <span className="brand-gold">Saathi</span>
            </div>
          </Link>
          <button
            className="drawer-close-btn"
            onClick={closeDrawer}
            aria-label="Close menu"
            id="drawer-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Section title */}
        <div className="drawer-section-info">
          <div className="drawer-badge-row">
            <span className="drawer-section-badge">
              <Sparkles size={12} />
              {lang === 'hi' ? '5 AI सेवाएं' : '5 AI Services'}
            </span>
            <span className="drawer-subtitle">
              {lang === 'hi' ? 'एक विकल्प चुनें' : 'Select an option'}
            </span>
          </div>
          <p className="drawer-tagline">
            {lang === 'hi'
              ? 'आधिकारिक सरकारी स्रोतों द्वारा संचालित'
              : 'Powered by verified civic data & official portals'}
          </p>
        </div>

        {/* The 5 Card Options */}
        <div className="drawer-options-list">
          {FEATURE_CONFIGS.map((cfg, index) => {
            const cardData = t.features.cards[index] || {
              title: cfg.id,
              desc: '',
              cta: 'Launch',
            };
            const Icon = cfg.icon;
            const isActive = location.pathname.startsWith(cfg.route);
            const badge = lang === 'hi' ? cfg.badgeHi : cfg.badgeEn;

            return (
              <button
                key={cfg.id}
                className={`drawer-card-option ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectOption(cfg.route)}
                id={`drawer-card-${index}`}
                style={{ '--accent-color': cfg.color } as React.CSSProperties}
              >
                <div
                  className="dco-icon-box"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  <Icon size={20} />
                </div>
                <div className="dco-content">
                  <div className="dco-top">
                    <span className="dco-title">{cardData.title}</span>
                    <span
                      className="dco-badge"
                      style={{ color: cfg.color, borderColor: `${cfg.color}35`, background: cfg.bg }}
                    >
                      {badge}
                    </span>
                  </div>
                  <p className="dco-desc">{cardData.desc}</p>
                </div>
                <div className="dco-arrow">
                  <ArrowRight size={16} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Drawer footer */}
        <div className="drawer-footer">
          <Link
            to="/dashboard"
            className="drawer-footer-link"
            onClick={closeDrawer}
            id="drawer-nav-dashboard"
          >
            <LayoutDashboard size={16} />
            <span>{lang === 'hi' ? 'वर्कस्पेस डैशबोर्ड' : 'Workspace Overview'}</span>
          </Link>
          <div className="drawer-footer-note">
            <span>© 2026 SarkariSaathi</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

