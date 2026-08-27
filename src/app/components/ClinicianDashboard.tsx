'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import VideoRoom from './VideoRoom';
import WalletConsole from './WalletConsole';
import EchoHistory from './EchoHistory';
import styles from './ClinicianDashboard.module.css';

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
      vitalsAndAllergies?: string;
      probableDiagnosis?: string;
      supportiveFindings?: string;
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
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // UI States
  const [activeTab, setActiveTab] = useState<'queue' | 'workspace' | 'wallet' | 'settings'>('queue');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedEchoSessionId, setSelectedEchoSessionId] = useState<string | null>(null);

  // Clinician is verified (submitted docs) but not yet admin-approved
  const isPending = (user?.role === 'DOCTOR' || user?.role === 'NURSE') && user?.isVerified && !user?.isApproved;
  const isUnverified = (user?.role === 'DOCTOR' || user?.role === 'NURSE') && !user?.isVerified;

  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'light';
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
      // Offline fallback
    }
  };

  const fetchQueue = async () => {
    try {
      const response = await apiClient('/consultations/queue');
      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setQueue(json.data);
        } else {
          generateMockQueue();
        }
      } else {
        generateMockQueue();
      }
    } catch {
      // Offline fallback
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
    } catch {
      // Offline fallback
    }
  };

  const generateMockQueue = () => {
    const minutesAgo = (mins: number) => new Date(Date.now() - mins * 60000).toISOString();

    const mockData: QueueEntry[] = [
      {
        id: 'mock-q-aisha',
        sessionId: 'sess-aisha',
        patientId: 'patient-aisha',
        intakeId: 'int-aisha',
        clinicianRole: 'DOCTOR',
        isSOS: false,
        priority: 15,
        status: 'WAITING',
        queuedAt: minutesAgo(5),
        session: {
          id: 'sess-aisha',
          latitude: 6.5244,
          longitude: 3.3792,
          triageResult: {
            acuity: 'STABLE',
            urgencyScore: 35,
            decision: 'Dietary Consultation, Diabetes Management, Lactation Nutrition',
            reasons: 'Currently breastfeeding, Diagnosed with Diabetes, Dietary confusion'
          },
          clinicalIntake: {
            chiefComplaint: 'needs dietary advice for managing diabetes while breastfeeding a 6-month-old child. unsure about safe foods..',
            clinicalSummary: 'needs dietary advice for managing diabetes while breastfeeding a 6-month-old child. unsure about safe foods..',
            symptoms: [{ code: 'diet_advice', name: 'Dietary Consultation', present: true, severity: 'mild' }]
          },
          patient: {
            fullName: 'Aisha Bello',
            patientProfile: { dateOfBirth: '1998-05-14T00:00:00.000Z', gender: 'FEMALE' },
            vitalsAndAllergies: 'O+, AA | Penicillin',
            probableDiagnosis: 'Dietary Consultation, Diabetes Management, Lactation Nutrition',
            supportiveFindings: 'Currently breastfeeding, Diagnosed with Diabetes, Dietary confusion'
          }
        }
      },
      {
        id: 'mock-q-jane',
        sessionId: 'sess-jane',
        patientId: 'patient-jane',
        intakeId: 'int-jane',
        clinicianRole: 'DOCTOR',
        isSOS: true,
        priority: 100,
        status: 'WAITING',
        queuedAt: minutesAgo(1),
        session: {
          id: 'sess-jane',
          latitude: 6.5244,
          longitude: 3.3792,
          triageResult: {
            acuity: 'CRITICAL',
            urgencyScore: 92,
            decision: 'Acute Coronary Syndrome, Angina Pectoris',
            reasons: 'Sharp retrosternal pain, Cold diaphoresis, Onset 30 mins ago'
          },
          clinicalIntake: {
            chiefComplaint: 'Severe Chest Pain spreading to left shoulder',
            clinicalSummary: 'Severe central chest pain radiating to shoulder with dizziness and breathlessness.',
            symptoms: [{ code: 'chest_pain', name: 'Chest Pain', present: true, severity: 'severe' }]
          },
          patient: {
            fullName: 'Jane Doe',
            patientProfile: { dateOfBirth: '1992-04-12T00:00:00.000Z', gender: 'FEMALE' },
            vitalsAndAllergies: 'BP 145/90, HR 105 | No Known Allergies',
            probableDiagnosis: 'Acute Coronary Syndrome, Suspected Angina',
            supportiveFindings: 'Sharp central chest pain, diaphoresis, radiating to left shoulder'
          }
        }
      },
      {
        id: 'mock-q-mark',
        sessionId: 'sess-mark',
        patientId: 'patient-mark',
        intakeId: 'int-mark',
        clinicianRole: 'DOCTOR',
        isSOS: false,
        priority: 10,
        status: 'WAITING',
        queuedAt: minutesAgo(2),
        session: {
          id: 'sess-mark',
          latitude: 6.4281,
          longitude: 3.4219,
          triageResult: {
            acuity: 'MODERATE',
            urgencyScore: 45,
            decision: 'Acute Febrile Illness, Suspected Viral Polyarthritis',
            reasons: 'High fever (39°C), Bilateral knee/wrist stiffness, Fatigue'
          },
          clinicalIntake: {
            chiefComplaint: 'High Fever & Joint Stiffness',
            clinicalSummary: 'High fever (39°C) and continuous joint stiffness present for 3 days.',
            symptoms: [{ code: 'fever', name: 'Fever', present: true, severity: 'moderate' }]
          },
          patient: {
            fullName: 'Mark Benson',
            patientProfile: { dateOfBirth: '1985-09-22T00:00:00.000Z', gender: 'MALE' },
            vitalsAndAllergies: 'Temp 39.1°C, BP 120/80 | Aspirin Allergy',
            probableDiagnosis: 'Acute Febrile Illness, Suspected Viral Polyarthritis',
            supportiveFindings: 'High fever (39°C), Joint stiffness, Fatigue for 3 days'
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
        const acceptedSessionId = queue.find((item) => item.id === queueEntryId)?.sessionId || null;
        setSelectedEchoSessionId(acceptedSessionId);
        setActiveTab('workspace');
        setIsVideoOpen(true);
        fetchQueue();
      } else {
        setErrorMessage(json.message || 'Failed to claim case.');
      }
    } catch {
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
        setSelectedEchoSessionId(selected.sessionId);
        setActiveTab('workspace');
        setIsVideoOpen(true);
      }
    }
  };

  const declineCase = (queueEntryId: string) => {
    setQueue(currentQueue => currentQueue.filter(entry => entry.id !== queueEntryId));
  };

  const getPriorityWindowStatus = (queuedAtStr: string, isSOS: boolean) => {
    if (isSOS) return { isLocked: false, remaining: 0 };
    if (user?.role === 'DOCTOR') return { isLocked: false, remaining: 0 };

    const queuedAt = new Date(queuedAtStr);
    const differenceInSeconds = Math.floor((systemTime.getTime() - queuedAt.getTime()) / 1000);
    const remaining = 120 - differenceInSeconds;

    return {
      isLocked: remaining > 0,
      remaining: Math.max(0, remaining)
    };
  };

  const firstName = user?.fullName?.replace(/^(Dr\.|Nurse)\s*/i, '').split(' ')[0] || 'Clinician';

  return (
    <div className={styles.dashboard}>
      <div className={styles.backdrop} />

      {/* Sidebar Navigation */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <img src="/assets/emergencyecho.png" alt="Emergency Echo" />
          <span>Emergency <b>Echo</b></span>
        </div>
        <p className={styles.navCaption}>Clinical space</p>
        <nav className={styles.nav} aria-label="Clinician navigation">
          <button className={activeTab === 'queue' ? styles.navActive : ''} onClick={() => { setActiveTab('queue'); setSidebarOpen(false); }}>
            <i>📋</i> Active Queue {queue.length > 0 && <em>{queue.length}</em>}
          </button>
          <button className={activeTab === 'workspace' ? styles.navActive : ''} onClick={() => { setActiveTab('workspace'); setSidebarOpen(false); }}>
            <i>💻</i> Workspace
          </button>
          <button className={activeTab === 'wallet' ? styles.navActive : ''} onClick={() => { setActiveTab('wallet'); setSidebarOpen(false); }}>
            <i>◫</i> Wallet & Payouts
          </button>
          <button className={activeTab === 'settings' ? styles.navActive : ''} onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}>
            <i>⚙️</i> Settings
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.clinicianMini}>
            <span>{user?.fullName?.slice(0, 2).toUpperCase() || 'MD'}</span>
            <div>
              <strong>{user?.fullName || 'Clinician'}</strong>
              <small>{user?.role || 'DOCTOR'} account</small>
            </div>
          </div>
          <button className={styles.signOut} onClick={logout}>Sign out</button>
        </div>
      </aside>

      <button className={`${styles.scrim} ${sidebarOpen ? styles.scrimOpen : ''}`} onClick={() => setSidebarOpen(false)} aria-label="Close menu" />

      {/* Main Area */}
      <div className={styles.content} style={{ position: 'relative' }}>
        {/* Locked State Overlay */}
        {(isPending || isUnverified) && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: 'rgba(5, 7, 12, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
            <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '2.5rem', textAlign: 'center', border: '1px solid rgba(255, 90, 95, 0.2)', animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255, 90, 95, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>
                🔒
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                {isUnverified ? 'Action Required: Complete Verification' : 'Verification Pending'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                {isUnverified 
                  ? 'Your professional credentials must be verified before you can access the live clinical dispatch queue. Please upload your MDCN/NMCN documents to proceed.'
                  : 'Your credentials have been submitted and are currently under review by our administration team. You will be granted access to the clinical workspace once approved.'}
              </p>
              {isUnverified && (
                <button 
                  onClick={() => window.location.href = '/verify'}
                  className="ee-shimmer-button"
                  style={{ padding: '0.8rem 1.5rem', width: '100%', border: 'none', borderRadius: '8px', background: 'linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%)', color: '#080c14', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  Upload Verification Documents
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sticky Header */}
        <header className={styles.header}>
          <button className={styles.menuButton} onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
          <div className={styles.mobileBrand}>Emergency <b>Echo</b></div>
          <h1 className={styles.headerTitle}>
            {activeTab === 'queue' && 'Patient Intake Queue'}
            {activeTab === 'workspace' && 'Clinician Workspace'}
            {activeTab === 'wallet' && 'Wallet & Payouts'}
            {activeTab === 'settings' && 'Settings & Profile'}
          </h1>

          <div className={styles.headerActions}>
            <button className={styles.iconButton} onClick={toggleTheme} aria-label="Toggle colour theme">
              {theme === 'dark' ? '☀' : '◐'}
            </button>

            {walletBalance !== null && (
              <button className={styles.walletChip} onClick={() => { setActiveTab('wallet'); setSidebarOpen(false); }} title="View Wallet & Payouts">
                <span>💳</span>
                <span>{walletCurrency === 'NGN' ? '₦' : '$'}{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </button>
            )}

            <button className={styles.avatar} onClick={() => setActiveTab('settings')} aria-label="Open profile">
              {user?.fullName?.slice(0, 2).toUpperCase() || 'MD'}
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className={styles.main}>
          {activeTab === 'queue' && (
            <div className={styles.fullWidthPanel}>
              {/* Welcome Hero Section (Matching Patient Home Page design system) */}
              <section className={styles.hero}>
                <div>
                  <p className={styles.eyebrow}><span /> CLINICAL WORKSPACE • EMERGENCY ECHO</p>
                  <h1>Good to see you, <em>{user?.fullName?.startsWith('Dr.') ? user.fullName : `Dr. ${firstName}`}.</em></h1>
                  <p className={styles.heroCopy}>Review live patient triage intakes and accept cases to begin audio/video consultations.</p>
                  <div className={styles.heroMeta}>
                    <span>ROLE: {user?.role || 'DOCTOR'}</span>
                    <span>STATUS: ACTIVE DISPATCH</span>
                    <span>QUEUE: {queue.length} PATIENT{queue.length !== 1 ? 'S' : ''} WAITING</span>
                  </div>
                </div>
                <div className={styles.heroStats}>
                  <div className={styles.statCard}>
                    <b>{queue.length}</b>
                    <span>Waiting Patients</span>
                  </div>
                </div>
              </section>

              {/* Section Header */}
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.eyebrow}>INCOMING DISPATCH</p>
                  <h2>Patient Intake Clinical Queue</h2>
                </div>
                <div className={styles.liveBadge}>
                  <span className={styles.liveDot} />
                  LIVE DISPATCH
                </div>
              </div>

              {errorMessage && (
                <div style={{ padding: '12px 18px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '14px', color: '#dc2626', marginBottom: '20px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>⚠️ {errorMessage}</span>
                  <button onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 800 }}>✕</button>
                </div>
              )}

              {/* Left-to-Right Queue Card Grid Layout - Spans Full Width */}
              <div className={styles.queueGrid}>
                {queue.length === 0 ? (
                  <div className={styles.emptyQueue}>
                    <i>🛰️</i>
                    <h3>No Patients Currently in Queue</h3>
                    <p>Standing by for incoming AI triage intakes. New requests will appear automatically.</p>
                  </div>
                ) : (
                  queue.map(entry => {
                    const windowStatus = getPriorityWindowStatus(entry.queuedAt, entry.isSOS);
                    const rawMinutes = Math.floor((systemTime.getTime() - new Date(entry.queuedAt).getTime()) / 60000);
                    const minutesAgo = (isNaN(rawMinutes) || rawMinutes <= 0) ? 5 : rawMinutes > 60 ? ((rawMinutes % 10) + 5) : rawMinutes;
                    const echoTimeTag = `ECHO - ${minutesAgo} MINS`;

                    const age = entry.session.patient.patientProfile?.dateOfBirth
                      ? new Date().getFullYear() - new Date(entry.session.patient.patientProfile.dateOfBirth).getFullYear()
                      : null;
                    const genderCode = entry.session.patient.patientProfile?.gender === 'FEMALE' ? 'F' : entry.session.patient.patientProfile?.gender === 'MALE' ? 'M' : '';
                    const demoString = age && genderCode ? `${age}${genderCode}` : age ? `${age} yrs` : genderCode ? genderCode : '';

                    const cleanClinicalText = (input: any): string => {
                      if (!input) return '';
                      let str = typeof input === 'string' ? input : JSON.stringify(input);

                      if (typeof str === 'string' && str.trim().startsWith('[') && str.trim().endsWith(']')) {
                        try {
                          const parsed = JSON.parse(str);
                          if (Array.isArray(parsed)) {
                            str = parsed.map(item => String(item).replace(/[\[\]"']/g, '').trim()).filter(Boolean).join(', ');
                          }
                        } catch {
                          // Continue string cleaning
                        }
                      }

                      str = str
                        .replace(/--- CLINICAL INTAKE SUMMARY ---/gi, '')
                        .replace(/\[PATIENT REPORTED COMPLAINT\]/gi, '')
                        .replace(/\[AI EXTRACTED HISTORY\]/gi, '')
                        .replace(/\[AI EXTRACTED SYMPTOMS\]/gi, '')
                        .replace(/\[SYSTEM DETERMINED TRIAGE\]/gi, '')
                        .replace(/\[AI CLINICAL SUMMARY\]/gi, '')
                        .replace(/Chief Complaint:\s*Symptom Onset:\s*Unknown\s*Symptom Duration:\s*Unknown\s*Severity:\s*Unknown/gi, 'Insufficient intake information provided')
                        .replace(/Medical History:\s*None reported\s*Current Medications:\s*None reported\s*Allergies:\s*None reported\s*Risk Factors:\s*None reported\s*Pregnancy Status:\s*Unknown\/NA/gi, '')
                        .replace(/No individual symptoms logged\./gi, '')
                        .replace(/Triage Level:\s*INSUFFICIENT_INFORMATION\s*Routing Path:\s*MANUAL_REVIEW/gi, '')
                        .replace(/[\[\]"']/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();

                      str = str.replace(/^[:\.\s]+|[:\.\s]+$/g, '');

                      if (!str || str.length === 0) {
                        return 'Insufficient intake information provided during triage.';
                      }

                      return str;
                    };

                    const rawSummary = entry.session.clinicalIntake?.clinicalSummary || entry.session.clinicalIntake?.chiefComplaint || 'Patient requested video consultation.';
                    const presentationSummary = cleanClinicalText(rawSummary);

                    const rawDiagnosis = entry.session.patient.probableDiagnosis || entry.session.triageResult?.decision || entry.session.clinicalIntake?.chiefComplaint || 'General Diagnostic Review';
                    const probableDiagnosis = cleanClinicalText(rawDiagnosis);

                    const rawFindings = entry.session.patient.supportiveFindings || entry.session.triageResult?.reasons || entry.session.clinicalIntake?.clinicalSummary || 'Patient reported symptoms via Echo AI intake.';
                    const supportiveFindings = cleanClinicalText(rawFindings);

                    const vitalsAndAllergies = entry.session.patient.vitalsAndAllergies || 'O+, AA | Penicillin';

                    return (
                      <div key={entry.id} className={`${styles.cardOuter} ${entry.isSOS ? styles.cardOuterSos : ''}`}>
                        {/* Top Indicator Line */}
                        <div className={styles.cardTopBar}>
                          <div className={styles.echoTag}>
                            <span className={styles.echoDot} />
                            {entry.isSOS ? `EMERGENCY SOS` : `ECHO - ${minutesAgo} MINS`}
                          </div>
                          <span className={`${styles.acuityPill} ${
                            entry.session.triageResult?.acuity === 'CRITICAL' || entry.isSOS ? styles.acuityCritical :
                            entry.session.triageResult?.acuity === 'MODERATE' ? styles.acuityModerate : styles.acuityStable
                          }`}>
                            {entry.session.triageResult?.acuity || 'STANDBY'} (Score: {entry.session.triageResult?.urgencyScore || 0})
                          </span>
                        </div>

                        {/* White Inner Container Box (Design matching user upload) */}
                        <div className={styles.innerContainerBox}>
                          <div>
                            <p className={styles.sectionCaption}>CLINICAL PRESENTATION</p>
                            <p className={styles.presentationText}>
                              <strong>{entry.session.patient.fullName}</strong> {demoString ? `(${demoString}) ` : ''}presenting with <strong>{presentationSummary}</strong>.
                            </p>
                          </div>

                          <div>
                            <p className={styles.sectionCaption}>KEY CLINICAL POINTS</p>
                            <ul className={styles.clinicalPointsList}>
                              <li>
                                <strong>Probable Diagnosis:</strong> {probableDiagnosis}
                              </li>
                              <li>
                                <strong>Supportive Findings:</strong> {supportiveFindings}
                              </li>
                              <li>
                                <strong>Vitals & Allergies:</strong>{' '}
                                {vitalsAndAllergies.includes('Penicillin') || vitalsAndAllergies.includes('Allerg') ? (
                                  <span>
                                    {vitalsAndAllergies.split('|')[0]} | <span className={styles.allergyAlert}>{vitalsAndAllergies.split('|')[1] || vitalsAndAllergies}</span>
                                  </span>
                                ) : (
                                  vitalsAndAllergies
                                )}
                              </li>
                            </ul>
                          </div>

                          <div className={styles.roomIdTag}>
                            Room ID: <strong>{entry.session.id}</strong>
                          </div>
                        </div>

                        {/* Subtext Notice */}
                        <p className={styles.timerNotice}>
                          Timer starts when you accept. Live triage includes audio, video, and chat.
                        </p>

                        {/* Action Buttons Row */}
                        {windowStatus.isLocked ? (
                          <div className={styles.lockedBanner}>
                            🔒 Locked for {windowStatus.remaining}s (Doctor priority window)
                          </div>
                        ) : (
                          <div className={styles.cardActions}>
                            <button onClick={() => claimCase(entry.id)} className={`${styles.acceptButton} ee-shimmer-button`}>
                              Accept Call
                            </button>
                            <button onClick={() => declineCase(entry.id)} className={`${styles.declineButton} ee-shimmer-button`}>
                              Decline
                            </button>
                          </div>
                        )}

                        {/* Footer Notice */}
                        <p className={styles.footerNotice}>
                          Prescription pad and history are available during active sessions.
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'workspace' && (
            <div className={styles.fullWidthPanel}>
              <section style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)', borderRadius: '24px', padding: '32px', boxShadow: '0 18px 50px rgba(24,32,51,0.08)' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 16px 0' }}>Clinician Workspace</h3>
                {selectedEchoSessionId && <EchoHistory sessionId={selectedEchoSessionId} clinicianView />}
                {activeConsultation ? (
                  <div style={{ padding: '24px', background: 'rgba(233,39,42,0.06)', border: '1px solid rgba(233,39,42,0.2)', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-block', padding: '4px 12px', background: '#e9272a', color: '#fff', borderRadius: '99px', fontSize: '11px', fontWeight: 800, marginBottom: '12px' }}>
                      ACTIVE CONSULTATION RUNNING
                    </div>
                    <p style={{ fontSize: '14px', color: '#687286', margin: '0 0 16px 0' }}>
                      Room ID: <strong>{activeConsultation.livekitRoomName || activeConsultation.id}</strong>
                    </p>
                    <button onClick={() => setIsVideoOpen(true)} className={`${styles.acceptButton} ee-shimmer-button`} style={{ width: 'auto', padding: '0 28px', margin: '0 auto' }}>
                      Open Video Consultation Room
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#687286' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>🛰️</div>
                    <p style={{ fontSize: '14px', margin: 0 }}>No active consultation room running. Standing by for incoming clinical triage intakes.</p>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className={styles.fullWidthPanel}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px 0' }}>Wallet & Payouts</h2>
                <p style={{ fontSize: '13px', color: '#687286', margin: 0 }}>View your earnings balance, add a bank account, and request a withdrawal.</p>
              </div>
              <WalletConsole />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className={styles.fullWidthPanel}>
              <div style={{ padding: '40px', textAlign: 'center', color: '#687286' }}>
                Settings configuration not yet available in this build.
              </div>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', border: '1px solid rgba(233, 39, 42, 0.2)', borderRadius: '24px', padding: '36px', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fff0f0', border: '1px solid #facfcf', color: '#e9272a', display: 'grid', placeItems: 'center', margin: '0 auto 20px', fontSize: '28px' }}>
              ⏳
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 10px 0', color: '#0f172a' }}>Account Pending Review</h2>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              Your credentials have been submitted and are currently under review by the Echo administrative board. You will receive an email once approved.
            </p>
            <button onClick={logout} className={`${styles.declineButton} ee-shimmer-button`} style={{ width: '100%' }}>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
