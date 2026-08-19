'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LobbyPage() {
  const { user, logout, loading, mockApproveUser } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  // Guard routing redirects
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.isVerified && user.isApproved) {
        router.push('/');
      }
    }
  }, [user, loading]);

  const handleCheckStatus = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      // Status remains pending unless simulated or updated on server
    }, 1200);
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

      {/* Top bar */}
      <div style={topBarStyle}>
        <span style={roleIndicatorStyle}>
          PORTAL: {user.role} ({user.fullName})
        </span>
        <button onClick={logout} style={logoutBtnStyle}>
          Sign Out
        </button>
      </div>

      <div style={cardStyle} className="glass-panel">
        
        {/* Animated Radar/Pulse Scanner */}
        <div style={pulseScannerContainerStyle}>
          <div style={radarCircle1Style} />
          <div style={radarCircle2Style} />
          <div style={scannerIconStyle}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>

        <div style={headerStyle}>
          <h3 style={titleStyle}>Verification Pending</h3>
          <p style={subtitleStyle}>
            Your credentials have been submitted. Our administrators are currently reviewing your medical registry credentials.
          </p>
        </div>

        {/* Status Card */}
        <div style={statusCardStyle}>
          <div style={statusLabelRowStyle}>
            <span style={statusLabelStyle}>REGISTRY STATUS</span>
            <span style={statusValueStyle}>PENDING REVIEW</span>
          </div>
          <p style={statusDescriptionStyle}>
            We are cross-referencing your medical license number with the official state registries. This typically takes 2–4 hours.
          </p>
        </div>

        {/* Action Controls */}
        <div style={btnRowStyle}>
          <button 
            onClick={handleCheckStatus} 
            disabled={checking} 
            style={btnSecondaryStyle}
          >
            {checking ? 'Querying registry...' : 'Check Status'}
          </button>
          
          <button 
            onClick={mockApproveUser} 
            style={btnPrimaryStyle}
          >
            Simulate Admin Approval
          </button>
        </div>

        <p style={supportTextStyle}>
          Need help? Contact our clinical operations desk at <code>ops@emergencyecho.com</code>
        </p>

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
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '460px',
  padding: '2.5rem',
  position: 'relative',
  zIndex: 2,
  textAlign: 'center',
  animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
};

const pulseScannerContainerStyle: React.CSSProperties = {
  width: '100px',
  height: '100px',
  margin: '0 auto 2rem auto',
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const radarCircle1Style: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  border: '2px solid var(--primary)',
  opacity: 0.15,
  animation: 'heartbeat 3s infinite ease-in-out',
};

const radarCircle2Style: React.CSSProperties = {
  position: 'absolute',
  width: '80%',
  height: '80%',
  borderRadius: '50%',
  border: '1.5px dashed var(--secondary)',
  opacity: 0.25,
  animation: 'heartbeat 3s infinite reverse ease-in-out',
};

const scannerIconStyle: React.CSSProperties = {
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  background: 'rgba(0, 245, 212, 0.08)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  border: '1.5px solid rgba(0, 245, 212, 0.25)',
  boxShadow: '0 0 20px rgba(0, 245, 212, 0.2)',
};

const headerStyle: React.CSSProperties = {
  marginBottom: '1.75rem',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.35rem',
  fontWeight: 700,
  marginBottom: '0.5rem',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.5',
};

const statusCardStyle: React.CSSProperties = {
  padding: '1.25rem',
  borderRadius: 'var(--border-radius-md)',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  marginBottom: '2rem',
  textAlign: 'left',
};

const statusLabelRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.5rem',
};

const statusLabelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.08em',
};

const statusValueStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  color: 'var(--secondary)',
  background: 'rgba(0, 187, 249, 0.08)',
  padding: '0.2rem 0.5rem',
  borderRadius: '4px',
  border: '1px solid rgba(0, 187, 249, 0.15)',
};

const statusDescriptionStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.45',
};

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  marginBottom: '1.5rem',
};

const btnPrimaryStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%)',
  color: '#080c14',
  border: 'none',
  fontWeight: 700,
  fontSize: '0.82rem',
  cursor: 'pointer',
  boxShadow: '0 4px 15px rgba(0, 245, 212, 0.15)',
};

const btnSecondaryStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'rgba(255, 255, 255, 0.04)',
  color: 'var(--text-primary)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  fontWeight: 600,
  fontSize: '0.82rem',
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const supportTextStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  color: 'var(--text-muted)',
  lineHeight: '1.4',
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
