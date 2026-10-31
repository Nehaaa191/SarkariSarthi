import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, X, ChevronRight, Loader2, ArrowLeft, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Eligibility.css';

interface ProfileData {
  name: string;
  age: string;
  gender: string;
  category: string;
  state: string;
  occupation: string;
  income: string;
  education: string;
  landHolding: string;
  isFirstChild: string;
}

interface SchemeResult {
  name: string;
  status: 'eligible' | 'not_eligible' | 'insufficient_info' | 'possible';
  score: number;
  matched: string[];
  missing: string[];
  amount?: string;
  portal?: string;
  portalUrl?: string;
}

// Rule engine
function evaluateSchemes(p: ProfileData): SchemeResult[] {
  const results: SchemeResult[] = [];
  const inc = parseInt(p.income || '0');
  const age = parseInt(p.age || '0');
  const land = parseFloat(p.landHolding || '0');

  // CSSS
  if (p.education === 'undergraduate' || p.education === '') {
    const matched: string[] = [];
    const missing: string[] = [];
    if (!p.age) missing.push('Age'); else if (age <= 25) matched.push('Age ≤ 25 years');
    if (!p.income) missing.push('Family income'); else if (inc <= 800000) matched.push('Income ≤ ₹8 lakh/year');
    else matched.push('Income criteria not met');
    if (p.education === 'undergraduate') matched.push('UG first year eligible');
    else missing.push('Education level');
    const eligible = matched.filter(m => !m.includes('not met')).length === 3 - missing.length;
    results.push({
      name: 'Central Sector Scholarship (CSSS)',
      status: missing.length > 1 ? 'insufficient_info' : eligible ? 'eligible' : 'not_eligible',
      score: Math.round((matched.length / (matched.length + missing.length)) * 100) || 50,
      matched, missing,
      amount: '₹10,000 – ₹20,000/year',
      portal: 'scholarships.gov.in',
      portalUrl: 'https://scholarships.gov.in',
    });
  }

  // PM-KISAN
  if (p.occupation === 'farmer' || p.occupation === '') {
    const matched: string[] = [];
    const missing: string[] = [];
    if (!p.landHolding) missing.push('Land holding'); else if (land <= 2) matched.push('Land ≤ 2 hectares');
    else { matched.push('Land exceeds limit'); }
    if (p.occupation === 'farmer') matched.push('Occupation: Farmer');
    else missing.push('Confirm farmer occupation');
    if (!p.income) missing.push('Confirm not income tax payer');
    else if (inc < 500000) matched.push('Not likely an income-tax payer');
    const eligible = land <= 2 && land > 0 && p.occupation === 'farmer';
    results.push({
      name: 'PM-KISAN (₹6,000/year)',
      status: missing.length > 1 ? 'insufficient_info' : eligible ? 'eligible' : (land > 2 ? 'not_eligible' : 'possible'),
      score: Math.round((matched.length / (matched.length + missing.length)) * 100) || 40,
      matched, missing,
      amount: '₹6,000/year (₹2,000 × 3 instalments)',
      portal: 'pmkisan.gov.in',
      portalUrl: 'https://pmkisan.gov.in',
    });
  }

  // Ayushman Bharat
  {
    const matched: string[] = [];
    const missing: string[] = [];
    if (!p.income) missing.push('Family income'); else if (inc <= 300000) matched.push('Low income family');
    if (p.category === 'sc' || p.category === 'st') matched.push('SC/ST category benefit');
    if (p.occupation === 'daily_wage' || p.occupation === 'farmer') matched.push('Eligible occupation category');
    if (!p.state) missing.push('State (affects empanelment)');
    const status = matched.length >= 2 ? 'eligible' : missing.length >= 2 ? 'insufficient_info' : 'possible';
    results.push({
      name: 'Ayushman Bharat PM-JAY',
      status,
      score: Math.max(30, Math.round((matched.length / 3) * 100)),
      matched, missing,
      amount: '₹5 lakh health cover/family/year',
      portal: 'pmjay.gov.in',
      portalUrl: 'https://pmjay.gov.in',
    });
  }

  // PM Mudra
  if (p.occupation === 'business' || p.occupation === 'self_employed') {
    results.push({
      name: 'PM Mudra Yojana (Business Loan)',
      status: 'eligible',
      score: 85,
      matched: ['Non-farm business activity', 'Small business eligible'],
      missing: [],
      amount: 'Up to ₹10 lakh loan',
      portal: 'mudra.org.in',
      portalUrl: 'https://mudra.org.in',
    });
  }

  // PMMVY
  if (p.gender === 'female' && p.isFirstChild === 'yes' && age >= 19) {
    results.push({
      name: 'PM Matru Vandana Yojana (PMMVY)',
      status: 'eligible',
      score: 95,
      matched: ['Female applicant', 'First child', 'Age ≥ 19 years'],
      missing: [],
      amount: '₹5,000 (in 3 instalments)',
      portal: 'wcd.nic.in',
      portalUrl: 'https://wcd.nic.in',
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

const questions = [
  { id: 'name', label: 'Your name (optional)', type: 'text', placeholder: 'E.g. Ramesh Kumar', required: false },
  { id: 'age', label: 'Age', type: 'number', placeholder: 'E.g. 22', required: true },
  { id: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', 'other'], labels: ['Male', 'Female', 'Other'], required: true },
  { id: 'category', label: 'Category', type: 'select', options: ['general', 'obc', 'sc', 'st', 'ews'], labels: ['General', 'OBC', 'SC', 'ST', 'EWS'], required: true },
  { id: 'state', label: 'State', type: 'text', placeholder: 'E.g. Uttar Pradesh', required: true },
  { id: 'occupation', label: 'Primary occupation', type: 'select', options: ['student', 'farmer', 'business', 'self_employed', 'daily_wage', 'govt_employee', 'other'], labels: ['Student', 'Farmer', 'Business owner', 'Self-employed', 'Daily wage worker', 'Govt employee', 'Other'], required: true },
  { id: 'income', label: 'Annual family income (₹)', type: 'number', placeholder: 'E.g. 350000', required: true },
  { id: 'education', label: 'Current education', type: 'select', options: ['undergraduate', 'postgraduate', 'school', 'none', 'other'], labels: ['Undergraduate (UG)', 'Postgraduate (PG)', 'School (pre-matric)', 'Not studying', 'Other'], required: false },
  { id: 'landHolding', label: 'Agricultural land (hectares, if farmer)', type: 'number', placeholder: 'E.g. 1.5', required: false },
  { id: 'isFirstChild', label: 'Is this for first child? (for maternity benefits)', type: 'select', options: ['yes', 'no', ''], labels: ['Yes', 'No', 'Not applicable'], required: false },
];

const statusConfig = {
  eligible: { label: 'Eligible', color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0', icon: <CheckCircle2 size={16} /> },
  not_eligible: { label: 'Not Eligible', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', icon: <X size={16} /> },
  insufficient_info: { label: 'Need More Info', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: <AlertCircle size={16} /> },
  possible: { label: 'Possibly Eligible', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', icon: <AlertCircle size={16} /> },
};

export default function Eligibility() {
  const [step, setStep] = useState<'form' | 'results'>('form');
  const [profile, setProfile] = useState<ProfileData>({
    name: '', age: '', gender: '', category: '', state: '',
    occupation: '', income: '', education: '', landHolding: '', isFirstChild: ''
  });
  const [results, setResults] = useState<SchemeResult[]>([]);
  const [checking, setChecking] = useState(false);

  const handleChange = (id: string, val: string) => {
    setProfile(p => ({ ...p, [id]: val }));
  };

  const check = async () => {
    if (!profile.age || !profile.gender || !profile.income) {
      alert('Please fill in Age, Gender, and Annual Income at minimum.');
      return;
    }
    setChecking(true);
    await new Promise(r => setTimeout(r, 1200)); // simulate processing
    const r = evaluateSchemes(profile);
    setResults(r);
    setChecking(false);
    setStep('results');
  };

  return (
    <div className="elig-page">
      {/* Header */}
      <div className="elig-topbar">
        <Link to="/chat" className="elig-back"><ArrowLeft size={16} /> Dashboard</Link>
        <div className="elig-topbar-title">
          <UserCheck size={18} />
          <span>Smart Eligibility Checker</span>
        </div>
        <Link to="/" className="elig-home-link">← Home</Link>
      </div>

      <div className="elig-content">
        {step === 'form' ? (
          <div className="elig-form-wrap">
            <div className="elig-form-header">
              <h1 className="elig-h1">Find your eligible schemes</h1>
              <p className="elig-sub">Fill in your profile. We'll check against official eligibility rules — no guesswork.</p>
            </div>

            <div className="elig-form">
              <div className="elig-fields">
                {questions.map(q => (
                  <div key={q.id} className="elig-field">
                    <label className="elig-label" htmlFor={`elig-${q.id}`}>
                      {q.label} {q.required && <span className="req">*</span>}
                    </label>
                    {q.type === 'select' ? (
                      <select
                        id={`elig-${q.id}`}
                        className="elig-select"
                        value={(profile as any)[q.id]}
                        onChange={e => handleChange(q.id, e.target.value)}
                      >
                        <option value="">Select...</option>
                        {q.options!.map((opt, i) => (
                          <option key={opt} value={opt}>{q.labels![i]}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={q.type}
                        id={`elig-${q.id}`}
                        className="elig-input"
                        placeholder={q.placeholder}
                        value={(profile as any)[q.id]}
                        onChange={e => handleChange(q.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>

              <button
                className="elig-submit-btn"
                onClick={check}
                disabled={checking}
                id="elig-check-btn"
              >
                {checking ? <><Loader2 size={18} className="spin" /> Checking schemes...</> : <>Check Eligibility <ChevronRight size={18} /></>}
              </button>
            </div>
          </div>
        ) : (
          <div className="elig-results-wrap">
            <div className="elig-results-header">
              <button className="elig-back-btn" onClick={() => setStep('form')} id="elig-back-btn">
                <ArrowLeft size={15} /> Edit Profile
              </button>
              <h2 className="elig-results-title">Eligibility Results for {profile.name || 'Your Profile'}</h2>
              <p className="elig-results-sub">Based on official eligibility rules. Always verify on official portals.</p>
            </div>

            <div className="elig-summary-row">
              {['eligible', 'possible', 'insufficient_info', 'not_eligible'].map(s => {
                const count = results.filter(r => r.status === s).length;
                const cfg = statusConfig[s as keyof typeof statusConfig];
                return (
                  <div key={s} className="elig-summary-card" style={{ background: cfg.bg, borderColor: cfg.border }}>
                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                    <div className="elig-summary-count" style={{ color: cfg.color }}>{count}</div>
                    <div className="elig-summary-label">{cfg.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="elig-results-list">
              {results.map((r, i) => {
                const cfg = statusConfig[r.status];
                return (
                  <div key={i} className="elig-result-card" style={{ borderColor: cfg.border }} id={`result-${i}`}>
                    <div className="erc-header" style={{ background: cfg.bg }}>
                      <div className="erc-status" style={{ color: cfg.color }}>
                        {cfg.icon} {cfg.label}
                      </div>
                      <h3 className="erc-name">{r.name}</h3>
                      {r.amount && <span className="erc-amount">{r.amount}</span>}
                    </div>
                    <div className="erc-body">
                      {/* Score bar */}
                      <div className="erc-score-row">
                        <span className="erc-score-label">Match score</span>
                        <span className="erc-score-val">{r.score}%</span>
                      </div>
                      <div className="erc-progress">
                        <div className="erc-progress-fill" style={{ width: `${r.score}%`, background: cfg.color }} />
                      </div>

                      {/* Criteria */}
                      <div className="erc-criteria">
                        {r.matched.map(m => (
                          <span key={m} className="erc-criterion matched"><CheckCircle2 size={11} /> {m}</span>
                        ))}
                        {r.missing.map(m => (
                          <span key={m} className="erc-criterion missing"><AlertCircle size={11} /> Missing: {m}</span>
                        ))}
                      </div>

                      {r.portal && (
                        <a href={r.portalUrl} target="_blank" rel="noopener noreferrer" className="erc-portal-btn">
                          Apply on {r.portal} →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}

              {results.length === 0 && (
                <div className="elig-no-results">
                  <AlertCircle size={32} />
                  <p>No schemes matched your profile. Try adjusting your answers or ask Saathi AI for more options.</p>
                  <Link to="/chat" className="btn-primary">Ask Saathi AI</Link>
                </div>
              )}
            </div>

            <div className="elig-disclaimer">
              ⚠️ These results are based on publicly available eligibility rules and may not account for all conditions. Always verify on official government portals before applying.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
