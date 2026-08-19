'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMessage('Please enter both your email/username and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await login(identifier, password);
      if (!res.success) {
        if (res.error === 'Please verify your email address before logging in') {
          try {
            await fetch('https://api.novacoresbank.com/api/v1/auth/resend-verification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: identifier.includes('@') ? identifier.trim().toLowerCase() : '' }),
            });
          } catch (e) {
            console.warn('Silent verification resend failed.');
          }
          router.push(`/verify-email?email=${encodeURIComponent(identifier)}&sent=true`);
        } else {
          setErrorMessage(res.error || 'Invalid credentials. Please try again.');
        }
      }
    } catch (err) {
      setErrorMessage('A network error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={containerStyle}>
      {/* Background ambient orbs */}
      <div className="glow-orb glow-orb-primary" />
      <div className="glow-orb glow-orb-secondary" />

      <div style={cardStyle} className="glass-panel">

        {/* Logo Section */}
        <div style={{ ...logoWrapperStyle, gap: '0.6rem' }}>
          <img src="/assets/emergencyecho.png" alt="EmergencyEcho Logo" style={{ height: '32px', objectFit: 'contain' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>EmergencyEcho</h2>
        </div>

        <div style={headerSectionStyle}>
          <h3 style={titleStyle}>Welcome Back</h3>
          <p style={subtitleStyle}>Enter your details to access your healthcare portal</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={errorAlertStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={formStyle}>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Email or Username</label>
            <input
              type="text"
              placeholder="e.g. johndoe@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={formGroupStyle}>
            <div style={passwordLabelRowStyle}>
              <label style={labelStyle}>Password</label>
              <Link href="/forgot-password" style={forgotLinkStyle}>
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={btnStyle(isSubmitting)}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={footerStyle}>
          Don't have an account?{' '}
          <Link href="/register" style={linkStyle}>
            Create an account
          </Link>
        </div>

      </div>
    </div>
  );
}

// Styles
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  width: '100vw',
  backgroundColor: 'var(--bg-base)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '1.5rem',
  position: 'relative',
  overflow: 'hidden',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  padding: '2.5rem',
  position: 'relative',
  zIndex: 2,
  animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
};

const logoWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  marginBottom: '2rem',
};

const logoIconStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  background: 'rgba(0, 245, 212, 0.08)',
  border: '1px solid rgba(0, 245, 212, 0.2)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const logoTextStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 800,
  letterSpacing: '0.05em',
};

const headerSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '1.5rem',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  fontWeight: 700,
  marginBottom: '0.4rem',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.4',
};

const errorAlertStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'rgba(255, 90, 95, 0.1)',
  border: '1px solid rgba(255, 90, 95, 0.2)',
  color: '#ff5a5f',
  fontSize: '0.78rem',
  marginBottom: '1.25rem',
  lineHeight: '1.4',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const formGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.45rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  letterSpacing: '0.05em',
};

const passwordLabelRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const forgotLinkStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--secondary)',
  fontWeight: 600,
};

const btnStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '0.8rem',
  borderRadius: 'var(--border-radius-sm)',
  background: disabled ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%)',
  color: disabled ? 'var(--text-muted)' : '#080c14',
  border: 'none',
  fontWeight: 700,
  fontSize: '0.88rem',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s',
  marginTop: '0.5rem',
  boxShadow: disabled ? 'none' : '0 4px 15px rgba(0, 245, 212, 0.2)',
});

const footerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '1.75rem',
  fontSize: '0.82rem',
  color: 'var(--text-secondary)',
};

const linkStyle: React.CSSProperties = {
  color: 'var(--primary)',
  fontWeight: 600,
};
