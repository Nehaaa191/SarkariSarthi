import React, { useState, useRef, KeyboardEvent } from 'react';
import { Search, Mic, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/context';
import './AskSaathi.css';

export default function AskSaathi() {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (q: string) => {
    const text = q.trim();
    if (!text) return;
    navigate('/chat', { state: { initialQuery: text } });
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit(query);
  };

  const startVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser. Please use Chrome.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'hi-IN';
    rec.interimResults = true;
    setListening(true);
    rec.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
      setQuery(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  return (
    <section className="ask-section" id="ask-saathi" aria-label="Ask Saathi">
      <div className="ask-container">
        <span className="section-label">{t.ask.label}</span>
        <h2 className="ask-heading">{t.ask.heading}</h2>
        <p className="ask-sub">{t.ask.sub}</p>

        <div className="ask-bar-wrapper">
          <div className="ask-bar">
            <Search size={18} className="ask-search-icon" />
            <input
              ref={inputRef}
              id="ask-input"
              type="text"
              className="ask-input"
              placeholder={t.ask.placeholder}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              aria-label="Ask a question about government schemes"
            />
            <button
              className={`ask-mic-btn ${listening ? 'listening' : ''}`}
              onClick={startVoice}
              aria-label={listening ? 'Listening...' : 'Start voice input'}
              id="ask-mic-btn"
            >
              <Mic size={17} />
              {listening && <span className="ask-mic-ring" />}
            </button>
          </div>
          <button
            className="ask-submit-btn"
            onClick={() => submit(query)}
            id="ask-submit-btn"
            aria-label="Ask Saathi"
          >
            {t.ask.btn}
            <ArrowRight size={17} />
          </button>
        </div>

        <div className="ask-chips">
          <span className="ask-chips-label">{t.ask.tryLabel}</span>
          {t.ask.chips.map((chip, i) => (
            <button
              key={i}
              className="ask-chip"
              onClick={() => { setQuery(chip); submit(chip); }}
              id={`ask-chip-${i}`}
              aria-label={`Try asking: ${chip}`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
