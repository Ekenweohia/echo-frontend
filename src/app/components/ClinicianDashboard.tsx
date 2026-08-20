'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import VideoRoom from './VideoRoom';
import WalletConsole from './WalletConsole';

interface QueueEntry {
  id: string;
  sessionId: string;
  patientId: string;
  intakeId: string;
  clinicianRole: 'DOCTOR' | 'NURSE';
  isSOS: boolean;
  priority: number;
  status: string;
  queuedAt: string;
  session: {
    id: string;
    latitude: number;
    longitude: number;
    triageResult?: {
      acuity: string;
      urgencyScore: number;
      decision: string;
      reasons: string;
    };
    clinicalIntake?: {
      chiefComplaint: string;
      clinicalSummary: string;
      symptoms: Array<{ code: string; name: string; present: boolean; severity: string }>;
    };
    patient: {
      fullName: string;
      patientProfile?: {
        dateOfBirth: string;
        gender: string;
      };
    };
  };
}

export default function ClinicianDashboard() {
  const { user, logout } = useAuth();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [activeConsultation, setActiveConsultation] = useState<any>(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [systemTime, setSystemTime] = useState(new Date());

  // Wallet balance (header chip)
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletCurrency, setWalletCurrency] = useState('NGN');

  // Theme states
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [customRoomId, setCustomRoomId] = useState('');

  // UI States
  const [activeTab, setActiveTab] = useState('queue');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Clinician is verified (submitted docs) but not yet admin-approved
  const isPending = (user?.role === 'DOCTOR' || user?.role === 'NURSE') && user?.isVerified && !user?.isApproved;

  const handleDirectJoin = () => {
    if (!customRoomId.trim()) return;
    setActiveConsultation({
      id: customRoomId.trim(),
      livekitRoomName: customRoomId.trim(),
      status: 'ACTIVE',
      startedAt: new Date().toISOString()
    });
    setIsVideoOpen(true);
  };

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
    // Poll clinical queue every 4 seconds
    fetchQueue();
    checkActiveConsultation();
    fetchWalletBalance();
    const interval = setInterval(fetchQueue, 4000);
    const clock = setInterval(() => setSystemTime(new Date()), 1000);
    // Refresh wallet balance every 30s
    const walletInterval = setInterval(fetchWalletBalance, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(clock);
      clearInterval(walletInterval);
    };
  }, []);

  const fetchWalletBalance = async () => {
    try {
      const res = await apiClient('/billing/wallet');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setWalletBalance(json.data.balance);
          setWalletCurrency(json.data.currency || 'NGN');
        }
      }
    } catch {
      // Offline — keep stale value or show nothing
    }
  };

  const fetchQueue = async () => {
    try {
      const response = await apiClient('/consultations/queue');
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setQueue(json.data);
        }
      }
    } catch (e) {
      console.warn('[Queue] Offline. Generating high-fidelity mock queue entries.');
      generateMockQueue();
    }
  };

  const checkActiveConsultation = async () => {
    try {
      const response = await apiClient('/consultations/live');
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setActiveConsultation(json.data);
        }
      }
    } catch (e) {
      // Offline fallback
    }
  };

  const generateMockQueue = () => {
    // Generate simulated clinical queue data for previewing when API is down
    const minutesAgo = (mins: number) => new Date(Date.now() - mins * 60000).toISOString();
    
    const mockData: QueueEntry[] = [
      {
        id: 'mock-q-1',
        sessionId: 'sess-001',
        patientId: 'patient-jane',
        intakeId: 'int-001',
        clinicianRole: 'DOCTOR',
        isSOS: true,
        priority: 100,
        status: 'WAITING',
        queuedAt: minutesAgo(1), // 1 min ago
        session: {
          id: 'sess-001',
          latitude: 6.5244,
          longitude: 3.3792,
          triageResult: {
            acuity: 'CRITICAL',
            urgencyScore: 92,
            decision: 'Route to Emergency Dispatch',
            reasons: 'Patient reports sharp central chest pain spreading to left shoulder.'
          },
          clinicalIntake: {
            chiefComplaint: 'Severe Chest Pain',
            clinicalSummary: 'Intake AI flagged suspected cardiovascular anomaly. Urgent video screening requested.',
            symptoms: [{ code: 'chest_pain', name: 'Chest Pain', present: true, severity: 'severe' }]
          },
          patient: {
            fullName: 'Jane Doe',
            patientProfile: { dateOfBirth: '1992-04-12T00:00:00.000Z', gender: 'FEMALE' }
          }
        }
      },
      {
        id: 'mock-q-2',
        sessionId: 'sess-002',
        patientId: 'patient-mark',
        intakeId: 'int-002',
        clinicianRole: 'DOCTOR',
        isSOS: false,
        priority: 10,
        status: 'WAITING',
        queuedAt: minutesAgo(1.5), // 1.5 mins ago (Should trigger priority window lock for Nurses)
        session: {
          id: 'sess-002',
          latitude: 6.4281,
          longitude: 3.4219,
          triageResult: {
            acuity: 'MODERATE',
            urgencyScore: 45,
            decision: 'Route to General Practice',
            reasons: 'Patient reports high fever (39°C) and continuous joint stiffness.'
          },
          clinicalIntake: {
            chiefComplaint: 'High Fever & Joint Stiffness',
            clinicalSummary: 'Symptoms present for 3 days. No critical respiratory distress flagged.',
            symptoms: [{ code: 'fever', name: 'Fever', present: true, severity: 'moderate' }]
          },
          patient: {
            fullName: 'Mark Benson',
            patientProfile: { dateOfBirth: '1985-09-22T00:00:00.000Z', gender: 'MALE' }
          }
        }
      },
      {
        id: 'mock-q-3',
        sessionId: 'sess-003',
        patientId: 'patient-clara',
        intakeId: 'int-003',
        clinicianRole: 'NURSE',
        isSOS: false,
        priority: 5,
        status: 'WAITING',
        queuedAt: minutesAgo(5), // 5 mins ago (Available to everyone)
        session: {
          id: 'sess-003',
          latitude: 6.4422,
          longitude: 3.4811,
          triageResult: {
            acuity: 'STABLE',
            urgencyScore: 20,
            decision: 'Route to Nursing Consult',
            reasons: 'Minor allergic rash on lower arm. Patient requested general diagnostic review.'
          },
          clinicalIntake: {
            chiefComplaint: 'Localized Rash',
            clinicalSummary: 'Mild pruritus. No anaphylactic symptoms. Stable condition.',
            symptoms: [{ code: 'skin_rash', name: 'Skin Rash', present: true, severity: 'mild' }]
          },
          patient: {
            fullName: 'Clara Oswald',
            patientProfile: { dateOfBirth: '1995-11-05T00:00:00.000Z', gender: 'FEMALE' }
          }
        }
      }
    ];

    setQueue(mockData);
  };

  const claimCase = async (queueEntryId: string) => {
    setErrorMessage(null);
    try {
      const response = await apiClient('/consultations/queue/accept', {
        method: 'POST',
        body: JSON.stringify({ queueEntryId })
      });

      const json = await response.json();
      if (response.ok && json.success) {
        setActiveConsultation(json.data);
        setIsVideoOpen(true);
        fetchQueue();
      } else {
        setErrorMessage(json.message || 'Failed to claim case.');
      }
    } catch (e) {
      console.warn('[Queue] Offline mode: Instantly claiming case locally.');
      // Offline local claiming mockup
      const selected = queue.find(q => q.id === queueEntryId);
      if (selected) {
        const mockConsultation = {
          id: `con-${Math.random().toString(36).substring(4)}`,
          queueEntryId: selected.id,
          patientId: selected.patientId,
          primaryClinicianId: user?.id || 'mock-doc',
          livekitRoomName: `room-${selected.id}`,
          status: 'ACTIVE',
          startedAt: new Date().toISOString()
        };
        setActiveConsultation(mockConsultation);
        setIsVideoOpen(true);
      }
    }
  };

  // Helper to calculate seconds remaining in the 2-minute priority window for nurses/admins
  const getPriorityWindowStatus = (queuedAtStr: string, isSOS: boolean) => {
    if (isSOS) return { isLocked: false, remaining: 0 }; // SOS bypasses lock
    if (user?.role === 'DOCTOR') return { isLocked: false, remaining: 0 }; // Doctors never locked
    
    const queuedAt = new Date(queuedAtStr);
    const differenceInSeconds = Math.floor((systemTime.getTime() - queuedAt.getTime()) / 1000);
    const remaining = 120 - differenceInSeconds; // 2 minutes window
    
    return {
      isLocked: remaining > 0,
      remaining: Math.max(0, remaining)
    };
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
        <div style={{ padding: '0.5rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clinician Menu</div>
        
        <div className={`sidebar-nav-item ${activeTab === 'queue' ? 'active' : ''}`} onClick={() => {setActiveTab('queue'); setSidebarOpen(false);}}>
          <span>📋</span> Active Queue
        </div>
        <div className={`sidebar-nav-item ${activeTab === 'workspace' ? 'active' : ''}`} onClick={() => {setActiveTab('workspace'); setSidebarOpen(false);}}>
          <span>💻</span> Workspace
        </div>
        <div className={`sidebar-nav-item ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => {setActiveTab('wallet'); setSidebarOpen(false);}}>
          <span>💳</span> Wallet & Payouts
        </div>
        <div className={`sidebar-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => {setActiveTab('settings'); setSidebarOpen(false);}}>
          <span>⚙️</span> Settings
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main">
        {/* Background Decorative Glows */}
        <div className="glow-orb glow-orb-secondary" style={{ opacity: 0.1, top: '-50px' }} />

        {/* Header */}
        <header style={headerStyle} className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, padding: 0 }}>
              {activeTab === 'queue' && 'Patient Intake Queue'}
              {activeTab === 'workspace' && 'Clinician Workspace'}
              {activeTab === 'wallet' && 'Wallet & Payouts'}
              {activeTab === 'settings' && 'Profile & Settings'}
            </h1>
          </div>

          <div style={userPanelStyle}>
            <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', marginRight: '0.75rem', display: 'flex', alignItems: 'center' }} title="Toggle Theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {/* Wallet Balance Chip */}
            {walletBalance !== null && (
              <button
                onClick={() => { setActiveTab('wallet'); setSidebarOpen(false); }}
                style={walletChipStyle}
                title="View Wallet & Payouts"
              >
                <span style={{ fontSize: '0.72rem' }}>💳</span>
                <span>{walletCurrency === 'NGN' ? '₦' : '$'}{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </button>
            )}
            <div style={clinicianBadgeStyle}>
              {user?.fullName} ({user?.role})
            </div>
            {isPending && (
              <div style={pendingHeaderBadgeStyle}>
                <span style={{ fontSize: '0.6rem' }}>⏳</span> PENDING REVIEW
              </div>
            )}
            <button onClick={logout} style={logoutBtnStyle}>
              Sign Out
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ padding: '1.5rem', flex: 1, zIndex: 1 }}>
          
          {activeTab === 'queue' && (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <section style={queueSectionStyle}>
                <div style={sectionHeaderStyle}>
                  <h2 style={sectionTitleStyle}>Patient Intake Clinical Queue</h2>
                  <p style={sectionSubStyle}>Select a pending session to accept and begin a video consultation.</p>
                </div>


                {errorMessage && (
                  <div style={errorBannerStyle}>
                    <span>⚠️ {errorMessage}</span>
                    <button onClick={() => setErrorMessage(null)} style={closeErrorBtn}>✕</button>
                  </div>
                )}

                <div style={listContainerStyle}>
                  {queue.length === 0 ? (
                    <div style={emptyQueueStyle}>
                      <p>No patients are currently in queue. Standing by...</p>
                    </div>
                  ) : (
                    queue.map((entry) => {
                      const windowStatus = getPriorityWindowStatus(entry.queuedAt, entry.isSOS);
                      return (
                        <div 
                          key={entry.id} 
                          style={queueCardStyle(entry.isSOS, windowStatus.isLocked)} 
                          className="glass-panel-interactive"
                        >
                          {/* Urgency Badge */}
                          <div style={cardHeaderStyle}>
                            <div style={badgeRowStyle}>
                              {entry.isSOS && <span style={sosBadgeStyle}>EMERGENCY SOS</span>}
                              <span style={acuityBadgeStyle(entry.session.triageResult?.acuity)}>
                                {entry.session.triageResult?.acuity || 'UNKNOWN'} (Score: {entry.session.triageResult?.urgencyScore || 0})
                              </span>
                            </div>
                            <span style={timeStyle}>
                              Queued: {new Date(entry.queuedAt).toLocaleTimeString()}
                            </span>
                          </div>

                          {/* Patient Context Summary */}
                          <div style={patientMetaRowStyle}>
                            <span style={patientNameStyle}>{entry.session.patient.fullName}</span>
                            <span style={patientProfileDetailStyle}>
                              {entry.session.patient.patientProfile?.gender || 'N/A'} • {
                                entry.session.patient.patientProfile?.dateOfBirth 
                                  ? `${new Date().getFullYear() - new Date(entry.session.patient.patientProfile.dateOfBirth).getFullYear()} yrs`
                                  : 'N/A'
                              }
                            </span>
                          </div>

                          <div style={complaintBlockStyle}>
                            <strong style={labelStyle}>Chief Complaint:</strong>
                            <p style={complaintTextStyle}>{entry.session.clinicalIntake?.chiefComplaint || 'Not Specified'}</p>
                          </div>

                          <div style={reasonsBlockStyle}>
                            <strong style={labelStyle}>Echo Triage Decision:</strong>
                            <p style={reasonsTextStyle}>{entry.session.triageResult?.reasons || 'No summary available.'}</p>
                          </div>

                          {/* Claim Control Button */}
                          <div style={{ ...btnRowStyle, justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                              Room ID: <strong style={{ color: 'var(--primary)' }}>{entry.session.id}</strong>
                            </span>
                            {windowStatus.isLocked ? (
                              <div style={lockedBannerStyle}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <span>Locked for {windowStatus.remaining}s (Doctor priority)</span>
                              </div>
                            ) : (
                              <button 
                                onClick={() => claimCase(entry.id)} 
                                style={claimBtnStyle(entry.isSOS)}
                              >
                                Claim Case & Start Video
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'workspace' && (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <section style={workspacePanelStyle} className="glass-panel">
                <h3 style={panelTitleStyle}>Clinician Workspace</h3>
                {activeConsultation ? (
                  <div style={activeConsoleStyle}>
                    <div style={activeBadgeStyle}>ACTIVE CONSULTATION RUNNING</div>
                    <p style={activeMetaTextStyle}>Room: {activeConsultation.livekitRoomName}</p>
                    <button 
                      onClick={() => setIsVideoOpen(true)} 
                      style={rejoinBtnStyle}
                    >
                      Open Video Consultation Room
                    </button>
                  </div>
                ) : (
                  <div style={emptyConsoleStyle}>
                    <div style={radarIconStyle}>🛰️</div>
                    <p style={emptyConsoleTextStyle}>No active consultation room running. Standing by for incoming clinical triage intakes.</p>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h2 style={sectionTitleStyle}>Wallet & Payouts</h2>
                <p style={sectionSubStyle}>View your earnings balance, add a bank account, and request a withdrawal.</p>
              </div>
              <WalletConsole />
            </div>
          )}

          {activeTab === 'settings' && (
             <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
               Settings configuration not yet available in this build.
             </div>
          )}

        </main>
      </div>

      {/* Fullscreen Video Call Room */}
      {isVideoOpen && activeConsultation && (
        <VideoRoom 
          consultationId={activeConsultation.id} 
          onClose={() => {
            setIsVideoOpen(false);
            checkActiveConsultation();
          }}
        />
      )}

      {/* Pending Verification Overlay */}
      {isPending && (
        <div style={pendingOverlayStyle}>
          <div style={pendingCardStyle}>
            {/* Animated lock icon */}
            <div style={pendingIconWrapStyle}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--secondary)' }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
            </div>

            {/* Status pill */}
            <div style={pendingStatusPillStyle}>
              <span style={pendingDotStyle} />
              AWAITING ADMIN VERIFICATION
            </div>

            <h2 style={pendingTitleStyle}>Account Pending Review</h2>
            <p style={pendingBodyStyle}>
              Your credentials have been submitted and are currently under review by the Echo administrative team.
              Once your account is approved, you'll have full access to the clinical queue and all platform features.
            </p>

            {/* Info grid */}
            <div style={pendingInfoGridStyle}>
              <div style={pendingInfoBoxStyle}>
                <span style={pendingInfoLabelStyle}>NAME</span>
                <span style={pendingInfoValStyle}>{user?.fullName}</span>
              </div>
              <div style={pendingInfoBoxStyle}>
                <span style={pendingInfoLabelStyle}>ROLE</span>
                <span style={pendingInfoValStyle}>{user?.role}</span>
              </div>
              <div style={pendingInfoBoxStyle}>
                <span style={pendingInfoLabelStyle}>DOCS SUBMITTED</span>
                <span style={{ ...pendingInfoValStyle, color: 'var(--primary)', fontSize: '0.88rem' }}>✓ Yes</span>
              </div>
              <div style={pendingInfoBoxStyle}>
                <span style={pendingInfoLabelStyle}>STATUS</span>
                <span style={{ ...pendingInfoValStyle, color: '#f59e0b' }}>Under Review</span>
              </div>
            </div>

            <p style={pendingHintStyle}>
              Typical review time is 24–48 hours. You will receive an email notification once approved.
            </p>

            <button onClick={logout} style={pendingSignOutBtnStyle}>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const containerStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '100vh',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
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
  gap: '1.25rem',
};

const clinicianBadgeStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  padding: '0.4rem 0.8rem',
  borderRadius: '4px',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-primary)',
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

const walletChipStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.38rem 0.85rem',
  borderRadius: '999px',
  background: 'rgba(0, 245, 212, 0.07)',
  border: '1px solid rgba(0, 245, 212, 0.22)',
  color: 'var(--primary)',
  fontSize: '0.76rem',
  fontWeight: 700,
  cursor: 'pointer',
  letterSpacing: '0.01em',
  transition: 'background 0.2s',
  whiteSpace: 'nowrap',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 340px',
  gap: '1.5rem',
  width: '100%',
  alignItems: 'start',
};

const queueSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '1.2rem',
  fontWeight: 700,
  letterSpacing: '-0.01em',
};

const sectionSubStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
};

const errorBannerStyle: React.CSSProperties = {
  padding: '0.85rem 1.25rem',
  backgroundColor: 'rgba(255, 90, 95, 0.1)',
  border: '1px solid rgba(255, 90, 95, 0.2)',
  borderRadius: 'var(--border-radius-sm)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  color: '#ff5a5f',
  fontSize: '0.8rem',
  fontWeight: 600,
  animation: 'fadeIn 0.2s ease-out',
};

const closeErrorBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#ff5a5f',
  cursor: 'pointer',
  fontSize: '0.85rem',
};

const listContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const emptyQueueStyle: React.CSSProperties = {
  padding: '3rem',
  textAlign: 'center',
  background: 'rgba(255, 255, 255, 0.01)',
  border: '1px dashed rgba(255, 255, 255, 0.05)',
  borderRadius: 'var(--border-radius-md)',
  color: 'var(--text-muted)',
  fontSize: '0.85rem',
};

const queueCardStyle = (isSOS: boolean, isLocked: boolean): React.CSSProperties => ({
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
  border: isSOS 
    ? '1px solid rgba(255, 90, 95, 0.3)' 
    : '1px solid rgba(255, 255, 255, 0.05)',
  background: isSOS 
    ? 'linear-gradient(135deg, rgba(255, 90, 95, 0.05) 0%, rgba(15, 22, 38, 0.8) 100%)'
    : 'rgba(15, 22, 38, 0.6)',
  opacity: isLocked ? 0.65 : 1,
  transition: 'opacity 0.2s ease',
  borderRadius: 'var(--border-radius-md)',
});

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const badgeRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
};

const sosBadgeStyle: React.CSSProperties = {
  fontSize: '0.64rem',
  fontWeight: 800,
  backgroundColor: '#ff5a5f',
  color: '#080c14',
  padding: '0.25rem 0.5rem',
  borderRadius: '3px',
  letterSpacing: '0.04em',
  animation: 'pulseGlow 2s infinite ease-in-out',
};

const acuityBadgeStyle = (acuity?: string): React.CSSProperties => {
  let color = 'var(--text-primary)';
  let bg = 'rgba(255, 255, 255, 0.05)';
  
  if (acuity === 'CRITICAL') {
    color = '#ff5a5f';
    bg = 'rgba(255, 90, 95, 0.12)';
  } else if (acuity === 'MODERATE') {
    color = 'var(--secondary)';
    bg = 'rgba(0, 187, 249, 0.12)';
  } else if (acuity === 'STABLE') {
    color = 'var(--primary)';
    bg = 'rgba(0, 245, 212, 0.12)';
  }

  return {
    fontSize: '0.64rem',
    fontWeight: 800,
    color,
    backgroundColor: bg,
    padding: '0.25rem 0.5rem',
    borderRadius: '3px',
    letterSpacing: '0.04em',
    border: `0.5px solid ${color}40`,
  };
};

const timeStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text-muted)',
};

const patientMetaRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '0.5rem',
};

const patientNameStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
};

const patientProfileDetailStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--text-secondary)',
};

const complaintBlockStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  color: 'var(--text-muted)',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
};

const complaintTextStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  color: 'var(--text-primary)',
  fontWeight: 600,
};

const reasonsBlockStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem',
  background: 'rgba(255, 255, 255, 0.02)',
  padding: '0.65rem 0.85rem',
  borderRadius: '4px',
  borderLeft: '2px solid rgba(255, 255, 255, 0.1)',
};

const reasonsTextStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.45',
};

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  marginTop: '0.25rem',
};

const claimBtnStyle = (isSOS: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '0.65rem',
  borderRadius: '4px',
  background: isSOS ? '#ff5a5f' : 'var(--primary)',
  border: 'none',
  color: '#080c14',
  fontWeight: 700,
  fontSize: '0.78rem',
  cursor: 'pointer',
  transition: 'transform 0.1s ease',
  boxShadow: isSOS ? '0 4px 12px rgba(255, 90, 95, 0.2)' : 'none',
});

const lockedBannerStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.65rem',
  borderRadius: '4px',
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  color: 'var(--text-muted)',
  fontSize: '0.74rem',
  fontWeight: 600,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '0.4rem',
};

const workspacePanelStyle: React.CSSProperties = {
  padding: '1.25rem',
  minHeight: '300px',
  display: 'flex',
  flexDirection: 'column',
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: '0.84rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  paddingBottom: '0.5rem',
  marginBottom: '1rem',
};

const activeConsoleStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
};

const activeBadgeStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  fontWeight: 800,
  backgroundColor: 'rgba(0, 245, 212, 0.1)',
  color: 'var(--primary)',
  border: '1px solid rgba(0, 245, 212, 0.3)',
  padding: '0.3rem 0.65rem',
  borderRadius: '4px',
  letterSpacing: '0.04em',
  animation: 'pulseGlow 2.5s infinite ease-in-out',
};

const activeMetaTextStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  color: 'var(--text-muted)',
};

const rejoinBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  background: 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)',
  border: 'none',
  borderRadius: '4px',
  color: '#080c14',
  fontWeight: 700,
  fontSize: '0.8rem',
  cursor: 'pointer',
};

const emptyConsoleStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  textAlign: 'center',
  padding: '0 1rem',
};

const radarIconStyle: React.CSSProperties = {
  fontSize: '2rem',
  animation: 'float 6s infinite ease-in-out',
};

const emptyConsoleTextStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: 'var(--text-muted)',
  lineHeight: '1.55',
};

// --- Pending Verification Overlay Styles ---

const pendingHeaderBadgeStyle: React.CSSProperties = {
  fontSize: '0.62rem',
  fontWeight: 800,
  padding: '0.3rem 0.65rem',
  borderRadius: '4px',
  background: 'rgba(245, 158, 11, 0.12)',
  border: '1px solid rgba(245, 158, 11, 0.3)',
  color: '#f59e0b',
  letterSpacing: '0.05em',
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
};

const pendingOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 99999,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '1.5rem',
  backgroundColor: 'rgba(5, 7, 12, 0.82)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

const pendingCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '480px',
  padding: '2.5rem 2rem',
  borderRadius: '20px',
  background: 'rgba(15, 22, 38, 0.9)',
  border: '1px solid rgba(0, 187, 249, 0.15)',
  boxShadow: '0 0 60px rgba(0, 187, 249, 0.08), 0 30px 80px rgba(0,0,0,0.5)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1.25rem',
  textAlign: 'center',
  animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
};

const pendingIconWrapStyle: React.CSSProperties = {
  width: '72px',
  height: '72px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(0, 187, 249, 0.12) 0%, transparent 70%)',
  border: '1px solid rgba(0, 187, 249, 0.2)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  animation: 'pulseGlow 3s infinite ease-in-out',
};

const pendingStatusPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.64rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  color: '#f59e0b',
  background: 'rgba(245, 158, 11, 0.1)',
  border: '1px solid rgba(245, 158, 11, 0.25)',
  padding: '0.35rem 0.85rem',
  borderRadius: '999px',
};

const pendingDotStyle: React.CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: '#f59e0b',
  animation: 'pulseGlow 1.5s infinite ease-in-out',
  display: 'inline-block',
  flexShrink: 0,
};

const pendingTitleStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: 'var(--text-primary)',
  margin: 0,
};

const pendingBodyStyle: React.CSSProperties = {
  fontSize: '0.84rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.65',
  maxWidth: '380px',
  margin: '0 auto',
};

const pendingInfoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.75rem',
  width: '100%',
  marginTop: '0.25rem',
};

const pendingInfoBoxStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '10px',
  padding: '0.85rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  textAlign: 'left',
};

const pendingInfoLabelStyle: React.CSSProperties = {
  fontSize: '0.58rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
};

const pendingInfoValStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const pendingHintStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--text-muted)',
  lineHeight: '1.55',
  maxWidth: '340px',
};

const pendingSignOutBtnStyle: React.CSSProperties = {
  marginTop: '0.5rem',
  padding: '0.75rem 2rem',
  borderRadius: '8px',
  background: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: 'var(--text-secondary)',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
};
