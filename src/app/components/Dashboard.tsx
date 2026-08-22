'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import JarvisVoiceChat from './JarvisVoiceChat';
import DMKManager from './DMKManager';
import BillingPanel from './BillingPanel';
import ConsultationManager from './ConsultationManager';
import NotificationHub from './NotificationHub';
import TextChat from './TextChat';
import IllnessCardGrid, { type IllnessItem } from './IllnessCardGrid';
import styles from './Dashboard.module.css';

type Tab = 'overview' | 'consultations' | 'records' | 'wallet' | 'qr' | 'notifications';
const navItems: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'overview', label: 'Home', icon: '⌂' }, { id: 'consultations', label: "Echo's", icon: '◌' },
  { id: 'records', label: 'Digital Medical Kit', icon: '+' }, { id: 'wallet', label: 'Echo Wallet & Billing', icon: '◫' },
  { id: 'qr', label: 'Digital QR Code', icon: '▦' }, { id: 'notifications', label: 'Notifications', icon: '◔' },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const [isSosCall, setIsSosCall] = useState(false);
  const [textChatOpen, setTextChatOpen] = useState(false);
  const [selectedIllness, setSelectedIllness] = useState<IllnessItem | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [profileDetail, setProfileDetail] = useState<{ dateOfBirth?: string; gender?: string; address?: string }>({
    dateOfBirth: '1990-05-15', gender: 'FEMALE', address: '123 Main St, Lagos, Nigeria',
  });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme); document.documentElement.setAttribute('data-theme', savedTheme);
    async function loadDashboard() {
      try {
        const response = await apiClient('/patients/dashboard');
        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data) {
            setUnreadMessages(json.data.unreadMessages || 0);
            setProfileDetail(json.data.profile || profileDetail);
          }
        }
      } catch { /* Available offline too. */ }
    }
    loadDashboard();
  }, []);

  const openTab = (tab: Tab) => { setActiveTab(tab); setSidebarOpen(false); };
  const startVoiceChat = (sos = false) => { setIsSosCall(sos); setVoiceChatOpen(true); };
  const toggleTheme = () => { const nextTheme = theme === 'dark' ? 'light' : 'dark'; setTheme(nextTheme); document.documentElement.setAttribute('data-theme', nextTheme); localStorage.setItem('theme', nextTheme); };
  const firstName = user?.fullName?.split(' ')[0] || 'there';

  return <div className={styles.dashboard}>
    <div className={styles.backdrop} />
    <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.brand}><img src="/assets/emergencyecho.png" alt="Emergency Echo" /><span>Emergency <b>Echo</b></span></div>
      <p className={styles.navCaption}>Patient space</p>
      <nav className={styles.nav} aria-label="Patient navigation">{navItems.map((item) => <button key={item.id} className={activeTab === item.id ? styles.navActive : ''} onClick={() => openTab(item.id)}><i>{item.icon}</i>{item.label}{item.id === 'notifications' && unreadMessages > 0 && <em>{unreadMessages}</em>}</button>)}</nav>
      <div className={styles.sidebarFooter}><div className={styles.patientMini}><span>{user?.fullName?.slice(0, 2).toUpperCase() || 'ME'}</span><div><strong>{user?.fullName || 'My profile'}</strong><small>Patient account</small></div></div><button className={styles.signOut} onClick={logout}>Sign out</button></div>
    </aside>
    <button className={`${styles.scrim} ${sidebarOpen ? styles.scrimOpen : ''}`} onClick={() => setSidebarOpen(false)} aria-label="Close menu" />
    <div className={styles.content}>
      <header className={styles.header}><button className={styles.menuButton} onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button><div className={styles.mobileBrand}>Emergency <b>Echo</b></div><div className={styles.headerActions}><button className={styles.iconButton} onClick={toggleTheme} aria-label="Toggle colour theme">{theme === 'dark' ? '☀' : '◐'}</button><button className={styles.avatar} onClick={() => openTab('records')} aria-label="Open profile">{user?.fullName?.slice(0, 2).toUpperCase() || 'ME'}</button></div></header>
      <main className={styles.main}>
        {activeTab === 'overview' && <section className={styles.overview}>
          <div className={styles.hero}><div><p className={styles.eyebrow}><span /> Your care space is active</p><h1>Good to see you, <em>{firstName}.</em></h1><p className={styles.heroCopy}>Start with Echo AI for guidance, or connect with a clinician when you need to.</p>{profileDetail && <div className={styles.profileMeta}><span>DOB: {profileDetail.dateOfBirth}</span><span>{profileDetail.gender}</span><span>{profileDetail.address?.split(',')[0]}</span></div>}</div><div className={styles.heroActions}><button className={styles.primaryAction} onClick={() => startVoiceChat(false)}><span>◌</span> Talk to Echo</button><button className={styles.sosAction} onClick={() => startVoiceChat(true)}><span>+</span> SOS</button></div></div>
          <div className={styles.statusRow}><div className={styles.statusItem}><i>✦</i><div><strong>Echo AI is ready</strong><small>Private triage, whenever you need it</small></div></div><button className={styles.statusItem} onClick={() => openTab('notifications')}><i className={styles.blueIcon}>◔</i><div><strong>{unreadMessages ? `${unreadMessages} new update${unreadMessages > 1 ? 's' : ''}` : 'You are all caught up'}</strong><small>View care updates</small></div><b>›</b></button></div>
          <section className={styles.voiceCard}><div className={styles.voiceGlow} /><div className={styles.voiceCopy}><p className={styles.eyebrow}>Voice care</p><h2>Tell Echo what’s going on.</h2><p>Speak naturally and get the right next step for your care.</p></div><button className={styles.voiceButton} onClick={() => startVoiceChat(false)} aria-label="Start a voice consultation"><span>⌁</span></button><button className={styles.voiceTextAction} onClick={() => startVoiceChat(false)}>Start voice check-in <b>→</b></button></section>
          <section className={styles.categories}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Quick help</p><h2>Choose a health concern</h2></div><span>Echo AI</span></div><IllnessCardGrid onSelectIllness={(item) => { setSelectedIllness(item); setTextChatOpen(true); }} /></section>
        </section>}
        {activeTab === 'consultations' && <Workspace title="Your Echo care" onBack={() => openTab('overview')}><ConsultationManager /></Workspace>}
        {activeTab === 'records' && <Workspace title="My health" onBack={() => openTab('overview')}><DMKManager /></Workspace>}
        {activeTab === 'wallet' && <Workspace title="Wallet & billing" onBack={() => openTab('overview')}><BillingPanel /></Workspace>}
        {activeTab === 'qr' && <Workspace title="Digital QR Code" onBack={() => openTab('overview')}><DMKManager openQrOnMount /></Workspace>}
        {activeTab === 'notifications' && <Workspace title="Care updates" onBack={() => openTab('overview')}><NotificationHub /></Workspace>}
      </main>
    </div>
    <nav className={styles.mobileNav} aria-label="Patient navigation">{navItems.filter((item) => item.id !== 'qr').map((item) => <button key={item.id} className={activeTab === item.id ? styles.mobileNavActive : ''} onClick={() => openTab(item.id)}><i>{item.icon}</i><span>{item.label}</span></button>)}<button className={styles.mobileSos} onClick={() => startVoiceChat(true)} aria-label="Start emergency SOS">+</button></nav>
    <JarvisVoiceChat isOpen={voiceChatOpen} onClose={() => setVoiceChatOpen(false)} isSOSMode={isSosCall} />
    {selectedIllness && <TextChat isOpen={textChatOpen} onClose={() => setTextChatOpen(false)} illnessTag={selectedIllness.tag} illnessTitle={selectedIllness.title} illnessColor={selectedIllness.color} illnessIcon={selectedIllness.icon} />}
  </div>;
}

function Workspace({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return <section className={styles.workspace}><div className={styles.workspaceHeader}><button onClick={onBack}>← Overview</button><div><p className={styles.eyebrow}>Emergency Echo</p><h1>{title}</h1></div></div>{children}</section>;
}
