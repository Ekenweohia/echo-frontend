'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/services/apiClient';
import VideoRoom from './VideoRoom';

interface Consultation {
  id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING';
  roomName?: string;
  startedAt?: string;
  patientName?: string;
  clinicianName?: string;
}

interface Message {
  id: string;
  senderRole: 'PATIENT' | 'DOCTOR' | 'NURSE' | 'ADMIN';
  message: string;
  createdAt: string;
  senderName: string;
  readAt?: string | null;
}

export default function ConsultationManager() {
  const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [inCall, setInCall] = useState(false);

  const canChat = useMemo(() => Boolean(activeConsultation), [activeConsultation]);

  useEffect(() => {
    void loadState();
    const timer = setInterval(() => void loadState(false), 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!showChat) return;
    if (!activeConsultation) return;
    void loadMessages(activeConsultation.id);
  }, [showChat, activeConsultation]);

  const loadState = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const liveRes = await apiClient('/consultations/live');
      const liveJson = liveRes.ok ? await liveRes.json() : null;
      const consultation = liveJson?.success && liveJson?.data
        ? {
            id: liveJson.data.id,
            status: liveJson.data.status,
            roomName: liveJson.data.livekitRoomName,
            startedAt: liveJson.data.startedAt,
            patientName: liveJson.data.patient?.fullName,
            clinicianName: liveJson.data.primaryClinician?.fullName || liveJson.data.clinician?.fullName,
          }
        : null;

      setActiveConsultation(consultation);

      if (consultation) {
        await Promise.all([
          loadRecords(consultation.id),
          showChat ? loadMessages(consultation.id) : Promise.resolve(),
        ]);
      } else {
        setRecords([]);
        setMessages([]);
        setShowChat(false);
      }
    } catch (err) {
      setError('Unable to load consultation state from the backend.');
      setActiveConsultation(null);
      setRecords([]);
      setMessages([]);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const loadRecords = async (consultationId: string) => {
    const res = await apiClient(`/consultations/${consultationId}/records`);
    if (!res.ok) {
      setRecords([]);
      return;
    }
    const json = await res.json();
    setRecords(json.success && json.data ? [json.data] : []);
  };

  const loadMessages = async (consultationId: string) => {
    const res = await apiClient(`/consultations/${consultationId}/messages`);
    if (!res.ok) {
      setMessages([]);
      return;
    }
    const json = await res.json();
    setMessages((json.data || []).map((m: any) => ({
      id: m.id,
      senderRole: m.senderRole,
      message: m.message,
      createdAt: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: m.sender?.fullName || 'Unknown',
      readAt: m.readAt,
    })));
  };

  const joinCall = async () => {
    if (!activeConsultation) return;
    const res = await apiClient(`/consultations/${activeConsultation.id}/join`);
    if (!res.ok) {
      setError('Unable to join the consultation room.');
      return;
    }
    const json = await res.json();
    if (json.success && json.data?.token) {
      setInCall(true);
    } else {
      setError(json.message || 'Unable to join the consultation room.');
    }
  };

  const endCall = async () => {
    if (!activeConsultation) return;
    try {
      await apiClient(`/consultations/${activeConsultation.id}/end`, { method: 'POST' });
    } finally {
      setInCall(false);
      await loadState(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || !activeConsultation) return;
    setNewMessage('');

    const tempId = `tmp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        senderRole: 'PATIENT',
        message: text,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        senderName: 'You',
      },
    ]);

    const res = await apiClient(`/consultations/${activeConsultation.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message: text }),
    });

    if (res.ok) {
      await loadMessages(activeConsultation.id);
    } else {
      setError('Message could not be sent.');
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Checking consultation state...</div>;
  }

  return (
    <div style={wrapperStyle}>
      {error && <div style={errorStyle}>{error}</div>}

      {activeConsultation ? (
        <section style={bannerStyle} className="glass-panel">
          <div>
            <div style={eyebrowStyle}>ACTIVE CONSULTATION</div>
            <h3 style={titleStyle}>Session with {activeConsultation.patientName || 'patient'}</h3>
            <p style={subtleStyle}>Room: {activeConsultation.roomName || activeConsultation.id}</p>
          </div>
          <div style={actionsStyle}>
            <button onClick={joinCall} style={primaryBtnStyle}>Join Room</button>
            <button onClick={() => setShowChat((v) => !v)} style={secondaryBtnStyle}>
              {showChat ? 'Hide Messages' : `Messages (${messages.length})`}
            </button>
          </div>
        </section>
      ) : (
        <section style={emptyStyle} className="glass-panel">
          No active consultation is currently available.
        </section>
      )}

      {inCall && activeConsultation && (
        <VideoRoom consultationId={activeConsultation.id} onClose={() => void endCall()} />
      )}

      {showChat && activeConsultation && (
        <section style={chatPanelStyle} className="glass-panel">
          <header style={chatHeaderStyle}>
            <div style={eyebrowStyle}>POST-CONSULTATION MESSAGES</div>
            <button onClick={() => setShowChat(false)} style={closeBtnStyle}>×</button>
          </header>
          <div style={chatListStyle}>
            {messages.map((m) => (
              <article key={m.id} style={messageStyle(m.senderRole === 'PATIENT')}>
                <strong style={senderStyle}>{m.senderName}</strong>
                <p style={messageTextStyle}>{m.message}</p>
                <span style={timeStyle}>{m.createdAt} {m.readAt ? '✓✓' : '✓'}</span>
              </article>
            ))}
          </div>
          <form onSubmit={sendMessage} style={chatFormStyle}>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Send a follow-up message..."
              style={chatInputStyle}
            />
            <button type="submit" style={sendBtnStyle}>Send</button>
          </form>
        </section>
      )}

      {records.length > 0 && (
        <section style={recordsStyle}>
          <div style={eyebrowStyle}>CONSULTATION RECORDS</div>
          {records.map((record) => (
            <article key={record.id} style={recordCardStyle} className="glass-panel">
              <div style={recordTopStyle}>
                <div>
                  <div style={recordClinicianStyle}>{record.clinician?.fullName || 'Clinician'}</div>
                  <div style={recordMetaStyle}>{record.clinician?.role || 'DOCTOR'}</div>
                </div>
                <div style={recordMetaStyle}>{new Date(record.createdAt).toLocaleString()}</div>
              </div>
              <p style={summaryStyle}><strong>Summary:</strong> {record.publicSummary}</p>
              {record.prescriptions?.length > 0 && (
                <div style={sectionBlockStyle}>
                  <h4 style={sectionTitleStyle}>Prescriptions</h4>
                  {record.prescriptions.map((rx: any) => (
                    <div key={rx.id} style={itemStyle}>
                      <strong>{rx.medicationName}</strong> {rx.dosage}
                      <div style={mutedTextStyle}>{rx.frequency} for {rx.duration}. {rx.instructions}</div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

const wrapperStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16, width: '100%' };
const bannerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, padding: 20, border: '1px solid rgba(255,255,255,.08)' };
const emptyStyle: React.CSSProperties = { padding: 16, color: 'var(--text-muted)' };
const errorStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: 'rgba(248,113,113,.12)', color: '#fecaca' };
const eyebrowStyle: React.CSSProperties = { fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 };
const titleStyle: React.CSSProperties = { margin: '6px 0 4px', fontSize: 18 };
const subtleStyle: React.CSSProperties = { margin: 0, color: 'var(--text-secondary)', fontSize: 13 };
const actionsStyle: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center' };
const primaryBtnStyle: React.CSSProperties = { padding: '10px 16px', borderRadius: 10, border: 0, background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700 };
const secondaryBtnStyle: React.CSSProperties = { padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' };
const chatPanelStyle: React.CSSProperties = { padding: 16, border: '1px solid rgba(255,255,255,.08)' };
const chatHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 };
const closeBtnStyle: React.CSSProperties = { background: 'transparent', border: 0, color: 'var(--text-primary)', fontSize: 24, cursor: 'pointer' };
const chatListStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto', paddingRight: 8 };
const messageStyle = (mine: boolean): React.CSSProperties => ({ alignSelf: mine ? 'flex-end' : 'flex-start', background: mine ? 'rgba(200,16,46,.18)' : 'rgba(255,255,255,.04)', padding: 12, borderRadius: 14, maxWidth: '82%' });
const senderStyle: React.CSSProperties = { display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--primary-light)' };
const messageTextStyle: React.CSSProperties = { margin: 0, fontSize: 14, lineHeight: 1.5 };
const timeStyle: React.CSSProperties = { display: 'block', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' };
const chatFormStyle: React.CSSProperties = { display: 'flex', gap: 10, marginTop: 12 };
const chatInputStyle: React.CSSProperties = { flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', color: 'var(--text-primary)' };
const sendBtnStyle: React.CSSProperties = { padding: '12px 18px', borderRadius: 10, border: 0, background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer' };
const recordsStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const recordCardStyle: React.CSSProperties = { padding: 18, border: '1px solid rgba(255,255,255,.08)' };
const recordTopStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 10 };
const recordClinicianStyle: React.CSSProperties = { fontWeight: 700 };
const recordMetaStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)' };
const summaryStyle: React.CSSProperties = { margin: '0 0 12px', lineHeight: 1.6 };
const sectionBlockStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: 14 };
const itemStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.03)' };
const mutedTextStyle: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 13, marginTop: 4 };
