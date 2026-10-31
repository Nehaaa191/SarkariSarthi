import React, { useState } from 'react';
import { Search, BookOpen, ExternalLink, ChevronRight, Filter, ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Schemes.css';

interface Scheme {
  id: string;
  name: string;
  ministry: string;
  category: string;
  amount: string;
  beneficiaries: string;
  description: string;
  eligibilityHighlights: string[];
  portal: string;
  portalUrl: string;
  tags: string[];
  color: string;
}

const SCHEMES: Scheme[] = [
  {
    id: 'csss',
    name: 'Central Sector Scholarship',
    ministry: 'Ministry of Education',
    category: 'Education',
    amount: '₹10,000–₹20,000/year',
    beneficiaries: '82,000 students/year',
    description: 'Merit and means-based scholarship for college and university students who scored in the top 80th percentile in class 12.',
    eligibilityHighlights: ['Top 80th percentile in Class 12', 'Family income ≤ ₹8 lakh/year', 'Age ≤ 25 years', 'First-year UG or PG student'],
    portal: 'scholarships.gov.in',
    portalUrl: 'https://scholarships.gov.in',
    tags: ['scholarship', 'student', 'education', 'merit'],
    color: '#4F46E5',
  },
  {
    id: 'pmkisan',
    name: 'PM-KISAN',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    category: 'Agriculture',
    amount: '₹6,000/year',
    beneficiaries: '11 crore+ farmers',
    description: 'Direct income support to small and marginal farmer families owning up to 2 hectares of land.',
    eligibilityHighlights: ['Small/marginal farmer', 'Land ≤ 2 hectares', 'Indian citizen', 'Not an income-tax payer'],
    portal: 'pmkisan.gov.in',
    portalUrl: 'https://pmkisan.gov.in',
    tags: ['farmer', 'agriculture', 'income support', 'rural'],
    color: '#10B981',
  },
  {
    id: 'pmjay',
    name: 'Ayushman Bharat PM-JAY',
    ministry: 'Ministry of Health & Family Welfare',
    category: 'Health',
    amount: '₹5 lakh/family/year',
    beneficiaries: '50 crore+ citizens',
    description: 'World\'s largest health insurance/assurance scheme covering 1,929+ medical procedures for BPL and vulnerable families.',
    eligibilityHighlights: ['Listed in SECC 2011 database', 'BPL/vulnerable family', 'No need to enrol separately', 'Covers pre & post hospitalization'],
    portal: 'pmjay.gov.in',
    portalUrl: 'https://pmjay.gov.in',
    tags: ['health', 'insurance', 'hospital', 'BPL'],
    color: '#EF4444',
  },
  {
    id: 'pmay',
    name: 'PM Awas Yojana – Urban',
    ministry: 'Ministry of Housing & Urban Affairs',
    category: 'Housing',
    amount: 'Subsidy up to ₹2.67 lakh',
    beneficiaries: '1.12 crore+ homes',
    description: 'Housing for All mission providing interest subsidy on home loans for EWS, LIG and MIG families.',
    eligibilityHighlights: ['EWS: income ≤ ₹3 lakh', 'LIG: ₹3–6 lakh income', 'Must not own pucca house', 'First-time home buyer'],
    portal: 'pmaymis.gov.in',
    portalUrl: 'https://pmaymis.gov.in',
    tags: ['housing', 'home loan', 'subsidy', 'urban'],
    color: '#D97706',
  },
  {
    id: 'mudra',
    name: 'PM Mudra Yojana',
    ministry: 'Ministry of Finance',
    category: 'Finance',
    amount: 'Up to ₹10 lakh loan',
    beneficiaries: '40 crore+ loans disbursed',
    description: 'Collateral-free loans for small and micro businesses in three tiers: Shishu (₹50K), Kishor (₹5L), Tarun (₹10L).',
    eligibilityHighlights: ['Non-farm income activity', 'Small/micro business', 'No collateral required', 'Any bank or NBFC'],
    portal: 'mudra.org.in',
    portalUrl: 'https://mudra.org.in',
    tags: ['business', 'loan', 'entrepreneur', 'finance'],
    color: '#7C3AED',
  },
  {
    id: 'pmmvy',
    name: 'PM Matru Vandana Yojana',
    ministry: 'Ministry of Women & Child Development',
    category: 'Women & Child',
    amount: '₹5,000 (3 instalments)',
    beneficiaries: '1.75 crore+ women',
    description: 'Maternity benefit programme providing conditional cash transfer to pregnant and lactating mothers for their first live birth.',
    eligibilityHighlights: ['Pregnant/lactating woman', 'First live birth', 'Age ≥ 19 years', 'Not a central govt employee'],
    portal: 'wcd.nic.in',
    portalUrl: 'https://wcd.nic.in',
    tags: ['women', 'maternity', 'child', 'health'],
    color: '#EC4899',
  },
  {
    id: 'ssy',
    name: 'Sukanya Samriddhi Yojana',
    ministry: 'Ministry of Finance',
    category: 'Finance',
    amount: '~8.2% interest rate',
    beneficiaries: 'Girl children below 10',
    description: 'High-interest savings scheme for the girl child under Beti Bachao Beti Padhao. Matures at age 21.',
    eligibilityHighlights: ['Girl child below 10 years', 'Opened by parent/guardian', 'Deposit ₹250 to ₹1.5L/year', 'Tax benefits under 80C'],
    portal: 'indiapost.gov.in',
    portalUrl: 'https://www.indiapost.gov.in',
    tags: ['girl', 'savings', 'education', 'beti bachao'],
    color: '#F59E0B',
  },
  {
    id: 'nsp-sc',
    name: 'National Scholarship – SC/ST/OBC/Minority',
    ministry: 'Multiple Ministries',
    category: 'Education',
    amount: 'Varies by scheme',
    beneficiaries: 'Crores of students',
    description: 'Pre-matric and post-matric scholarships for SC, ST, OBC and minority students at all levels of education.',
    eligibilityHighlights: ['SC/ST/OBC/Minority student', 'Income limits apply', 'Pre & post-matric', 'Apply via NSP portal'],
    portal: 'scholarships.gov.in',
    portalUrl: 'https://scholarships.gov.in',
    tags: ['scholarship', 'SC', 'ST', 'OBC', 'minority'],
    color: '#0EA5E9',
  },
];

const CATEGORIES = ['All', 'Education', 'Agriculture', 'Health', 'Housing', 'Finance', 'Women & Child'];

export default function Schemes() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [saved, setSaved] = useState<string[]>(() => JSON.parse(localStorage.getItem('saved_schemes') || '[]'));

  const toggleSave = (id: string) => {
    setSaved(prev => {
      const next = prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id];
      localStorage.setItem('saved_schemes', JSON.stringify(next));
      return next;
    });
  };

  const filtered = SCHEMES.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.tags.some(t => t.includes(q)) || s.description.toLowerCase().includes(q);
    const matchesCat = category === 'All' || s.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="schemes-page">
      {/* Header */}
      <div className="schemes-topbar">
        <div className="container schemes-topbar-inner">
          <div className="schemes-topbar-left">
            <Link to="/" className="schemes-back"><ArrowLeft size={15} /> Home</Link>
            <h1 className="schemes-h1">Government Schemes</h1>
            <p className="schemes-sub">{SCHEMES.length} hand-curated schemes with official sources</p>
          </div>
          <Link to="/eligibility" className="schemes-elig-btn" id="schemes-check-elig">
            Check my eligibility →
          </Link>
        </div>
      </div>

      <div className="container schemes-body">
        {/* Search + filter bar */}
        <div className="schemes-filter-bar">
          <div className="schemes-search">
            <Search size={17} className="schemes-search-icon" />
            <input
              type="text"
              className="schemes-search-input"
              placeholder="Search schemes, categories, keywords..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="schemes-search"
            />
          </div>
          <div className="schemes-cats">
            <Filter size={14} className="filter-icon" />
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`cat-btn ${category === cat ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
                id={`cat-${cat.toLowerCase().replace(' & ', '-')}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="schemes-grid">
          {filtered.map(scheme => (
            <div key={scheme.id} className="scheme-card" id={`scheme-${scheme.id}`}>
              <div className="sc-header" style={{ borderLeftColor: scheme.color }}>
                <div className="sc-category" style={{ background: `${scheme.color}18`, color: scheme.color }}>
                  {scheme.category}
                </div>
                <button
                  className={`sc-save-btn ${saved.includes(scheme.id) ? 'saved' : ''}`}
                  onClick={() => toggleSave(scheme.id)}
                  id={`save-${scheme.id}`}
                  aria-label={saved.includes(scheme.id) ? 'Unsave scheme' : 'Save scheme'}
                >
                  {saved.includes(scheme.id) ? '★' : '☆'}
                </button>
              </div>
              <h3 className="sc-name">{scheme.name}</h3>
              <p className="sc-ministry">{scheme.ministry}</p>
              <p className="sc-desc">{scheme.description}</p>

              <div className="sc-highlight-row">
                <div className="sc-highlight">
                  <span className="sc-hl-label">Amount</span>
                  <span className="sc-hl-val" style={{ color: scheme.color }}>{scheme.amount}</span>
                </div>
                <div className="sc-highlight">
                  <span className="sc-hl-label">Beneficiaries</span>
                  <span className="sc-hl-val">{scheme.beneficiaries}</span>
                </div>
              </div>

              <div className="sc-eligibility">
                <p className="sc-elig-title">Key eligibility:</p>
                <ul className="sc-elig-list">
                  {scheme.eligibilityHighlights.map(h => (
                    <li key={h}><ChevronRight size={11} /> {h}</li>
                  ))}
                </ul>
              </div>

              <div className="sc-actions">
                <Link to={`/chat`} state={{ initialQuery: `Tell me about ${scheme.name} eligibility and how to apply` }} className="sc-ask-btn" id={`ask-${scheme.id}`}>
                  Ask Saathi
                </Link>
                <a href={scheme.portalUrl} target="_blank" rel="noopener noreferrer" className="sc-portal-btn" id={`portal-${scheme.id}`}>
                  <FileText size={13} /> {scheme.portal} <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="schemes-empty">
            <Search size={36} />
            <p>No schemes found for "<strong>{search}</strong>". Try a different keyword or category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
