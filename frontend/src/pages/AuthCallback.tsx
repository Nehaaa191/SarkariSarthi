import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type User } from '../context/AuthContext';
import { api } from '../lib/api';

export default function AuthCallback() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const executedRef = useRef(false);

  useEffect(() => {
    if (executedRef.current) return;
    executedRef.current = true;

    async function handleCallback() {
      try {
        const res = await api.post<{ success: boolean; accessToken: string; user: User }>('/auth/refresh');
        if (res && res.accessToken && res.user) {
          login(res.accessToken, res.user);
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/signin?error=google_failed', { replace: true });
        }
      } catch (err) {
        console.error('Google OAuth callback verification failed:', err);
        navigate('/signin?error=google_failed', { replace: true });
      }
    }

    handleCallback();
  }, [login, navigate]);

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
