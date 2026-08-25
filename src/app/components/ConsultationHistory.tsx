'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/apiClient';

interface ConsultationHistoryItem {
  id: string;
  publicSummary: string;
  clinicalNotes?: string;
  createdAt: string;
  liveConsultation?: {
    id: string;
    status: string;
    createdAt: string;
    endedAt?: string | null;
  };
  clinician?: {
    fullName: string;
    role: string;
  };
  prescriptions?: Array<{
    id: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string | null;
  }>;
  referrals?: Array<{
    id: string;
    specialty: string;
    reason: string;
  }>;
  followUps?: Array<{
    id: string;
    recommendedDate: string;
    instructions?: string | null;
  }>;
}

export default function ConsultationHistory() {
  const [items, setItems] = useState<ConsultationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient('/consultations/history');
      if (!response.ok) {
        throw new Error('Failed to load consultation history');
      }
      const json = await response.json();
      setItems(json.success && Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError('Unable to load consultation history.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={mutedStyle}>Loading consultation history...</div>;
  }

  return (
    <section style={containerStyle} className="glass-panel">
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Consultation history</p>
          <h3 style={titleStyle}>Your past consultations</h3>
        </div>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {items.length === 0 ? (
        <div style={emptyStyle}>No consultation history available yet.</div>
      ) : (
        <div style={listStyle}>
          {items.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div style={cardTopStyle}>
                <div>
                  <div style={doctorStyle}>{item.clinician?.fullName || 'Clinician'}</div>
                  <div style={metaStyle}>{item.clinician?.role || 'DOCTOR'} · {new Date(item.createdAt).toLocaleString()}</div>
                </div>
                <div style={statusStyle}>{item.liveConsultation?.status || 'COMPLETED'}</div>
              </div>

              <p style={summaryStyle}><strong>Summary:</strong> {item.publicSummary}</p>

              {item.prescriptions?.length ? (
                <div style={blockStyle}>
                  <strong style={blockTitleStyle}>Prescriptions</strong>
                  {item.prescriptions.map((rx) => (
                    <div key={rx.id} style={pillStyle}>
                      <strong>{rx.medicationName}</strong> {rx.dosage} · {rx.frequency} · {rx.duration}
                      {rx.instructions ? <div style={detailStyle}>{rx.instructions}</div> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {item.referrals?.length ? (
                <div style={blockStyle}>
                  <strong style={blockTitleStyle}>Referrals</strong>
                  {item.referrals.map((ref) => (
                    <div key={ref.id} style={pillStyle}>
                      <strong>{ref.specialty}</strong> · {ref.reason}
                    </div>
                  ))}
                </div>
              ) : null}

              {item.followUps?.length ? (
                <div style={blockStyle}>
                  <strong style={blockTitleStyle}>Follow-ups</strong>
                  {item.followUps.map((followUp) => (
                    <div key={followUp.id} style={pillStyle}>
                      {new Date(followUp.recommendedDate).toLocaleString()}
                      {followUp.instructions ? <div style={detailStyle}>{followUp.instructions}</div> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const containerStyle: React.CSSProperties = { padding: 18, display: 'flex', flexDirection: 'column', gap: 14 };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const eyebrowStyle: React.CSSProperties = { margin: 0, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 };
const titleStyle: React.CSSProperties = { margin: '4px 0 0', fontSize: 18 };
const mutedStyle: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 14 };
const errorStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: 'rgba(248,113,113,.12)', color: '#fecaca' };
const emptyStyle: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 14 };
const listStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const cardStyle: React.CSSProperties = { padding: 16, borderRadius: 16, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)' };
const cardTopStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 };
const doctorStyle: React.CSSProperties = { fontWeight: 700 };
const metaStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)' };
const statusStyle: React.CSSProperties = { alignSelf: 'start', padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(200,16,46,.12)', color: 'var(--primary-light)' };
const summaryStyle: React.CSSProperties = { margin: '0 0 10px', lineHeight: 1.6 };
const blockStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 };
const blockTitleStyle: React.CSSProperties = { fontSize: 13 };
const pillStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.03)', lineHeight: 1.5 };
const detailStyle: React.CSSProperties = { marginTop: 4, color: 'var(--text-muted)', fontSize: 13 };
