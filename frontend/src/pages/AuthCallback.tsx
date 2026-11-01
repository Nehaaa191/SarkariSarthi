import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, type User } from '../context/AuthContext';
import { api } from '../lib/api';

/**
 * AuthCallback — handles the redirect from Google OAuth.
 *
 * After the user authorises with Google, the backend redirects here:
 *   /auth/callback?token=<opaque-handoff-token>
 *
 * This page POSTs the token to /auth/exchange-token (via the Vite proxy).
 * The backend validates it, sets the httpOnly refreshToken cookie, and returns
 * an accessToken + user. We store the accessToken in memory and navigate to
 * the dashboard.
 *
 * The one-time token expires in 60 seconds — if this page takes longer than
 * that to load, or the token is missing, we redirect to /signin?error=google_failed.
 */
export default function AuthCallback() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const executedRef = useRef(false);

  useEffect(() => {
    if (executedRef.current) return;
    executedRef.current = true;

    async function handleCallback() {
      try {
        // Extract the one-time handoff token from the URL query string
        const params = new URLSearchParams(location.search);
        const handoffToken = params.get('token');

        if (!handoffToken) {
          console.error('AuthCallback: no token param in URL');
          navigate('/signin?error=google_failed', { replace: true });
          return;
        }

        // Exchange the one-time token for a real accessToken + httpOnly cookie
        const res = await api.post<{ success: boolean; accessToken: string; user: User }>(
          '/auth/exchange-token',
          { token: handoffToken }
        );

        if (res?.accessToken && res?.user) {
          login(res.accessToken, res.user);
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/signin?error=google_failed', { replace: true });
        }
      } catch (err) {
        console.error('AuthCallback: exchange-token failed:', err);
        navigate('/signin?error=google_failed', { replace: true });
      }
    }

    handleCallback();
  }, [login, navigate, location.search]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '84px',
          height: '84px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid rgba(27, 32, 96, 0.12)',
            borderTopColor: 'var(--gold)',
            animation: 'spin-slow 1s linear infinite',
          }}
        />
        <span style={{ fontSize: '38px', lineHeight: 1 }}>🪄</span>
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--navy)',
          marginBottom: '8px',
        }}
      >
        Completing sign in...
      </h2>
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '14px',
          maxWidth: '340px',
        }}
      >
        Verifying your credentials and setting up your workspace session. Please wait a moment.
      </p>
    </div>
  );
}
