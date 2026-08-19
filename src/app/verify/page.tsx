'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function VerifyPortal() {
  const { user, submitVerification, logout, loading } = useAuth();
  const router = useRouter();

  const [licenseNumber, setLicenseNumber] = useState('');
  const [institution, setInstitution] = useState('');
  const [boardType, setBoardType] = useState('State Medical Board');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect if they aren't authorized to be here
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseNumber || !institution) return;

    setIsSubmitting(true);
    try {
      await submitVerification(licenseNumber, institution);
      setSuccess(true);
      setTimeout(() => {
        router.push('/lobby');
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div style={loadingContainerStyle}>
        <div style={spinnerStyle} />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div className="glow-orb glow-orb-primary" />
      <div className="glow-orb glow-orb-secondary" />

      {/* Top bar with Logout */}
      <div style={topBarStyle}>
        <span style={roleIndicatorStyle}>
          PORTAL: {user.role} ({user.fullName})
        </span>
        <button onClick={logout} style={logoutBtnStyle}>
          Sign Out
        </button>
      </div>

      <div style={cardStyle} className="glass-panel">
        <div style={{ ...logoWrapperStyle, gap: '0.6rem' }}>
          <img src="/assets/emergencyecho.png" alt="EmergencyEcho Logo" style={{ height: '32px', objectFit: 'contain' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>EmergencyEcho</h2>
        </div>

        <div style={headerStyle}>
          <h3 style={titleStyle}>Medical Verification</h3>
          <p style={subtitleStyle}>
            To access the clinical dashboard as a {user.role === 'DOCTOR' ? 'Doctor' : 'Nurse'}, please verify your active professional licensing status.
          </p>
        </div>

        {success ? (
          <div style={successMessageStyle}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginBottom: '0.5rem' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h4 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.2rem' }}>Credentials Submitted</h4>
            <p style={{ fontSize: '0.78rem', opacity: 0.8 }}>Redirecting you to the verification lobby...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={formStyle}>
            
            <div style={formGroupStyle}>
              <label style={labelStyle}>Medical License Number</label>
              <input
                type="text"
                placeholder="MD-98234-A"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Certifying Board / Authority</label>
              <select
                value={boardType}
                onChange={(e) => setBoardType(e.target.value)}
                style={selectStyle}
              >
                <option value="State Medical Board">State Medical Board</option>
                <option value="Board of Registered Nursing">Board of Registered Nursing</option>
                <option value="National Medical Association">National Medical Association</option>
                <option value="International Medical Council">International Medical Council</option>
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Primary Affiliated Institution</label>
              <input
                type="text"
                placeholder="e.g. St. Jude General Hospital"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            {/* Mock Drag & Drop Upload */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Digital License Copy (PDF, JPG)</label>
              <div style={uploadBoxStyle}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" style={{ marginBottom: '0.5rem' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)' }}>Click or Drag files to upload</span>
                <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Supporting files up to 10MB</span>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              style={btnStyle(isSubmitting)}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Credentials for Review'}
            </button>
          </form>
        )}
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
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '3rem 1.5rem',
  position: 'relative',
  overflow: 'hidden',
};

const topBarStyle: React.CSSProperties = {
  position: 'absolute',
  top: '1.5rem',
  left: '2rem',
  right: '2rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  zIndex: 10,
};

const roleIndicatorStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: 'var(--secondary)',
};

const logoutBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  fontSize: '0.78rem',
  fontWeight: 600,
  cursor: 'pointer',
  padding: '0.35rem 0.75rem',
  borderRadius: '4px',
  transition: 'color 0.2s',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '480px',
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
  marginBottom: '1.5rem',
};

const logoIconStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '6px',
  background: 'rgba(0, 245, 212, 0.08)',
  border: '1px solid rgba(0, 245, 212, 0.2)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const logoTextStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 800,
  letterSpacing: '0.05em',
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '1.75rem',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 700,
  marginBottom: '0.4rem',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.45',
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'rgba(15, 22, 38, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  outline: 'none',
};

const uploadBoxStyle: React.CSSProperties = {
  width: '100%',
  padding: '1.5rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'rgba(0, 0, 0, 0.15)',
  border: '1px dashed rgba(0, 245, 212, 0.2)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  cursor: 'pointer',
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
  boxShadow: disabled ? 'none' : '0 4px 15px rgba(0, 245, 212, 0.2)',
});

const successMessageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  textAlign: 'center',
  color: 'var(--primary)',
  animation: 'fadeIn 0.5s ease-out',
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
