'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import JarvisVoiceChat from './JarvisVoiceChat';
import DMKManager from './DMKManager';
import BillingPanel from './BillingPanel';
import ConsultationManager from './ConsultationManager';
import NotificationHub from './NotificationHub';
import TextChat from './TextChat';
import IllnessCardGrid, { IllnessItem } from './IllnessCardGrid';

export default function Dashboard() {
  const { user, logout } = useAuth();
  
  // Dashboard states
  const [unreadMessages, setUnreadMessages] = useState(2);
  const [profileDetail, setProfileDetail] = useState<any>({
    dateOfBirth: '1990-05-15',
    gender: 'FEMALE',
    address: '123 Main St, Lagos, Nigeria'
  });

  // UI States
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Jarvis Voice chat triggers
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const [isSosCall, setIsSosCall] = useState(false);

  // Text chat state
  const [textChatOpen, setTextChatOpen] = useState(false);
  const [selectedIllness, setSelectedIllness] = useState<IllnessItem | null>(null);

  const openIllnessChat = (item: IllnessItem) => {
    setSelectedIllness(item);
    setTextChatOpen(true);
  };

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
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/assets/emergencyecho.png" alt="EmergencyEcho Logo" style={{ height: '32px', objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>Echo</span>
        </div>
        <div style={{ padding: '0.5rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Menu</div>
        
        <div className={`sidebar-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => {setActiveTab('overview'); setSidebarOpen(false);}}>
          <span>🏠</span> Overview
        </div>
        <div className={`sidebar-nav-item ${activeTab === 'consultations' ? 'active' : ''}`} onClick={() => {setActiveTab('consultations'); setSidebarOpen(false);}}>
          <span>🩺</span> Echo's
        </div>
        <div className={`sidebar-nav-item ${activeTab === 'records' ? 'active' : ''}`} onClick={() => {setActiveTab('records'); setSidebarOpen(false);}}>
          <span>📂</span> Digital Medical Kit
        </div>
        <div className={`sidebar-nav-item ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => {setActiveTab('wallet'); setSidebarOpen(false);}}>
          <span>💳</span> Wallet & Billing
        </div>
        <div className={`sidebar-nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => {setActiveTab('notifications'); setSidebarOpen(false);}}>
          <span>🔔</span> Notifications
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main">
        {/* Background Decorative Glows */}
        <div className="glow-orb glow-orb-primary" style={{ opacity: 0.15, top: '-50px' }} />
        <div className="glow-orb glow-orb-secondary" style={{ opacity: 0.15, bottom: '-50px' }} />

        {/* Header */}
        <header style={headerStyle} className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
            <h1 style={{ fontSize: 'clamp(0.95rem, 3vw, 1.2rem)', fontWeight: 700, margin: 0, padding: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'consultations' && 'Consultations'}
              {activeTab === 'records' && 'Medical Records'}
              {activeTab === 'wallet' && 'Wallet & Billing'}
              {activeTab === 'notifications' && 'Notifications'}
            </h1>
          </div>

          <div style={userPanelStyle}>
            <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', justifyContent: 'center' }} title="Toggle Theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div style={patientIDBadgeStyle} className="dash-header-id-badge">
              ID: {user?.id.slice(0, 8) || 'patient'}
            </div>
            <button onClick={logout} style={logoutBtnStyle}>
              Sign Out
            </button>
            <div style={avatarStyle}>
              <span>{user?.fullName?.slice(0, 2).toUpperCase() || 'ME'}</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ padding: 'clamp(0.75rem, 3vw, 1.5rem)', flex: 1, zIndex: 1, minWidth: 0 }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={gridStyle} className="mobile-stack">
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
                </div>

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
                </div>
              </div>

              {/* Illness Card Grid – AI Text Chat launcher */}
              <section className="glass-panel" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)' }}>
                <IllnessCardGrid onSelectIllness={openIllnessChat} />
              </section>
            </div>
          )}

          {activeTab === 'consultations' && (
            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <ConsultationManager />
            </div>
          )}

          {activeTab === 'records' && (
            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <DMKManager />
            </div>
          )}

          {activeTab === 'wallet' && (
            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <BillingPanel />
            </div>
          )}

          {activeTab === 'notifications' && (
            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <NotificationHub />
            </div>
          )}
        </main>
      </div>

      {/* Floating Jarvis voice chat overlay */}
      <JarvisVoiceChat 
        isOpen={voiceChatOpen} 
        onClose={() => setVoiceChatOpen(false)} 
        isSOSMode={isSosCall}
      />

      {/* Text Chat overlay – illness-specific AI chat */}
      {selectedIllness && (
        <TextChat
          isOpen={textChatOpen}
          onClose={() => setTextChatOpen(false)}
          illnessTag={selectedIllness.tag}
          illnessTitle={selectedIllness.title}
          illnessColor={selectedIllness.color}
          illnessIcon={selectedIllness.icon}
        />
      )}
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
  padding: '0.75rem 1.25rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  flexShrink: 0,
  gap: '0.5rem',
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
  gap: '0.5rem',
  flexShrink: 0,
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
  gridTemplateColumns: 'minmax(0,1fr) minmax(0,300px)',
  gap: '1.25rem',
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
  padding: 'clamp(1.1rem, 3vw, 1.75rem) clamp(1rem, 3vw, 2rem)',
  background: 'linear-gradient(135deg, rgba(15, 22, 38, 0.8) 0%, rgba(22, 32, 53, 0.4) 100%)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
};

const welcomeTitleStyle: React.CSSProperties = {
  fontSize: 'clamp(1.1rem, 3vw, 1.45rem)',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  lineHeight: 1.3,
};

const welcomeSubStyle: React.CSSProperties = {
  fontSize: '0.86rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.55',
};

const demoStatsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  flexWrap: 'wrap',
  borderTop: '1px solid rgba(255, 255, 255, 0.04)',
  paddingTop: '0.75rem',
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
