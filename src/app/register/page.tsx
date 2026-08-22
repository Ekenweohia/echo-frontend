'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from '../components/AuthSplit.module.css';

type RoleType = 'PATIENT' | 'DOCTOR' | 'NURSE' | 'PARTNER';

export default function RegisterPage() {
  const { register, login } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleType>('PATIENT'); // Patient is default as specified
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('auth-theme') as 'light' | 'dark' | null;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('auth-theme', nextTheme);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !phone || !email || !password || !role) {
      setErrorMessage('Please fill in all the required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const regRes = await register({
        fullName,
        username,
        phone,
        email,
        password,
        role
      });

      if (regRes.success) {
        // Silent login to fetch token & route dynamically
        const logRes = await login(email, password);
        if (!logRes.success) {
          router.push('/login');
        }
      } else {
        setErrorMessage(regRes.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setErrorMessage('A network error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${styles.page} ${theme === 'dark' ? styles.dark : ''}`}>
      <aside className={styles.brandPane}>
        <div className={styles.brand}><img src="/assets/emergencyecho.png" alt="" /><span>EmergencyEcho</span></div>
        <div className={styles.message}><h1>Care that starts with you.</h1><p>Create your secure profile, choose your role, and be ready for the moments that matter.</p><ul><li>Secure medical information</li><li>Verified clinician network</li><li>Care for patients and professionals</li></ul></div>
        <p className={styles.copyright}>© 2026 EmergencyEcho · A Yenak Technology product</p>
      </aside>
      <div className={styles.formPane}>
        <Link className={styles.homeLink} href="/">&lt; Back to home</Link>
        <button className={styles.themeButton} onClick={toggleTheme} type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
          {theme === 'light' ? <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z" /></svg> : <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>}
        </button>
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
          <h3 style={titleStyle}>Create Account</h3>
          <p style={subtitleStyle}>Register your profile and choose your portal role</p>
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
          
          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Username</label>
              <input
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                placeholder="+1 555 0100"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                placeholder="johndoe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          {/* Role Selection Tabs */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>Select Portal Role</label>
            <div style={tabsContainerStyle}>
              {(['PATIENT', 'DOCTOR', 'NURSE', 'PARTNER'] as RoleType[]).map((tabRole) => (
                <button
                  key={tabRole}
                  type="button"
                  onClick={() => setRole(tabRole)}
                  style={tabButtonStyle(role === tabRole)}
                >
                  {tabRole}
                </button>
              ))}
            </div>
            <p style={roleHelpTextStyle}>
              {role === 'PATIENT' && '✓ Instant Access. Routes you directly to your health metrics dashboard.'}
              {role === 'DOCTOR' && '⚠ Requires verification. You will be asked to upload credentials before activation.'}
              {role === 'NURSE' && '⚠ Requires verification. You will be asked to upload credentials before activation.'}
              {role === 'PARTNER' && '✓ Instant Access. Routes you directly to your partner client workspace.'}
            </p>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting} 
            style={btnStyle(isSubmitting)}
          >
            {isSubmitting ? 'Registering...' : 'Create Account'}
          </button>
        </form>

        <div style={footerStyle}>
          Already have an account?{' '}
          <Link href="/login" style={linkStyle}>
            Sign in
          </Link>
        </div>

      </div>
        </div>
      </div>
    </div>
  );
}

// Styles
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  width: '100%',
  backgroundColor: 'transparent',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '2rem 1.5rem',
  position: 'relative',
  overflowX: 'hidden',
  overflowY: 'auto',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '520px',
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

const formRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
};

const formGroupStyle: React.CSSProperties = {
  flex: '1 1 200px',
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
  background: 'rgba(255, 255, 255, 0.96)',
  border: '1px solid #dfe3ea',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const tabsContainerStyle: React.CSSProperties = {
  display: 'flex',
  background: 'rgba(0, 0, 0, 0.2)',
  borderRadius: 'var(--border-radius-sm)',
  padding: '3px',
  border: '1px solid rgba(255, 255, 255, 0.06)',
};

const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '0.6rem 0',
  borderRadius: '6px',
  border: 'none',
  background: isActive ? 'var(--primary-glow)' : 'transparent',
  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
  fontWeight: isActive ? 700 : 500,
  fontSize: '0.74rem',
  letterSpacing: '0.05em',
  cursor: 'pointer',
  transition: 'all 0.2s',
  boxShadow: isActive ? 'inset 0 0 10px rgba(0, 245, 212, 0.05)' : 'none',
  borderBottom: isActive ? '1.5px solid var(--primary)' : 'none',
});

const roleHelpTextStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text-muted)',
  lineHeight: '1.4',
  marginTop: '0.2rem',
  minHeight: '1.5em',
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
  marginTop: '1.5rem',
  fontSize: '0.82rem',
  color: 'var(--text-secondary)',
};

const linkStyle: React.CSSProperties = {
  color: 'var(--primary)',
  fontWeight: 600,
};
