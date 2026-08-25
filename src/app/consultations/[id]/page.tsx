'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/services/apiClient';

interface ConsultationRecord {
  id: string;
  publicSummary: string;
  createdAt: string;
  clinicalNotes?: string;
  clinician?: { fullName: string; role: string };
  prescriptions?: Array<{
    id: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string | null;
  }>;
  referrals?: Array<{ id: string; specialty: string; reason: string }>;
  followUps?: Array<{ id: string; recommendedDate: string; instructions?: string | null }>;
  liveConsultation?: { id: string; status: string; endedAt?: string | null; createdAt: string };
}

interface ConsultationMessage {
  id: string;
  senderRole: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  sender?: { fullName: string; role: string };
}

export default function ConsultationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const consultationId = params?.id;

  const [record, setRecord] = useState<ConsultationRecord | null>(null);
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!consultationId) return;
    void loadDetail(consultationId);
  }, [consultationId]);

  const loadDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [recordRes, messagesRes] = await Promise.all([
        apiClient(`/consultations/${id}/records`),
        apiClient(`/consultations/${id}/messages`),
      ]);

      if (recordRes.ok) {
        const recordJson = await recordRes.json();
        setRecord(recordJson.success ? recordJson.data : null);
      } else {
        setRecord(null);
      }

      if (messagesRes.ok) {
        const messagesJson = await messagesRes.json();
        setMessages(Array.isArray(messagesJson.data) ? messagesJson.data : []);
      } else {
        setMessages([]);
      }
    } catch (err) {
      setError('Unable to load consultation details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={shellStyle}>Loading consultation details...</div>;
  }

  return (
    <main style={shellStyle}>
      <button type="button" onClick={() => router.back()} style={backBtnStyle}>← Back</button>

      {error && <div style={errorStyle}>{error}</div>}

      <section style={cardStyle} className="glass-panel">
        <div style={topRowStyle}>
          <div>
            <p style={eyebrowStyle}>Consultation detail</p>
            <h1 style={titleStyle}>{record?.clinician?.fullName || 'Clinician'}</h1>
            <p style={metaStyle}>{record?.clinician?.role || 'DOCTOR'} · {record?.createdAt ? new Date(record.createdAt).toLocaleString() : ''}</p>
          </div>
          <div style={pillStyle}>{record?.liveConsultation?.status || 'COMPLETED'}</div>
        </div>

        <div style={blockStyle}>
          <strong>Public summary</strong>
          <p style={textStyle}>{record?.publicSummary || 'No summary available.'}</p>
        </div>

        {record?.prescriptions?.length ? (
          <div style={blockStyle}>
            <strong>Prescriptions</strong>
            {record.prescriptions.map((rx) => (
              <div key={rx.id} style={entryStyle}>
                <strong>{rx.medicationName}</strong> {rx.dosage}
                <div style={detailTextStyle}>{rx.frequency} · {rx.duration}</div>
                {rx.instructions ? <div style={detailTextStyle}>{rx.instructions}</div> : null}
              </div>
            ))}
          </div>
        ) : null}

        {record?.referrals?.length ? (
          <div style={blockStyle}>
            <strong>Referrals</strong>
            {record.referrals.map((ref) => (
              <div key={ref.id} style={entryStyle}>
                <strong>{ref.specialty}</strong>
                <div style={detailTextStyle}>{ref.reason}</div>
              </div>
            ))}
          </div>
        ) : null}

        {record?.followUps?.length ? (
          <div style={blockStyle}>
            <strong>Follow-ups</strong>
            {record.followUps.map((followUp) => (
              <div key={followUp.id} style={entryStyle}>
                {new Date(followUp.recommendedDate).toLocaleString()}
                {followUp.instructions ? <div style={detailTextStyle}>{followUp.instructions}</div> : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section style={cardStyle} className="glass-panel">
        <div style={topRowStyle}>
          <div>
            <p style={eyebrowStyle}>Post-consultation messages</p>
            <h2 style={subtitleStyle}>Message board</h2>
          </div>
        </div>

        <div style={messageListStyle}>
          {messages.length === 0 ? (
            <div style={emptyStyle}>No messages yet.</div>
          ) : (
            messages.map((message) => (
              <article key={message.id} style={messageCardStyle(message.senderRole === 'PATIENT')}>
                <strong>{message.sender?.fullName || message.senderRole}</strong>
                <p style={textStyle}>{message.message}</p>
                <div style={detailTextStyle}>
                  {new Date(message.createdAt).toLocaleString()} {message.readAt ? '✓✓' : '✓'}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

const shellStyle: React.CSSProperties = { minHeight: '100vh', padding: 24, color: 'var(--text-primary)', background: 'var(--bg)' };
const backBtnStyle: React.CSSProperties = { marginBottom: 16, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', color: 'inherit', cursor: 'pointer' };
const errorStyle: React.CSSProperties = { marginBottom: 16, padding: 12, borderRadius: 12, background: 'rgba(248,113,113,.12)', color: '#fecaca' };
const cardStyle: React.CSSProperties = { padding: 20, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 14 };
const topRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 };
const eyebrowStyle: React.CSSProperties = { margin: 0, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 };
const titleStyle: React.CSSProperties = { margin: '4px 0', fontSize: 28 };
const subtitleStyle: React.CSSProperties = { margin: '4px 0', fontSize: 20 };
const metaStyle: React.CSSProperties = { margin: 0, color: 'var(--text-secondary)' };
const pillStyle: React.CSSProperties = { padding: '6px 12px', borderRadius: 999, background: 'rgba(200,16,46,.12)', color: 'var(--primary-light)', fontWeight: 700, fontSize: 12 };
const blockStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 };
const textStyle: React.CSSProperties = { margin: 0, lineHeight: 1.6 };
const detailTextStyle: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 13, marginTop: 4 };
const entryStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.03)' };
const messageListStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const emptyStyle: React.CSSProperties = { color: 'var(--text-muted)' };
const messageCardStyle = (mine: boolean): React.CSSProperties => ({ padding: 14, borderRadius: 14, background: mine ? 'rgba(200,16,46,.12)' : 'rgba(255,255,255,.03)', alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%' });
