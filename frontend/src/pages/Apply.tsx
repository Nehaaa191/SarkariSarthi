import { useParams, Link } from 'react-router-dom';
import { ExternalLink, FileText, ArrowLeft, Sparkles, Menu, Info, ShieldCheck } from 'lucide-react';
import { useFeaturesDrawer } from '../context/FeaturesDrawerContext';
import './Apply.css';

interface SchemePortalInfo {
  name: string;
  portal: string;
  portalUrl: string;
}

const SCHEME_PORTALS: Record<string, SchemePortalInfo> = {
  csss: {
    name: 'Central Sector Scholarship (CSSS)',
    portal: 'scholarships.gov.in',
    portalUrl: 'https://scholarships.gov.in',
  },
  pmkisan: {
    name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
    portal: 'pmkisan.gov.in',
    portalUrl: 'https://pmkisan.gov.in',
  },
  pmjay: {
    name: 'Ayushman Bharat PM-JAY',
    portal: 'pmjay.gov.in',
    portalUrl: 'https://pmjay.gov.in',
  },
  pmay: {
    name: 'PM Awas Yojana – Urban (PMAY-U)',
    portal: 'pmaymis.gov.in',
    portalUrl: 'https://pmaymis.gov.in',
  },
  mudra: {
    name: 'PM Mudra Yojana (PMMY)',
    portal: 'mudra.org.in',
    portalUrl: 'https://mudra.org.in',
  },
  pmmvy: {
    name: 'PM Matru Vandana Yojana (PMMVY)',
    portal: 'wcd.nic.in',
    portalUrl: 'https://wcd.nic.in',
  },
  ssy: {
    name: 'Sukanya Samriddhi Yojana (SSY)',
    portal: 'indiapost.gov.in',
    portalUrl: 'https://www.indiapost.gov.in',
  },
  'nsp-sc': {
    name: 'National Scholarship Portal – SC/ST/OBC/Minority',
    portal: 'scholarships.gov.in',
    portalUrl: 'https://scholarships.gov.in',
  },
  guide: {
    name: 'Government Scheme Application Guide',
    portal: 'National Portal of India',
    portalUrl: 'https://www.india.gov.in',
  },
};

export default function Apply() {
  const { openDrawer } = useFeaturesDrawer();
  const { id = 'guide' } = useParams<{ id: string }>();
  const scheme = SCHEME_PORTALS[id] || SCHEME_PORTALS['guide'];

  return (
    <div className="apply-page">
      <div className="apply-topbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            className="topbar-drawer-btn"
            onClick={openDrawer}
            aria-label="Open 5 AI Features Sidebar"
            title="Open Features"
            id="apply-drawer-btn"
          >
            <Menu size={18} />
          </button>
          <Link to="/schemes" className="apply-back"><ArrowLeft size={15} /> Schemes</Link>
        </div>
        <div className="apply-topbar-title"><FileText size={17} /> Application Guide</div>
        <Link to="/chat" state={{ initialQuery: `How do I apply for ${scheme.name}?` }} className="apply-ask-btn">
          <Sparkles size={14} /> Ask Saathi
        </Link>
      </div>

      <div className="apply-content">
        {/* Scheme header */}
        <div className="apply-scheme-header">
          <h1 className="apply-h1">{scheme.name}</h1>
          <a href={scheme.portalUrl} target="_blank" rel="noopener noreferrer" className="apply-portal-link">
            <ExternalLink size={14} /> Official Portal: {scheme.portal}
          </a>
        </div>

        {/* Informational Preparation State */}
        <div className="apply-info-card">
          <div className="apply-info-header">
            <div className="apply-info-icon">
              <Info size={22} />
            </div>
            <div>
              <h2 className="apply-info-title">Scheme-Specific Guide in Preparation</h2>
              <p className="apply-info-sub">Sourced only from verified government gazettes and ministry portals</p>
            </div>
          </div>
          <div className="apply-info-body">
            <p>
              Scheme-specific application instructions, required document checklists, and submission timelines will be provided directly from verified official government sources.
            </p>
            <p>
              To protect citizens from procedural errors and misinformation, we do not show generic checklists or unverified steps. Please use the verified official portal below for authentic application filing and document requirements.
            </p>
          </div>
          <div className="apply-info-actions">
            <a
              href={scheme.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="apply-portal-primary-btn"
            >
              <ExternalLink size={15} /> Open Official Portal ({scheme.portal})
            </a>
            <Link to="/schemes" className="apply-portal-secondary-btn">
              Browse Other Schemes
            </Link>
          </div>
        </div>

        <div className="apply-trust-note">
          <ShieldCheck size={18} />
          <div>
            <strong>Official Submission Notice:</strong> All applications must be submitted directly through government portals or authorized Common Service Centres (CSCs). Sarkari Saathi does not collect documents or process applications.
          </div>
        </div>
      </div>
    </div>
  );
}
