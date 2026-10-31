import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, BookOpen, UserCheck, Shield, FileCheck,
  LayoutDashboard, Star, ArrowRight, Clock, TrendingUp
} from 'lucide-react';
import './Dashboard.css';

const saved = JSON.parse(localStorage.getItem('saved_schemes') || '[]');

const schemeNames: Record<string, string> = {
  csss: 'Central Sector Scholarship',
  pmkisan: 'PM-KISAN',
  pmjay: 'Ayushman Bharat PM-JAY',
  pmay: 'PM Awas Yojana',
  mudra: 'PM Mudra Yojana',
  pmmvy: 'PM Matru Vandana Yojana',
  ssy: 'Sukanya Samriddhi Yojana',
  'nsp-sc': 'National Scholarship – SC/ST/OBC',
};

const quickActions = [
  { icon: <Sparkles size={20} />, label: 'Ask Saathi AI', sub: 'Chat about any scheme', href: '/chat', color: '#4F46E5' },
  { icon: <UserCheck size={20} />, label: 'Check Eligibility', sub: 'Find matching schemes', href: '/eligibility', color: '#10B981' },
  { icon: <Shield size={20} />, label: 'Verify a Claim', sub: 'Fact-check forwards', href: '/verify', color: '#EF4444' },
  { icon: <BookOpen size={20} />, label: 'Browse Schemes', sub: '8 official schemes', href: '/schemes', color: '#D97706' },
];

const recentActivity = [
  { text: 'Checked eligibility for PM-KISAN', time: 'Just now', icon: <UserCheck size={14} /> },
  { text: 'Asked about Central Sector Scholarship', time: '10 min ago', icon: <Sparkles size={14} /> },
  { text: 'Verified: "₹12,000 PM-KISAN claim"', time: '1 hr ago', icon: <Shield size={14} /> },
];

export default function Dashboard() {
  return (
    <div className="dash-page">
      <div className="dash-hero">
        <div className="container">
          <h1 className="dash-h1">Your Civic Workspace</h1>
          <p className="dash-sub">Everything you need to navigate government schemes — in one place.</p>
        </div>
      </div>

      <div className="container dash-body">
        {/* Quick actions */}
        <section className="dash-section">
          <h2 className="dash-section-title">Quick Actions</h2>
          <div className="dash-quick-grid">
            {quickActions.map((a, i) => (
              <Link key={i} to={a.href} className="dash-quick-card" id={`dash-quick-${i}`}>
                <div className="dqc-icon" style={{ background: `${a.color}15`, color: a.color }}>
                  {a.icon}
                </div>
                <div>
                  <div className="dqc-label">{a.label}</div>
                  <div className="dqc-sub">{a.sub}</div>
                </div>
                <ArrowRight size={16} className="dqc-arrow" />
              </Link>
            ))}
          </div>
        </section>

        <div className="dash-two-col">
          {/* Saved schemes */}
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Saved Schemes</h2>
              <Link to="/schemes" className="dash-see-all">Browse all →</Link>
            </div>
            {saved.length === 0 ? (
              <div className="dash-empty-state">
                <Star size={28} />
                <p>No saved schemes yet. Browse schemes and star the ones relevant to you.</p>
                <Link to="/schemes" className="dash-empty-btn">Browse Schemes</Link>
              </div>
            ) : (
              <div className="dash-saved-list">
                {saved.map((id: string) => (
                  <div key={id} className="dash-saved-item">
                    <BookOpen size={15} />
                    <span>{schemeNames[id] || id}</span>
                    <Link to="/chat" state={{ initialQuery: `Tell me how to apply for ${schemeNames[id]}` }} className="dash-saved-ask">
                      Ask →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent activity */}
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Recent Activity</h2>
            </div>
            <div className="dash-activity-list">
              {recentActivity.map((a, i) => (
                <div key={i} className="dash-activity-item">
                  <div className="dai-icon">{a.icon}</div>
                  <div className="dai-text">{a.text}</div>
                  <div className="dai-time"><Clock size={11} /> {a.time}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Stats */}
        <section className="dash-section">
          <h2 className="dash-section-title">Platform Overview</h2>
          <div className="dash-stats-grid">
            {[
              { label: 'Schemes Available', val: '8', icon: <BookOpen size={18} />, color: '#4F46E5' },
              { label: 'Citizens Helped', val: '2.4L+', icon: <TrendingUp size={18} />, color: '#10B981' },
              { label: 'Claims Verified', val: '12,000+', icon: <Shield size={18} />, color: '#D97706' },
              { label: 'Languages', val: '2 (EN/HI)', icon: <Sparkles size={18} />, color: '#7C3AED' },
            ].map((s, i) => (
              <div key={i} className="dash-stat-card">
                <div className="dsc-icon" style={{ color: s.color }}>{s.icon}</div>
                <div className="dsc-val">{s.val}</div>
                <div className="dsc-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
