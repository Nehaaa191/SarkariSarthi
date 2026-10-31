import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Globe, Menu, X } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useFeaturesDrawer } from '../context/FeaturesDrawerContext';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { t, lang, setLang } = useI18n();
  const { openDrawer } = useFeaturesDrawer();
  const { user, isAuthenticated, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMobileOpen(false);
    await logout();
    navigate('/');
  };

  const userInitial = (user?.name?.[0] || user?.email?.[0] || user?.phone?.[0] || 'U').toUpperCase();
  const userDisplay = user?.name || user?.email || user?.phone || 'Citizen';

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

          {isAuthenticated ? (
            <div className="nav-user-dropdown-container" ref={dropdownRef}>
              <button
                className="nav-user-avatar-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User menu"
                aria-expanded={dropdownOpen}
                id="nav-user-avatar"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={userDisplay} className="nav-user-avatar-img" />
                ) : (
                  <span>{userInitial}</span>
                )}
              </button>

              {dropdownOpen && (
                <div className="nav-user-dropdown-menu">
                  <div className="nav-user-menu-header">
                    <div className="nav-user-menu-name">{user?.name || 'Citizen'}</div>
                    <div className="nav-user-menu-sub">{user?.email || user?.phone}</div>
                  </div>
                  <div className="nav-user-menu-divider" />
                  <Link
                    to="/dashboard"
                    className="nav-user-menu-item"
                    onClick={() => setDropdownOpen(false)}
                    id="nav-dropdown-dashboard"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    className="nav-user-menu-item nav-user-menu-signout"
                    onClick={handleLogout}
                    id="nav-dropdown-signout"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/signin" className="btn-nav-outline" id="nav-signin">
              {t.nav.signIn}
            </Link>
          )}

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

          {isAuthenticated ? (
            <>
              <div className="mobile-user-info">
                <div className="nav-user-avatar-btn" style={{ width: 32, height: 32 }}>
                  {user?.avatar ? (
                    <img src={user.avatar} alt={userDisplay} className="nav-user-avatar-img" />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <div className="mobile-user-details">
                  <div className="nav-user-menu-name">{user?.name || 'Citizen'}</div>
                  <div className="nav-user-menu-sub">{user?.email || user?.phone}</div>
                </div>
              </div>
              <Link
                to="/dashboard"
                className="btn-nav-outline full-width"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
              <button
                type="button"
                className="btn-nav-outline full-width"
                style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/signin"
              className="btn-nav-outline full-width"
              onClick={() => setMobileOpen(false)}
            >
              {t.nav.signIn}
            </Link>
          )}

          <Link to="/chat" className="btn-nav-filled full-width" onClick={() => setMobileOpen(false)}>
            {t.nav.getStarted}
          </Link>
        </div>
      </div>
    </nav>
  );
}

