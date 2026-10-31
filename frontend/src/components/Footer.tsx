import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { useI18n } from '../i18n/context';
import './Footer.css';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-main">
        <div className="container">
          <div className="footer-grid">
            {/* Brand column */}
            <div className="footer-brand">
              <Link to="/" className="footer-logo">
                <div className="footer-logo-icon">🪄</div>
                <span className="footer-logo-text">
                  <b>Sarkari</b><span className="footer-logo-gold">Saathi</span>
                </span>
              </Link>
              <p className="footer-tagline">{t.footer.tagline}</p>
              <div className="footer-lang">
                <Globe size={14} />
                <span>{t.footer.lang}</span>
              </div>
            </div>

            {/* Product */}
            <div className="footer-col">
              <h4 className="footer-col-title">{t.footer.product}</h4>
              <ul className="footer-links">
                {t.footer.links.product.map((link, i) => (
                  <li key={i}>
                    <Link to={['/schemes', '/how-it-works', '/chat', '/eligibility'][i] || '/'} className="footer-link">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div className="footer-col">
              <h4 className="footer-col-title">{t.footer.resources}</h4>
              <ul className="footer-links">
                {t.footer.links.resources.map((link, i) => (
                  <li key={i}>
                    <a href="#" className="footer-link">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="footer-col">
              <h4 className="footer-col-title">{t.footer.contact}</h4>
              <ul className="footer-links">
                {t.footer.links.contact.map((link, i) => (
                  <li key={i}>
                    <a href={i === 0 ? `mailto:${link}` : '#'} className="footer-link">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span className="footer-copy">{t.footer.copy}</span>
          <div className="footer-disclaimer">
            <span className="footer-disclaimer-icon">🛡</span>
            <span>{t.footer.disclaimer}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
