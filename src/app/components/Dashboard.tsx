'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import JarvisVoiceChat from './JarvisVoiceChat';
import DMKManager from './DMKManager';
import WalletConsole from './WalletConsole';
import ConsultationManager from './ConsultationManager';
import NotificationHub from './NotificationHub';

export default function Dashboard() {
  const { user, logout } = useAuth();
  
  // Dashboard states
  const [unreadMessages, setUnreadMessages] = useState(2);
  const [profileDetail, setProfileDetail] = useState<any>({
    dateOfBirth: '1990-05-15',
    gender: 'FEMALE',
    address: '123 Main St, Lagos, Nigeria'
  });

  // Jarvis Voice chat triggers
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const [isSosCall, setIsSosCall] = useState(false);

  // Theme states
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  useEffect(() => {
    fetchDashboardDetails();
  }, []);

  // API 2.1: Get Patient Dashboard
  const fetchDashboardDetails = async () => {
    try {
      const response = await apiClient('/patients/dashboard');
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setUnreadMessages(json.data.unreadMessages || 0);
          setProfileDetail(json.data.profile);
        }
      }
    } catch (e) {
      console.warn('[Dashboard] Offline. Using cached mock details.');
    }
  };

  const triggerVoiceChat = (sos: boolean) => {
    setIsSosCall(sos);
    setVoiceChatOpen(true);
  };

  return (
    <div style={dashboardContainerStyle}>
      {/* Background Decorative Glows */}
      <div className="glow-orb glow-orb-primary" style={{ opacity: 0.15, top: '-50px' }} />
      <div className="glow-orb glow-orb-secondary" style={{ opacity: 0.15, bottom: '-50px' }} />

      {/* Main App Navigation Bar */}
      <header style={headerStyle} className="glass-panel">
        <div style={logoSectionStyle}>
          <img src="/assets/emergencyecho.png" alt="EmergencyEcho Logo" style={{ height: '36px', objectFit: 'contain' }} />
        </div>

        <div style={userPanelStyle}>
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', marginRight: '0.75rem', display: 'flex', alignItems: 'center' }} title="Toggle Theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div style={patientIDBadgeStyle}>
            ID: {user?.id.slice(0, 8) || 'patient'}
          </div>
          <button onClick={logout} style={logoutBtnStyle}>
            Sign Out
          </button>
          <div style={avatarStyle}>
            <span>JD</span>
          </div>
        </div>
      </header>

      {/* Dashboard Grid Space */}
      <main style={gridStyle}>
        
        {/* LEFT COLUMN: Consultations, Vitals, DMK */}
        <div style={mainColumnStyle}>
          
          {/* Welcome Banner */}
          <section style={welcomeBannerStyle} className="glass-panel">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <h2 style={welcomeTitleStyle}>Welcome back, {user?.fullName || 'Patient'}</h2>
              <p style={welcomeSubStyle}>
                Your digital medical workspace is online. You have {unreadMessages} unread updates and active medical logs syncing.
              </p>
            </div>
            {profileDetail && (
              <div style={demoStatsRowStyle}>
                <span style={statItemStyle}>DOB: {profileDetail.dateOfBirth}</span>
                <span style={statItemStyle}>Gender: {profileDetail.gender}</span>
                <span style={statItemStyle}>Address: {profileDetail.address?.split(',')[0]}</span>
              </div>
            )}
          </section>

          {/* Vitals Metrics omitted - Not measured in portal */}

          {/* DMK Manager Widget */}
          <DMKManager />

          {/* Consultation Manager Widget */}
          <ConsultationManager />

        </div>

        {/* RIGHT COLUMN: Voice triggers, Notifications, Wallet */}
        <div style={sideColumnStyle}>
          
          {/* Futuristic Voice AI Control center */}
          <section style={voiceControlCardStyle} className="glass-panel">
            <h3 style={voiceTitleStyle}>Voice Intake Center</h3>
            <p style={voiceDescStyle}>Access instant voice diagnostics. Powered by Vapi Echo AI. Or deploy the emergency SOS alert.</p>
            
            <div style={voiceTriggerRowStyle}>
              {/* Emergency SOS Button */}
              <button 
                onClick={() => triggerVoiceChat(true)} 
                style={sosBtnStyle}
              >
                <div style={sosIconWrapperStyle}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <span style={sosLabelStyle}>EMERGENCY SOS</span>
                  <span style={sosSubStyle}>Trace location & call</span>
                </div>
              </button>

              {/* Echo AI Consultation */}
              <button 
                onClick={() => triggerVoiceChat(false)} 
                style={aiTriggerBtnStyle}
                className="glass-panel-interactive"
              >
                <div style={aiIconStyle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                  </svg>
                </div>
                <div>
                  <span style={aiTriggerLabelStyle}>TALK TO ECHO</span>
                  <span style={aiTriggerSubStyle}>Clinical Voice Intake</span>
                </div>
              </button>
            </div>
          </section>

          {/* Notifications Hub Widget */}
          <NotificationHub />

          {/* Wallet Console Widget */}
          <WalletConsole />

        </div>

      </main>

      {/* Floating Jarvis voice chat overlay */}
      <JarvisVoiceChat 
        isOpen={voiceChatOpen} 
        onClose={() => setVoiceChatOpen(false)} 
        isSOSMode={isSosCall}
      />
    </div>
  );
}

// Styles
const dashboardContainerStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '100vh',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  animation: 'fadeIn 1s ease-out',
  position: 'relative',
};

const headerStyle: React.CSSProperties = {
  width: '100%',
  padding: '1rem 1.5rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'relative',
  zIndex: 10,
};

const logoSectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
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
  fontSize: '1.1rem',
  fontWeight: 800,
  letterSpacing: '0.05em',
};

const logoSubStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  color: 'var(--text-secondary)',
  marginTop: '-2px',
};

const userPanelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
};

const patientIDBadgeStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  padding: '0.3rem 0.65rem',
  borderRadius: '4px',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-secondary)',
  letterSpacing: '0.02em',
};

const logoutBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '0.78rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'color 0.2s',
};

const avatarStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#080c14',
  border: '1.5px solid rgba(255, 255, 255, 0.15)',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 340px',
  gap: '1.5rem',
  width: '100%',
  alignItems: 'start',
};

const mainColumnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const sideColumnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const welcomeBannerStyle: React.CSSProperties = {
  padding: '1.75rem 2rem',
  background: 'linear-gradient(135deg, rgba(15, 22, 38, 0.8) 0%, rgba(22, 32, 53, 0.4) 100%)',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const welcomeTitleStyle: React.CSSProperties = {
  fontSize: '1.45rem',
  fontWeight: 700,
  letterSpacing: '-0.02em',
};

const welcomeSubStyle: React.CSSProperties = {
  fontSize: '0.86rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.55',
};

const demoStatsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1.25rem',
  flexWrap: 'wrap',
  borderTop: '1px solid rgba(255, 255, 255, 0.04)',
  paddingTop: '0.85rem',
};

const statItemStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  letterSpacing: '0.01em',
};

const vitalsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '1rem',
};

const vitalCardStyle: React.CSSProperties = {
  padding: '1.15rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  borderRadius: 'var(--border-radius-md)',
};

const vitalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const vitalLabelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.08em',
};

const vitalIconStyle = (color: string): React.CSSProperties => ({
  fontSize: '1rem',
  color: color,
});

const vitalValueWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '0.2rem',
  margin: '0.2rem 0',
};

const vitalValueStyle: React.CSSProperties = {
  fontSize: '1.75rem',
  fontWeight: 700,
};

const vitalUnitStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: 'var(--text-secondary)',
};

const vitalStatusStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  color: 'var(--primary)',
  fontWeight: 600,
};

const voiceControlCardStyle: React.CSSProperties = {
  padding: '1.5rem',
};

const voiceTitleStyle: React.CSSProperties = {
  fontSize: '0.88rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  color: 'var(--text-primary)',
  marginBottom: '0.4rem',
};

const voiceDescStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.45',
  marginBottom: '1.25rem',
};

const voiceTriggerRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const voiceBtnBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.85rem 1.25rem',
  borderRadius: 'var(--border-radius-md)',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'transform 0.2s, box-shadow 0.2s',
};

const sosBtnStyle: React.CSSProperties = {
  ...voiceBtnBase,
  background: '#ff5a5f',
  color: '#080c14',
  boxShadow: '0 4px 15px rgba(255, 90, 95, 0.25)',
  animation: 'pulseGlow 4s infinite ease-in-out', // Red pulse glow fallback is handled or can use CSS keyframes
};

const sosIconWrapperStyle: React.CSSProperties = {
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  background: 'rgba(8, 12, 20, 0.12)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  animation: 'heartbeat 1.5s infinite ease-in-out',
};

const sosLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 800,
  letterSpacing: '0.05em',
};

const sosSubStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.64rem',
  opacity: 0.85,
  fontWeight: 500,
  marginTop: '2px',
};

const aiTriggerBtnStyle: React.CSSProperties = {
  ...voiceBtnBase,
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  color: 'var(--text-primary)',
};

const aiIconStyle: React.CSSProperties = {
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  background: 'rgba(0, 245, 212, 0.06)',
  border: '1px solid rgba(0, 245, 212, 0.15)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: 'var(--primary)',
};

const aiTriggerLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: 'var(--text-primary)',
};

const aiTriggerSubStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.64rem',
  color: 'var(--text-muted)',
  fontWeight: 500,
  marginTop: '2px',
};
