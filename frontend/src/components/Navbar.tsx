import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Globe, Menu, X } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useFeaturesDrawer } from '../context/FeaturesDrawerContext';
import './Navbar.css';

export default function Navbar() {
  const { t, lang, setLang } = useI18n();
  const { openDrawer } = useFeaturesDrawer();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    if (!isHome) {
      navigate('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleFeaturesClick = () => {
    setMobileOpen(false);
    openDrawer();
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="nav-container">
        {/* Top-left corner 3 lines hamburger menu */}
        <button
          className="nav-hamburger-btn"
          onClick={openDrawer}
          aria-label="Open Features Sidebar"
          title="Open 5 AI Features"
          id="nav-hamburger-btn"
        >
          <Menu size={22} />
        </button>

        {/* Brand */}
        <Link to="/" className="nav-brand" aria-label="SarkariSaathi Home">
          <div className="nav-logo">
            <span className="logo-icon">🪄</span>
          </div>
          <span className="brand-text">
            <span className="brand-dark">Sarkari</span>
            <span className="brand-gold">Saathi</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="nav-links">
          <button className="nav-link" onClick={handleFeaturesClick} id="nav-features">
            {t.nav.features}
          </button>
          <button className="nav-link" onClick={() => scrollTo('how-it-works')} id="nav-how">
            {t.nav.howItWorks}
          </button>
          <Link to="/schemes" className="nav-link" id="nav-schemes">
            {t.nav.schemes}
          </Link>
          <Link to="/about" className="nav-link" id="nav-about">
            {t.nav.about}
          </Link>
        </div>

        {/* Desktop Actions */}
        <div className="nav-actions">
          <button
            className="lang-btn"
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            aria-label={`Switch to ${lang === 'en' ? 'Hindi' : 'English'}`}
            id="lang-toggle"
          >
            <Globe size={15} />
            <span>{t.nav.langToggle}</span>
          </button>
          <Link to="/dashboard" className="btn-nav-outline" id="nav-signin">
            {t.nav.signIn}
          </Link>
          <Link to="/chat" className="btn-nav-filled" id="nav-get-started">
            {t.nav.getStarted}
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          id="mobile-menu-toggle"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <button className="mobile-link" onClick={handleFeaturesClick}>
          {t.nav.features} (5 AI Services)
        </button>
        <button className="mobile-link" onClick={() => scrollTo('how-it-works')}>
          {t.nav.howItWorks}
        </button>
        <Link to="/schemes" className="mobile-link" onClick={() => setMobileOpen(false)}>
          {t.nav.schemes}
        </Link>
        <Link to="/about" className="mobile-link" onClick={() => setMobileOpen(false)}>
          {t.nav.about}
        </Link>
        <div className="mobile-actions">
          <button
            className="lang-btn full-width"
            onClick={() => {
              setLang(lang === 'en' ? 'hi' : 'en');
              setMobileOpen(false);
            }}
          >
            <Globe size={15} /> {t.nav.langToggle}
          </button>
          <Link to="/dashboard" className="btn-nav-outline full-width" onClick={() => setMobileOpen(false)}>
            {t.nav.signIn}
          </Link>
          <Link to="/chat" className="btn-nav-filled full-width" onClick={() => setMobileOpen(false)}>
            {t.nav.getStarted}
          </Link>
        </div>
      </div>
    </nav>
  );
}
