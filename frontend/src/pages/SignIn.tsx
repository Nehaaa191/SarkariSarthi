import {
  useState,
  useRef,
  useEffect,
  type FormEvent,
  type ChangeEvent,
  type KeyboardEvent,
  type ClipboardEvent,
} from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth, type User } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { api } from '../lib/api';
import './SignIn.css';

type AuthScreen = 'identify' | 'otp';

function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex > 1) {
    return `${email[0]}***${email.slice(atIndex)}`;
  }
  return email;
}

export default function SignIn() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const [screen, setScreen] = useState<AuthScreen>('identify');
  const [email, setEmail] = useState('');
  const [currentIdentifier, setCurrentIdentifier] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Show error if Google OAuth failed
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('error') === 'google_failed') {
      setError('Google sign-in was unsuccessful. Please try again or use email OTP.');
    }
  }, [location.search]);

  // Countdown timer on OTP screen
  useEffect(() => {
    if (screen !== 'otp' || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [screen, countdown]);

  // Focus first OTP input when entering OTP screen
  useEffect(() => {
    if (screen === 'otp') {
      const timer = setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  const handleGoogleSignIn = () => {
    // In dev: Vite proxies /auth → localhost:3001
    // In production: VITE_API_BASE points to the deployed backend URL
    const base = import.meta.env.VITE_API_BASE ?? '';
    window.location.href = `${base}/auth/google`;
  };

  const handleIdentifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await api.post<{ success: boolean; message: string; type: string }>(
        '/auth/send-otp',
        { identifier: cleanEmail }
      );
      setCurrentIdentifier(cleanEmail);
      setOtp(['', '', '', '', '', '']);
      setCountdown(60);
      setScreen('otp');
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const updated = [...otp];
    updated[index] = digit;
    setOtp(updated);
    setError(null);
    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        otpInputsRef.current[index - 1]?.focus();
        const updated = [...otp];
        updated[index - 1] = '';
        setOtp(updated);
      } else {
        const updated = [...otp];
        updated[index] = '';
        setOtp(updated);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const updated = [...otp];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setOtp(updated);
    setError(null);
    otpInputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.post<{
        success: boolean;
        accessToken: string;
        user: User;
      }>('/auth/verify-otp', {
        identifier: currentIdentifier,
        otp: code,
      });

      if (res?.accessToken && res?.user) {
        login(res.accessToken, res.user);
        const redirectPath = (location.state as any)?.from || '/dashboard';
        navigate(redirectPath, { replace: true });
      } else {
        setError(t.auth.errorOtp);
      }
    } catch (err: any) {
      setError(err?.message || t.auth.errorOtp);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/send-otp', { identifier: currentIdentifier });
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setScreen('identify');
    setError(null);
    setOtp(['', '', '', '', '', '']);
  };

  const isOtpComplete = otp.every((d) => d.length === 1);

  return (
    <div className="signin-page">
      {/* ===== LEFT BRAND PANEL ===== */}
      <div className="signin-left">
        <div className="signin-decor-shape decor-circle-1" />
        <div className="signin-decor-shape decor-circle-2" />
        <div className="signin-decor-shape decor-circle-3" />

        <div className="signin-left-content">
          <Link to="/" className="signin-brand" aria-label="SarkariSaathi Home">
            <div className="signin-logo-badge">🪄</div>
            <span className="signin-brand-text">
              <span className="signin-brand-dark">Sarkari</span>
              <span className="signin-brand-gold">Saathi</span>
            </span>
          </Link>

          <div className="signin-left-hero">
            <h1 className="signin-left-tagline">
              Government Schemes, <span>Made Simple</span> for Everyone.
            </h1>
            <p className="signin-left-desc">
              Your AI-powered civic companion to discover official benefits, evaluate eligibility,
              and apply with confidence.
            </p>

            <div className="signin-trust-pills">
              <div className="signin-trust-pill"><span>✅</span> Source-backed</div>
              <div className="signin-trust-pill"><span>🌐</span> Bilingual</div>
              <div className="signin-trust-pill"><span>🛡</span> Private</div>
            </div>
          </div>

          <div className="signin-left-footer">
            © 2025 Sarkari Saathi · Citizen-first public service intelligence
          </div>
        </div>
      </div>

      {/* ===== RIGHT FORM PANEL ===== */}
      <div className="signin-right">
        {/* Mobile Header */}
        <div className="signin-mobile-header">
          <Link to="/" className="signin-brand">
            <div className="signin-logo-badge" style={{ width: 36, height: 36, fontSize: 18 }}>🪄</div>
            <span className="signin-brand-text" style={{ fontSize: 20 }}>
              <span style={{ color: 'var(--navy)' }}>Sarkari</span>
              <span style={{ color: 'var(--gold-dark)' }}>Saathi</span>
            </span>
          </Link>
        </div>

        <div className="signin-card-wrapper">
          <div className="signin-card">
            {screen === 'identify' ? (
              <div className="auth-screen slide-enter" key="screen-identify">
                <div className="auth-header">
                  <h2 className="auth-title">{t.auth.welcome}</h2>
                  <p className="auth-subtitle">{t.auth.sub}</p>
                </div>

                {/* Google Sign-In */}
                <button
                  type="button"
                  className="btn-google"
                  onClick={handleGoogleSignIn}
                  id="auth-google-btn"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{t.auth.googleBtn}</span>
                </button>

                <div className="auth-divider">
                  <span>{t.auth.orDivider}</span>
                </div>

                {/* Email OTP form */}
                <p className="auth-method-label">Or continue with email</p>
                <form onSubmit={handleIdentifySubmit}>
                  <div className="auth-input-group">
                    <input
                      type="email"
                      className="auth-input"
                      placeholder={t.auth.emailPlaceholder}
                      value={email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      autoFocus
                      id="auth-email-input"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-auth-submit"
                    disabled={loading || !email.trim()}
                    id="auth-continue-btn"
                  >
                    {loading ? <div className="btn-spinner" /> : t.auth.continueBtn}
                  </button>
                </form>

                {error && (
                  <div className="auth-error-banner" role="alert">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <p className="auth-privacy-note">{t.auth.privacyNote}</p>
              </div>
            ) : (
              <div className="auth-screen slide-enter" key="screen-otp">
                <div className="auth-header-with-back">
                  <button
                    type="button"
                    className="btn-back"
                    onClick={handleBack}
                    aria-label={t.auth.backBtn}
                    title={t.auth.backBtn}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h2 className="auth-title">Verify your email</h2>
                    <p className="auth-subtitle">
                      {t.auth.verifySub}{' '}
                      <span className="auth-identifier-pill">
                        {maskEmail(currentIdentifier)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* OTP inputs */}
                <form onSubmit={handleVerifySubmit}>
                  <div className="otp-inputs-grid" onPaste={handleOtpPaste}>
                    {otp.map((val, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputsRef.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        className={`otp-box ${val ? 'filled' : ''}`}
                        value={val}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        autoComplete="one-time-code"
                        id={`auth-otp-${idx}`}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="btn-auth-submit"
                    disabled={!isOtpComplete || loading}
                    id="auth-verify-btn"
                  >
                    {loading ? <div className="btn-spinner" /> : t.auth.verifyBtn}
                  </button>
                </form>

                <div className="otp-resend-wrap">
                  {countdown > 0 ? (
                    <span>
                      {t.auth.resendIn} 0:{countdown < 10 ? `0${countdown}` : countdown}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-resend-otp"
                      onClick={handleResend}
                      disabled={loading}
                    >
                      {t.auth.resendBtn}
                    </button>
                  )}
                </div>

                {error && (
                  <div className="auth-error-banner" role="alert">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
