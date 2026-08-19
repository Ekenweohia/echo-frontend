'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/services/apiClient';
import VideoRoom from './VideoRoom';

interface Consultation {
  id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING';
  clinicianName: string;
  roomName?: string;
  startedAt: string;
}

interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Message {
  id: string;
  senderRole: 'PATIENT' | 'DOCTOR' | 'NURSE';
  message: string;
  createdAt: string;
  senderName: string;
}

export default function ConsultationManager() {
  const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [inCall, setInCall] = useState(false);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);

  // Messaging & Records State
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pastRecords, setPastRecords] = useState<any[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConsultationData();
  }, []);

  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

  const fetchConsultationData = async () => {
    setLoading(true);
    try {
      // 1. Get Live Consultation (API 5.1)
      const liveRes = await apiClient('/consultations/live');
      if (liveRes.ok) {
        const json = await liveRes.json();
        if (json.success && json.data) {
          setActiveConsultation({
            id: json.data.id,
            status: json.data.status,
            clinicianName: 'Dr. John Smith',
            roomName: json.data.livekitRoomName,
            startedAt: json.data.startedAt
          });
          // Load active messages
          fetchMessages(json.data.id);
        }
      }

      // 2. Load Past Records for user dashboard
      // Note: We use a placeholder consultation ID for demo lookup
      const demoId = 'consultation-uuid';
      const recordRes = await apiClient(`/consultations/${demoId}/records`);
      if (recordRes.ok) {
        const json = await recordRes.json();
        if (json.success && json.data) {
          setPastRecords([json.data]);
        }
      }
    } catch (err) {
      console.warn('[Consultations] Offline. Loading mock consultation status.');
      // Bootstrap mocks for offline review
      setActiveConsultation({
        id: 'consultation-active-mock',
        status: 'ACTIVE',
        clinicianName: 'Dr. John Smith',
        roomName: 'consultation-room-101',
        startedAt: new Date().toLocaleTimeString()
      });
      setPastRecords([
        {
          id: 'rec-1',
          publicSummary: 'Hypertension Follow-up: Patient advised daily cardio exercises and low-sodium diet.',
          createdAt: new Date().toLocaleDateString(),
          clinician: { fullName: 'Dr. John Smith', role: 'DOCTOR' },
          prescriptions: [
            { id: 'rx-1', medicationName: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration: '14 days', instructions: 'Take in morning with water' }
          ]
        }
      ]);
      setMessages([
        { id: 'm-1', senderRole: 'DOCTOR', message: 'Please monitor your blood pressure daily and report any headaches.', createdAt: '10:05 AM', senderName: 'Dr. John Smith' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // API 6.2: Get Messages
  const fetchMessages = async (consultId: string) => {
    try {
      const res = await apiClient(`/consultations/${consultId}/messages`);
      if (res.ok) {
        const json = await res.json();
        setMessages(json.data.map((m: any) => ({
          id: m.id,
          senderRole: m.senderRole,
          message: m.message,
          createdAt: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          senderName: m.sender.fullName,
          readAt: m.readAt
        })));
      }
    } catch (e) {}
  };

  // API 5.2: Join Consultation (Fetch LiveKit Token)
  const handleJoinCall = async () => {
    if (!activeConsultation) return;
    try {
      const response = await apiClient(`/consultations/${activeConsultation.id}/join`);
      if (response.ok) {
        const json = await response.json();
        setLivekitToken(json.data.token);
      }
    } catch (err) {
      setLivekitToken('mock-livekit-jwt-auth-token');
    }
    setInCall(true);
  };

  // API 5.3: End Consultation
  const handleEndCall = async () => {
    if (!activeConsultation) return;
    try {
      await apiClient(`/consultations/${activeConsultation.id}/end`, { method: 'POST' });
    } catch (e) {}
    setInCall(false);
    setLivekitToken(null);
    setActiveConsultation(null);
  };

  // API 6.3: Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConsultation) return;

    const text = newMessage;
    setNewMessage('');

    // Optimistically add message
    const tempMsg: Message = {
      id: `msg-temp-${Date.now()}`,
      senderRole: 'PATIENT',
      message: text,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: 'Jane Doe'
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const response = await apiClient(`/consultations/${activeConsultation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: text })
      });
      if (response.ok) {
        const json = await response.json();
        // Replace temp message with server data
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? {
          id: json.data.id,
          senderRole: 'PATIENT',
          message: json.data.message,
          createdAt: new Date(json.data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          senderName: 'Jane Doe',
          readAt: json.data.readAt
        } : m));
      }
    } catch (err) {
      // Keep mock in list
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Checking active consultations...</div>;
  }

  return (
    <div style={consultationWrapperStyle}>
      
      {/* Active Consultation banner */}
      {activeConsultation ? (
        <div style={activeBannerStyle} className="glass-panel">
          <div style={activeLeftStyle}>
            <span style={activeDotStyle} />
            <div>
              <h4 style={activeTitleStyle}>Active Consultation Session</h4>
              <p style={activeClinicianStyle}>With {activeConsultation.clinicianName}</p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Room ID: <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{activeConsultation.id}</strong>
              </p>
            </div>
          </div>

          <div style={activeRightStyle}>
            <button onClick={handleJoinCall} style={joinBtnStyle}>Join Video</button>
            <button onClick={() => setShowChat(!showChat)} style={chatToggleBtnStyle}>
              {showChat ? 'Hide Chat' : `Chat (${messages.length})`}
            </button>
          </div>
        </div>
      ) : (
        <div style={inactiveBannerStyle} className="glass-panel">
          <span style={inactiveLabelStyle}>NO ACTIVE CLINICAL CALLS</span>
        </div>
      )}

      {/* Video Call Modal Overlay */}
      {inCall && activeConsultation && (
        <VideoRoom 
          consultationId={activeConsultation.id} 
          onClose={() => {
            setInCall(false);
            setLivekitToken(null);
            fetchConsultationData();
          }}
        />
      )}

      {/* Chat Sidebar/Drawer Layout */}
      {showChat && activeConsultation && (
        <div style={chatDrawerStyle} className="glass-panel">
          <div style={chatHeaderStyle}>
            <h4>Inbox: {activeConsultation.clinicianName}</h4>
            <button onClick={() => setShowChat(false)} style={chatCloseBtnStyle}>✕</button>
          </div>
          
          <div style={chatBodyStyle}>
            {messages.map(m => (
              <div key={m.id} style={m.senderRole === 'PATIENT' ? userBubbleStyle : docBubbleStyle}>
                <span style={bubbleSenderNameStyle}>{m.senderName} ({m.senderRole})</span>
                <p style={bubbleTextStyles}>{m.message}</p>
                <span style={bubbleTimeStyles}>
                  {m.createdAt} {m.senderRole === 'PATIENT' && (
                    <span style={{ marginLeft: '4px', color: (m as any).readAt ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {(m as any).readAt ? '✓✓' : '✓'}
                    </span>
                  )}
                </span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={chatInputFormStyle}>
            <input 
              type="text" 
              placeholder="Ask a medical follow-up question..." 
              value={newMessage} 
              onChange={e => setNewMessage(e.target.value)} 
              style={chatInputStyle}
              required 
            />
            <button type="submit" style={chatSendBtnStyle}>Send</button>
          </form>
        </div>
      )}

      {/* Historical Medical Consultation Records */}
      <div style={historySectionStyle}>
        <span style={historyTitleStyle}>POST-CONSULTATION RECORDS</span>
        
        {pastRecords.map((rec, idx) => (
          <div key={idx} style={recordCardStyle} className="glass-panel">
            <div style={recordHeaderStyle}>
              <div>
                <span style={recordClinicianStyle}>{rec.clinician.fullName}</span>
                <span style={recordRoleStyle}>{rec.clinician.role}</span>
              </div>
              <span style={recordDateStyle}>{rec.createdAt}</span>
            </div>

            <p style={recordSummaryStyle}>
              <strong>Summary:</strong> {rec.publicSummary}
            </p>

            {rec.prescriptions && rec.prescriptions.length > 0 && (
              <div style={rxBoxStyle}>
                <span style={rxTitleStyle}>PRESCRIPTIONS (RX)</span>
                {rec.prescriptions.map((rx: Prescription) => (
                  <div key={rx.id} style={rxItemStyle}>
                    <div style={rxNameStyle}>{rx.medicationName} {rx.dosage}</div>
                    <div style={rxInstructionsStyle}>
                      Take {rx.frequency} for {rx.duration}. {rx.instructions}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}

// Styles
const consultationWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
  width: '100%',
};

const activeBannerStyle: React.CSSProperties = {
  padding: '1.25rem 1.5rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '1rem',
  border: '1.5px solid rgba(0, 245, 212, 0.25)',
  boxShadow: '0 0 15px rgba(0, 245, 212, 0.05)',
};

const inactiveBannerStyle: React.CSSProperties = {
  padding: '1rem 1.5rem',
  textAlign: 'center',
  background: 'rgba(255, 255, 255, 0.01)',
  border: '1px solid rgba(255, 255, 255, 0.03)',
};

const inactiveLabelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.08em',
};

const activeLeftStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
};

const activeDotStyle: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: 'var(--primary)',
  boxShadow: '0 0 10px var(--primary)',
  animation: 'heartbeat 1.5s infinite ease-in-out',
};

const activeTitleStyle: React.CSSProperties = {
  fontSize: '0.88rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const activeClinicianStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  color: 'var(--text-secondary)',
  marginTop: '1px',
};

const activeRightStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
};

const joinBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  background: 'linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%)',
  color: '#080c14',
  fontWeight: 700,
  fontSize: '0.74rem',
  border: 'none',
  cursor: 'pointer',
};

const chatToggleBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-primary)',
  fontWeight: 600,
  fontSize: '0.74rem',
  cursor: 'pointer',
};

const videoOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 10010,
  backgroundColor: 'rgba(5, 7, 12, 0.85)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '1.5rem',
};

const videoContainerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '720px',
  height: '75vh',
  maxHeight: '520px',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const videoHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.8rem',
  color: 'var(--text-primary)',
  fontWeight: 600,
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  paddingBottom: '0.5rem',
};

const videoStreamsGridStyle: React.CSSProperties = {
  flex: 1,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
};

const streamBoxStyle: React.CSSProperties = {
  background: '#0d1321',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const avatarCircleStyle: React.CSSProperties = {
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)',
  color: '#080c14',
  fontSize: '1.25rem',
  fontWeight: 700,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const streamLabelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '0.75rem',
  left: '0.75rem',
  fontSize: '0.72rem',
  color: 'white',
  background: 'rgba(0, 0, 0, 0.5)',
  padding: '0.2rem 0.5rem',
  borderRadius: '4px',
};

const callActionBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '0.75rem',
  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  paddingTop: '0.75rem',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'white',
  fontSize: '0.74rem',
  cursor: 'pointer',
};

const hangupBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  borderRadius: '6px',
  background: '#ff5a5f',
  color: '#080c14',
  fontWeight: 700,
  fontSize: '0.74rem',
  border: 'none',
  cursor: 'pointer',
};

const chatDrawerStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(30px)',
  borderRadius: 'var(--border-radius-md)',
  border: '1.5px solid rgba(0, 187, 249, 0.2)',
  boxShadow: '0 8px 32px 0 rgba(0, 187, 249, 0.05)',
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  height: '320px',
};

const chatHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  paddingBottom: '0.5rem',
  marginBottom: '0.75rem',
};

const chatCloseBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '0.85rem',
  cursor: 'pointer',
};

const chatBodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  paddingRight: '0.25rem',
  marginBottom: '0.75rem',
};

const bubbleBase: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
  padding: '0.5rem 0.75rem',
  borderRadius: '8px',
  maxWidth: '80%',
};

const userBubbleStyle: React.CSSProperties = {
  ...bubbleBase,
  alignSelf: 'flex-end',
  background: 'rgba(0, 245, 212, 0.05)',
  border: '1px solid rgba(0, 245, 212, 0.15)',
};

const docBubbleStyle: React.CSSProperties = {
  ...bubbleBase,
  alignSelf: 'flex-start',
  background: 'rgba(0, 187, 249, 0.05)',
  border: '1px solid rgba(0, 187, 249, 0.15)',
};

const bubbleSenderNameStyle: React.CSSProperties = {
  fontSize: '0.62rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
};

const bubbleTextStyles: React.CSSProperties = {
  fontSize: '0.76rem',
  color: 'var(--text-primary)',
};

const bubbleTimeStyles: React.CSSProperties = {
  fontSize: '0.58rem',
  color: 'var(--text-muted)',
  alignSelf: 'flex-end',
};

const chatInputFormStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
};

const chatInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.55rem 0.75rem',
  borderRadius: '6px',
  background: 'rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-primary)',
  fontSize: '0.78rem',
  outline: 'none',
};

const chatSendBtnStyle: React.CSSProperties = {
  padding: '0.55rem 1rem',
  borderRadius: '6px',
  background: 'rgba(0, 187, 249, 0.08)',
  border: '1px solid rgba(0, 187, 249, 0.15)',
  color: 'var(--secondary)',
  fontWeight: 700,
  fontSize: '0.74rem',
  cursor: 'pointer',
};

const historySectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
};

const historyTitleStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.08em',
};

const recordCardStyle: React.CSSProperties = {
  padding: '1.25rem 1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
};

const recordHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const recordClinicianStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const recordRoleStyle: React.CSSProperties = {
  fontSize: '0.64rem',
  color: 'var(--primary)',
  background: 'rgba(0, 245, 212, 0.08)',
  padding: '0.1rem 0.35rem',
  borderRadius: '4px',
  marginLeft: '0.5rem',
  fontWeight: 700,
};

const recordDateStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  color: 'var(--text-muted)',
};

const recordSummaryStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  lineHeight: '1.45',
  color: 'var(--text-secondary)',
};

const rxBoxStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  background: 'rgba(0, 0, 0, 0.15)',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.03)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const rxTitleStyle: React.CSSProperties = {
  fontSize: '0.64rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.05em',
};

const rxItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
  borderLeft: '2px solid var(--secondary)',
  paddingLeft: '0.75rem',
};

const rxNameStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const rxInstructionsStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  color: 'var(--text-secondary)',
};
