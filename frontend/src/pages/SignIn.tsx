import {
  useState,
  useEffect,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth, type User } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { api } from '../lib/api';
import './SignIn.css';

type AuthMode = 'login' | 'register';

export default function SignIn() {
  const { login, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode state: 'login' or 'register'
  const [mode, setMode] = useState<AuthMode>('login');

  // Form input states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect immediately to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = (location.state as any)?.from || '/dashboard';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  // Handle Form Submission (Sign In or Register)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'login') {
      if (!password) {
        setError('Please enter your password.');
        return;
      }
      setLoading(true);
      try {
        const res = await api.post<{
          success: boolean;
          accessToken: string;
          user: User;
        }>('/auth/login', {
          email: cleanEmail,
          password,
        });

        if (res?.accessToken && res?.user) {
          login(res.accessToken, res.user);
          const redirectPath = (location.state as any)?.from || '/dashboard';
          navigate(redirectPath, { replace: true });
        } else {
          setError('Invalid credentials.');
        }
      } catch (err: any) {
        setError(err?.message || 'Sign in failed. Please check your credentials.');
      } finally {
        setLoading(false);
      }
    } else {
      // Register mode
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }
      setLoading(true);
      try {
        const res = await api.post<{
          success: boolean;
          accessToken: string;
          user: User;
        }>('/auth/signup', {
          name: name.trim(),
          email: cleanEmail,
          password,
        });

        if (res?.accessToken && res?.user) {
          login(res.accessToken, res.user);
          const redirectPath = (location.state as any)?.from || '/dashboard';
          navigate(redirectPath, { replace: true });
        } else {
          setError('Could not create account.');
        }
      } catch (err: any) {
        setError(err?.message || 'Registration failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

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
              <div className="signin-trust-pill"><span>🛡</span> Secure & Private</div>
            </div>
          </div>

          <div className="signin-left-footer">
            © 2026 Sarkari Saathi · Citizen-first public service intelligence
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
            <div className="auth-screen slide-enter">
              <div className="auth-header">
                <h2 className="auth-title">
                  {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
                </h2>
                <p className="auth-subtitle">
                  {mode === 'login'
                    ? 'Sign in to access your civic workspace and saved schemes'
                    : 'Register in seconds to start checking eligibility & benefits'}
                </p>
              </div>

              {/* Mode Selection Tabs (Sign In / Register) */}
              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => { setMode('login'); setError(null); }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
                  onClick={() => { setMode('register'); setError(null); }}
                >
                  Register
                </button>
              </div>

              {/* Primary Form */}
              <form onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <div className="auth-input-group">
                    <div className="password-input-wrapper">
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="Full Name (optional)"
                        value={name}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                        id="auth-name-input"
                      />
                    </div>
                  </div>
                )}

                <div className="auth-input-group">
                  <div className="password-input-wrapper">
                    <input
                      type="email"
                      className="auth-input"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      autoFocus
                      required
                      id="auth-email-input"
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="Password (min. 6 characters)"
                      value={password}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      required
                      id="auth-password-input"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="auth-input-group">
                    <div className="password-input-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="auth-input"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setConfirmPassword(e.target.value);
                          setError(null);
                        }}
                        required
                        id="auth-confirm-password-input"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-auth-submit"
                  disabled={loading || !email.trim() || !password.trim()}
                  id="auth-submit-btn"
                >
                  {loading ? (
                    <div className="btn-spinner" />
                  ) : mode === 'login' ? (
                    'Sign In'
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              {/* Secondary Navigation Switch */}
              <div className="auth-alt-switch">
                {mode === 'login' ? (
                  <span>
                    Don't have an account?
                    <button type="button" onClick={() => { setMode('register'); setError(null); }}>
                      Register here
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?
                    <button type="button" onClick={() => { setMode('login'); setError(null); }}>
                      Sign In
                    </button>
                  </span>
                )}
              </div>

              {error && (
                <div className="auth-error-banner" role="alert">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <p className="auth-privacy-note">{t.auth.privacyNote}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
