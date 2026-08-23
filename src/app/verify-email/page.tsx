'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';
  const sentParam = searchParams.get('sent') === 'true';

  const [token, setToken] = useState(tokenParam);
  const [email, setEmail] = useState(emailParam);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-verify if token is present in the URL parameter on mount
  useEffect(() => {
    if (tokenParam) {
      autoVerifyToken(tokenParam);
    }
  }, [tokenParam]);

  const autoVerifyToken = async (verifyToken: string) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const response = await fetch('http://localhost:4000/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyToken.trim() }),
      });

      const json = await response.json();
      if (response.ok && json.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setErrorMessage(json.message || 'Auto-verification failed. Please check the code.');
      }
    } catch (err) {
      setErrorMessage('Network connection to server failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }
    await autoVerifyToken(token.trim());
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email to resend verification.');
      return;
    }

    setIsResending(true);
    setErrorMessage('');
    setResendSuccess(false);

    try {
      const response = await fetch('http://localhost:4000/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const json = await response.json();
      if (response.ok && json.success) {
        setResendSuccess(true);
      } else {
        setErrorMessage(json.message || 'Failed to resend verification email.');
      }
    } catch (err) {
      setErrorMessage('Network connection to server failed.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div className="glow-orb glow-orb-primary" />
      <div className="glow-orb glow-orb-secondary" />

      <div style={cardStyle} className="glass-panel">

        {/* Logo Section */}
        <div style={{ ...logoWrapperStyle, gap: '0.6rem' }}>
          <img src="/assets/emergencyecho.png" alt="EmergencyEcho Logo" style={{ height: '32px', objectFit: 'contain' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>EmergencyEcho</h2>
        </div>

        <div style={headerSectionStyle}>
          <h3 style={titleStyle}>Email Verification</h3>
          <p style={subtitleStyle}>Enter the verification code sent to your registered inbox</p>
        </div>

        {/* Verification Sent Alert */}
        {(sentParam || resendSuccess) && (
          <div style={sentAlertStyle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '0.1rem' }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span>
              We have sent a verification code to your email. Please check your inbox and click the link to verify your account.
            </span>
          </div>
        )}

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

        {/* Success Alert */}
        {success ? (
          <div style={successAlertStyle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginBottom: '0.5rem' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>Email Verified Successfully</h4>
            <p style={{ fontSize: '0.74rem', opacity: 0.8, lineHeight: '1.4' }}>
              Redirecting you to the login screen...
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <form onSubmit={handleSubmit} style={formStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Verification Token</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={btnStyle(isSubmitting)}
              >
                {isSubmitting ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

            <form onSubmit={handleResend} style={formStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Resend Verification Code</label>
                <input
                  type="email"
                  placeholder="Registered email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isResending}
                style={{ ...btnStyle(isResending), background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', boxShadow: 'none' }}
              >
                {isResending ? 'Resending...' : 'Resend Code'}
              </button>
            </form>

            {resendSuccess && (
              <div style={resendSuccessAlertStyle}>
                <span>📨 Verification email resent successfully! Check your inbox.</span>
              </div>
            )}
          </div>
        )}

        <div style={footerStyle}>
          Already verified?{' '}
          <Link href="/login" style={linkStyle}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={loadingContainerStyle}><div style={spinnerStyle} /></div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}

// Visual layout configuration constants
const containerStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-base)',
  minHeight: '100vh',
  width: '100vw',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '2rem 1rem',
  position: 'relative',
  overflow: 'hidden',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '430px',
  padding: '2.5rem 2.25rem',
  borderRadius: 'var(--border-radius-lg)',
  position: 'relative',
  zIndex: 10,
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
};

const logoWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '1.75rem',
};

const headerSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '1.75rem',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  fontWeight: 800,
  color: 'var(--text-primary)',
  marginBottom: '0.45rem',
  letterSpacing: '-0.02em',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.45',
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

const sentAlertStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.65rem',
  padding: '0.85rem 1.15rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'rgba(0, 245, 212, 0.04)',
  border: '1px solid rgba(0, 245, 212, 0.15)',
  color: 'var(--primary)',
  fontSize: '0.78rem',
  marginBottom: '1.5rem',
  lineHeight: '1.45',
};

const successAlertStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  padding: '1.5rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'rgba(0, 245, 212, 0.05)',
  border: '1px solid rgba(0, 245, 212, 0.15)',
  color: 'var(--primary)',
  marginBottom: '1.25rem',
};

const resendSuccessAlertStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'rgba(0, 245, 212, 0.05)',
  border: '1px solid rgba(0, 245, 212, 0.1)',
  color: 'var(--primary)',
  fontSize: '0.76rem',
  textAlign: 'center',
  lineHeight: '1.4',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  outline: 'none',
  textAlign: 'center',
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

const loadingContainerStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-base)',
  minHeight: '100vh',
  width: '100vw',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const spinnerStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  border: '2px solid rgba(0, 245, 212, 0.1)',
  borderTopColor: 'var(--primary)',
  animation: 'heartbeat 1.5s infinite ease-in-out',
};
