import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Send, Mic, MicOff, Volume2, VolumeX, FileText, CheckCircle2,
  AlertCircle, X, Sparkles, LayoutDashboard,
  BookOpen, UserCheck, Shield, FileCheck, Menu, ArrowLeft,
  Loader2, ExternalLink, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { useI18n } from '../i18n/context';
import './Chat.css';

// ─── Types ────────────────────────────────────────────────────────
interface Source {
  id: string;
  title: string;
  page?: string;
  url?: string;
  ministry?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Source[];
  eligibility?: EligResult;
  timestamp: Date;
  loading?: boolean;
}

interface EligResult {
  scheme: string;
  status: 'eligible' | 'not_eligible' | 'insufficient_info' | 'possible';
  score?: number;
  matched?: string[];
  missing?: string[];
  explanation?: string;
}

// ─── Call AI API via Flask Backend (Groq) ───────────────────────────
// VITE_API_BASE must be set to the deployed backend URL (e.g. https://sarkarisaathi-backend.onrender.com)
const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/+$/, '');

async function callChatAPI(messages: Array<{ role: string; content: string }>): Promise<string> {
  const endpoint = `${API_BASE}/api/chat`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({} as Record<string, string>));
    throw new Error(
      (errData as { error?: string; message?: string }).error ||
      (errData as { error?: string; message?: string }).message ||
      `Server error (${res.status})`
    );
  }

  const data = await res.json() as { response?: string };
  return data?.response || 'No response received.';
}

// Eligibility rule engine for quick schemes
export function checkEligibility(profile: Record<string, string>): EligResult | null {
  const { scheme, income, marks, age, land } = profile;
  void land;
  if (!scheme) return null;

  if (scheme.toLowerCase().includes('scholarship') || scheme.toLowerCase().includes('csss')) {
    const incomeOk = !income || parseInt(income) <= 800000;
    const marksOk = !marks || parseInt(marks) >= 80;
    const ageOk = !age || parseInt(age) <= 25;
    const matched = [], missing = [];
    if (marksOk && marks) matched.push('80th percentile in class 12');
    else if (!marks) missing.push('Class 12 percentile score');
    if (incomeOk && income) matched.push('Family income ≤ ₹8 lakh');
    else if (!income) missing.push('Family annual income');
    if (ageOk && age) matched.push('Age ≤ 25 years');
    const status = missing.length > 0 ? 'insufficient_info' : (marksOk && incomeOk ? 'eligible' : 'not_eligible');
    return { scheme: 'Central Sector Scholarship', status, matched, missing };
  }

  if (scheme.toLowerCase().includes('kisan') || scheme.toLowerCase().includes('pmkisan')) {
    const landOk = !land || parseFloat(land) <= 2;
    const matched = [], missing = [];
    if (landOk && land) matched.push('Land ≤ 2 hectares');
    else if (!land) missing.push('Land holding (in hectares)');
    const status = missing.length > 0 ? 'insufficient_info' : (landOk ? 'eligible' : 'not_eligible');
    return { scheme: 'PM-KISAN', status, matched, missing };
  }

  return null;
}

// ─── Sidebar nav items ────────────────────────────────────────────
const sidebarItems = [
  { icon: <LayoutDashboard size={17} />, label: 'Overview', path: '/dashboard', id: 'nav-overview' },
  { icon: <Sparkles size={17} />, label: 'Ask Saathi', path: '/chat', id: 'nav-ask' },
  { icon: <BookOpen size={17} />, label: 'Policy Reader', path: '/schemes', id: 'nav-policy' },
  { icon: <UserCheck size={17} />, label: 'Eligibility', path: '/eligibility', id: 'nav-eligibility' },
  { icon: <Shield size={17} />, label: 'Claim Verifier', path: '/verify', id: 'nav-verify' },
  { icon: <FileCheck size={17} />, label: 'Apply', path: '/apply/guide', id: 'nav-apply' },
];

// ─── Message bubble ───────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /[\u0900-\u097F]/.test(text) ? 'hi-IN' : 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`msg-wrap ${isUser ? 'msg-user' : 'msg-ai'}`}>
      {!isUser && (
        <div className="msg-avatar">
          <Sparkles size={13} />
        </div>
      )}
      <div className="msg-bubble-wrap">
        <div className={`msg-bubble ${isUser ? 'bubble-user' : 'bubble-ai'}`}>
          {msg.loading ? (
            <div className="msg-loading">
              <span /><span /><span />
            </div>
          ) : (
            <div className="msg-text" dangerouslySetInnerHTML={{
              __html: msg.content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/^- (.+)/gm, '<li>$1</li>')
                .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
                .replace(/\n/g, '<br/>')
            }} />
          )}
        </div>

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="msg-sources">
            {msg.sources.map(src => (
              <a key={src.id} href={src.url || '#'} className="msg-source-chip" target="_blank" rel="noopener noreferrer">
                <FileText size={11} />
                <span>{src.title}</span>
                {src.page && <span className="src-page">p. {src.page}</span>}
                <ExternalLink size={10} />
              </a>
            ))}
          </div>
        )}

        {/* Eligibility result */}
        {msg.eligibility && (
          <EligibilityCard result={msg.eligibility} />
        )}

        {/* AI actions */}
        {!isUser && !msg.loading && (
          <div className="msg-actions">
            <button className="msg-action-btn" onClick={() => speak(msg.content)} title="Listen">
              <Volume2 size={13} />
            </button>
            <button className="msg-action-btn" title="Helpful">
              <ThumbsUp size={13} />
            </button>
            <button className="msg-action-btn" title="Not helpful">
              <ThumbsDown size={13} />
            </button>
          </div>
        )}
      </div>
      {isUser && (
        <div className="msg-avatar msg-avatar-user">
          <span>U</span>
        </div>
      )}
    </div>
  );
}

function EligibilityCard({ result }: { result: EligResult }) {
  const colors = {
    eligible: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', icon: <CheckCircle2 size={15} /> },
    not_eligible: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', icon: <X size={15} /> },
    insufficient_info: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: <AlertCircle size={15} /> },
    possible: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', icon: <AlertCircle size={15} /> },
  };
  const c = colors[result.status];

  return (
    <div className="elig-card" style={{ background: c.bg, borderColor: c.border }}>
      <div className="elig-header" style={{ color: c.text }}>
        {c.icon}
        <span>{result.scheme}</span>
        <span className="elig-status">{result.status.replace('_', ' ').toUpperCase()}</span>
      </div>
      {result.matched && result.matched.length > 0 && (
        <div className="elig-list">
          {result.matched.map(m => (
            <span key={m} className="elig-item matched"><CheckCircle2 size={11} /> {m}</span>
          ))}
        </div>
      )}
      {result.missing && result.missing.length > 0 && (
        <div className="elig-list">
          {result.missing.map(m => (
            <span key={m} className="elig-item missing"><AlertCircle size={11} /> Missing: {m}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Chat Page ───────────────────────────────────────────────
export default function Chat() {
  const location = useLocation();
  const { lang } = useI18n();
  const initialQuery = location.state?.initialQuery || '';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: lang === 'hi'
        ? 'नमस्ते! मैं साथी AI हूं। सरकारी योजनाओं के बारे में कुछ भी पूछें — पात्रता, दस्तावेज़, आवेदन प्रक्रिया। मैं केवल आधिकारिक स्रोतों से जानकारी देता हूं।'
        : 'Hello! I\'m Saathi AI. Ask me anything about government schemes — eligibility, documents, how to apply. I only cite official sources.',
      sources: [],
      timestamp: new Date(),
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initialQuery && !loading) {
      sendMessage(initialQuery);
    }
  }, []);

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const loadingMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      const history = messages.filter(m => !m.loading).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      const reply = await callChatAPI([...history, { role: 'user', content }]);

      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { ...m, content: reply, loading: false }
          : m
      ));
    } catch (err: any) {
      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? {
            ...m,
            content: `I encountered an error: ${err.message}. Please try again in a moment.`,
            loading: false,
          }
          : m
      ));
    } finally {
      setLoading(false);
    }
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice input requires Chrome browser.'); return; }
    const rec = new SR();
    rec.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    rec.interimResults = true;
    setListening(true);
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setInput(t);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const suggestions = [
    "I'm a farmer with 1.5 acres. Can I get PM-KISAN?",
    "What documents do I need for a scholarship?",
    "My family income is ₹6 lakh. Am I eligible for Ayushman Bharat?",
    "Explain PM Mudra Yojana in Hindi",
    "How do I apply for PM Awas Yojana?",
  ];

  const location2 = useLocation();

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : 'closed'}`} aria-label="Navigation">
        <div className="sidebar-brand">
          <Link to="/" className="sidebar-logo">
            <div className="sidebar-logo-icon">🪄</div>
            {sidebarOpen && <span className="sidebar-logo-text"><b>Sarkari</b><span>Saathi</span></span>}
          </Link>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} id="sidebar-toggle" aria-label="Toggle sidebar">
            <Menu size={17} />
          </button>
        </div>

        {sidebarOpen && <div className="sidebar-section-label">WORKSPACE</div>}

        <nav className="sidebar-nav">
          {sidebarItems.map(item => (
            <Link
              key={item.id}
              to={item.path}
              id={item.id}
              className={`sidebar-item ${location2.pathname === item.path ? 'active' : ''}`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              {sidebarOpen && <span className="sidebar-item-label">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="sidebar-help">
            <div className="sidebar-help-icon"><Sparkles size={13} /></div>
            <div>
              <div className="sidebar-help-title">Need help?</div>
              <div className="sidebar-help-sub">Ask Saathi to guide you through any policy</div>
            </div>
          </div>
        )}
      </aside>

      {/* Main chat area */}
      <div className="chat-main">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <Sparkles size={18} className="chat-header-icon" />
            <div>
              <div className="chat-header-title">Ask Saathi</div>

              <div className="chat-header-sub">● Source: Tracked · Saathi AI</div>

            </div>
          </div>
          <div className="chat-header-actions">
            {speaking && (
              <button className="chat-action-btn" onClick={stopSpeaking} id="stop-speaking-btn">
                <VolumeX size={17} /> Stop
              </button>
            )}
            <Link to="/" className="chat-action-btn">
              <ArrowLeft size={17} /> Home
            </Link>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages" id="chat-messages" role="log" aria-live="polite">
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {/* Suggestions (when only welcome message) */}
          {messages.length === 1 && (
            <div className="chat-suggestions">
              <p className="suggestions-label">Try asking:</p>
              <div className="suggestions-grid">
                {suggestions.map((s, i) => (
                  <button key={i} className="suggestion-chip" onClick={() => sendMessage(s)} id={`suggestion-${i}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <div className="chat-input-wrap">
            <textarea
              ref={inputRef}
              id="chat-input"
              className="chat-textarea"
              placeholder={lang === 'hi' ? 'कुछ भी पूछें...' : 'Ask anything about government schemes...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              aria-label="Type your message"
            />
            <div className="chat-input-actions">
              <button
                className={`chat-voice-btn ${listening ? 'listening' : ''}`}
                onClick={startVoice}
                id="chat-voice-btn"
                aria-label={listening ? 'Listening...' : 'Voice input'}
                disabled={loading}
              >
                {listening ? <MicOff size={17} /> : <Mic size={17} />}
                {listening && <span className="voice-ring" />}
              </button>
              <button
                className="chat-send-btn"
                onClick={() => sendMessage()}
                id="chat-send-btn"
                disabled={!input.trim() || loading}
                aria-label="Send message"
              >
                {loading ? <Loader2 size={18} className="spin" /> : <Send size={17} />}
              </button>
            </div>
          </div>
          <p className="chat-disclaimer">
            Saathi AI cites official sources. Always verify with official portals before taking action.
          </p>
        </div>
      </div>
    </div>
  );
}
