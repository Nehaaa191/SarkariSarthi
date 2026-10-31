import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Circle, ExternalLink, FileText, ArrowLeft, Sparkles } from 'lucide-react';
import './Apply.css';

interface Step {
  id: string;
  title: string;
  desc: string;
  docs?: string[];
  link?: string;
  linkLabel?: string;
}

const GUIDES: Record<string, { name: string; portal: string; portalUrl: string; steps: Step[] }> = {
  csss: {
    name: 'Central Sector Scholarship',
    portal: 'scholarships.gov.in',
    portalUrl: 'https://scholarships.gov.in',
    steps: [
      { id: '1', title: 'Check eligibility', desc: 'Confirm you scored above the 80th percentile in Class 12 and your family income is ≤ ₹8 lakh/year.', docs: ['Class 12 marksheet', 'Income certificate'] },
      { id: '2', title: 'Register on NSP', desc: 'Create an account on the National Scholarship Portal (scholarships.gov.in) using your Aadhaar number.', link: 'https://scholarships.gov.in', linkLabel: 'Go to NSP' },
      { id: '3', title: 'Fill application form', desc: 'Select "Central Sector Scheme of Scholarship" from the list and fill in your academic and personal details.' },
      { id: '4', title: 'Upload documents', desc: 'Upload scanned copies of all required documents. Make sure files are under 200KB each.', docs: ['Aadhaar card', 'Class 12 marksheet', 'Income certificate', 'Bank passbook', 'Photograph', 'Caste certificate (if SC/ST/OBC)'] },
      { id: '5', title: 'Submit and note application number', desc: 'Submit the form and note your Application Reference Number for tracking.' },
      { id: '6', title: 'Institute verification', desc: 'Your college/institute will verify your application. Follow up with your institution if pending.' },
      { id: '7', title: 'Track status', desc: 'Track your application status on the NSP portal. Scholarship is disbursed directly to your Aadhaar-linked bank account.', link: 'https://scholarships.gov.in', linkLabel: 'Track Application' },
    ],
  },
  pmkisan: {
    name: 'PM-KISAN',
    portal: 'pmkisan.gov.in',
    portalUrl: 'https://pmkisan.gov.in',
    steps: [
      { id: '1', title: 'Check beneficiary status', desc: 'Visit pmkisan.gov.in and check if your name is in the beneficiary list using Aadhaar or bank account number.', link: 'https://pmkisan.gov.in', linkLabel: 'Check Status' },
      { id: '2', title: 'Visit local patwari/CSC', desc: 'If not registered, visit your nearest Common Service Centre (CSC) or Patwari/Revenue Officer with documents.', docs: ['Aadhaar card', 'Land records (Khatoni)', 'Bank passbook', 'Mobile number'] },
      { id: '3', title: 'Self-registration (optional)', desc: 'Farmers can self-register on the PM-KISAN portal under the "Farmers Corner" section.', link: 'https://pmkisan.gov.in/FarmerRegistration.aspx', linkLabel: 'Self Register' },
      { id: '4', title: 'eKYC completion', desc: 'Complete eKYC on the portal using OTP or biometric at a CSC to receive instalments.' },
      { id: '5', title: 'Receive instalments', desc: '₹2,000 is credited to your Aadhaar-linked bank account every 4 months automatically once approved.' },
    ],
  },
  guide: {
    name: 'Application Guide',
    portal: 'scholarships.gov.in',
    portalUrl: 'https://scholarships.gov.in',
    steps: [
      { id: '1', title: 'Use eligibility checker', desc: 'Use our Eligibility Checker to find schemes that match your profile.', link: '/eligibility', linkLabel: 'Check Eligibility' },
      { id: '2', title: 'Browse schemes', desc: 'Browse our curated list of 8 government schemes to find the right one.', link: '/schemes', linkLabel: 'Browse Schemes' },
      { id: '3', title: 'Ask Saathi', desc: 'Ask Saathi AI for detailed guidance on any specific scheme.', link: '/chat', linkLabel: 'Open Chat' },
      { id: '4', title: 'Visit official portal', desc: 'Always apply through official government portals only. Be careful of fraudulent websites.' },
    ],
  },
};

export default function Apply() {
  const { id = 'guide' } = useParams<{ id: string }>();
  const guide = GUIDES[id] || GUIDES['guide'];
  const [completed, setCompleted] = useState<string[]>([]);

  const toggleStep = (stepId: string) => {
    setCompleted(prev => prev.includes(stepId) ? prev.filter(s => s !== stepId) : [...prev, stepId]);
  };

  const progress = Math.round((completed.length / guide.steps.length) * 100);

  return (
    <div className="apply-page">
      <div className="apply-topbar">
        <Link to="/schemes" className="apply-back"><ArrowLeft size={15} /> Schemes</Link>
        <div className="apply-topbar-title"><FileText size={17} /> Application Guide</div>
        <Link to="/chat" state={{ initialQuery: `How do I apply for ${guide.name}?` }} className="apply-ask-btn">
          <Sparkles size={14} /> Ask Saathi
        </Link>
      </div>

      <div className="apply-content">
        {/* Scheme header */}
        <div className="apply-scheme-header">
          <h1 className="apply-h1">{guide.name}</h1>
          <a href={guide.portalUrl} target="_blank" rel="noopener noreferrer" className="apply-portal-link">
            <ExternalLink size={14} /> Official Portal: {guide.portal}
          </a>
        </div>

        {/* Progress bar */}
        <div className="apply-progress-card">
          <div className="apc-header">
            <span className="apc-label">Application Checklist</span>
            <span className="apc-count">{completed.length}/{guide.steps.length} completed</span>
          </div>
          <div className="apc-bar">
            <div className="apc-fill" style={{ width: `${progress}%` }} />
          </div>
          {progress === 100 && (
            <div className="apc-done">🎉 All steps completed! Visit the official portal to submit.</div>
          )}
        </div>

        {/* Steps */}
        <div className="apply-steps">
          {guide.steps.map((step, i) => {
            const done = completed.includes(step.id);
            return (
              <div key={step.id} className={`apply-step ${done ? 'done' : ''}`} id={`step-${step.id}`}>
                <button
                  className={`apply-step-check ${done ? 'checked' : ''}`}
                  onClick={() => toggleStep(step.id)}
                  aria-label={done ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </button>
                <div className="apply-step-body">
                  <div className="apply-step-header">
                    <span className="apply-step-num">Step {i + 1}</span>
                    <h3 className="apply-step-title">{step.title}</h3>
                  </div>
                  <p className="apply-step-desc">{step.desc}</p>
                  {step.docs && step.docs.length > 0 && (
                    <div className="apply-docs">
                      <p className="apply-docs-label">Required documents:</p>
                      <div className="apply-docs-list">
                        {step.docs.map(doc => (
                          <span key={doc} className="apply-doc-chip">
                            <FileText size={11} /> {doc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {step.link && (
                    step.link.startsWith('http') ? (
                      <a href={step.link} target="_blank" rel="noopener noreferrer" className="apply-step-link">
                        {step.linkLabel} <ExternalLink size={12} />
                      </a>
                    ) : (
                      <Link to={step.link} className="apply-step-link">
                        {step.linkLabel} →
                      </Link>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="apply-disclaimer">
          ⚠️ This guide is for informational purposes. Always apply through official government portals. Sarkari Saathi does not process applications.
        </div>
      </div>
    </div>
  );
}
