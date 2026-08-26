'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/services/apiClient';
import styles from './EchoHistory.module.css';

type EchoHistoryProps = { sessionId?: string | null; clinicianView?: boolean };
type Session = {
  id: string; status: string; createdAt: string; endedAt?: string | null; durationSeconds?: number | null; isSOS?: boolean;
  clinicalIntake?: { chiefComplaint?: string; clinicalSummary?: string; medicalHistory?: string | null; medications?: string | null; allergies?: string | null } | null;
  triageResult?: { acuity: string; urgencyScore: number; decision: string; reasons: string } | null;
  transcripts?: Array<{ id: string; speaker: string; text: string; timestamp: string; sequence: number }>;
};

export default function EchoHistory({ sessionId, clinicianView = false }: EchoHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const response = await apiClient(sessionId ? `/echo-ai/sessions/${sessionId}/history` : '/echo-ai/sessions');
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success) throw new Error(json?.message || 'Unable to load Echo history');
        if (cancelled) return;
        if (sessionId) { setSelected(json.data); setSessions([json.data]); } else setSessions(json.data || []);
      } catch (err: any) { if (!cancelled) setError(err?.message || 'Unable to load Echo history'); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load(); return () => { cancelled = true; };
  }, [sessionId]);

  const openSession = async (id: string) => {
    setDetailLoading(true); setError(null);
    try { const response = await apiClient(`/echo-ai/sessions/${id}/history`); const json = await response.json().catch(() => null); if (!response.ok || !json?.success) throw new Error(json?.message || 'Unable to load Echo session'); setSelected(json.data); }
    catch (err: any) { setError(err?.message || 'Unable to load Echo session'); }
    finally { setDetailLoading(false); }
  };

  if (loading) return <section className={styles.panel}><div className={styles.skeletonTitle}/><div className={styles.skeletonRow}/><div className={styles.skeletonRow}/></section>;
  return <section className={styles.panel}>
    <div className={styles.header}><div><p className={styles.eyebrow}>ECHO AI CLINICAL HISTORY</p><h2>{clinicianView ? 'Patient Echo record' : 'Your Echo conversations'}</h2><p className={styles.sub}>Transcripts, clinical summaries, triage results and patient-confirmed record updates remain available after the conversation.</p></div></div>
    {error && <div className={styles.error}>{error}</div>}
    {!sessionId && sessions.length > 0 && <div className={styles.sessionList}>{sessions.map(item => <button key={item.id} className={`${styles.sessionRow} ee-shimmer-button`} onClick={() => openSession(item.id)}><span className={styles.sessionDot}/><span className={styles.sessionInfo}><strong>{item.isSOS ? 'SOS Echo session' : item.clinicalIntake?.chiefComplaint || 'Echo clinical conversation'}</strong><small>{new Date(item.createdAt).toLocaleString()} · {item.status}</small></span><span className={styles.acuity}>{item.triageResult?.acuity || 'PROCESSING'} · {item.triageResult?.urgencyScore ?? '—'}</span><span>›</span></button>)}</div>}
    {!sessionId && sessions.length === 0 && <div className={styles.empty}>No completed Echo conversations yet.</div>}
    {selected && <div className={styles.detail}>
      <div className={styles.detailHeader}><div><span className={styles.badge}>{selected.isSOS ? 'SOS' : 'ECHO'}</span><strong>{selected.clinicalIntake?.chiefComplaint || 'Echo clinical conversation'}</strong></div><small>{new Date(selected.createdAt).toLocaleString()}</small></div>
      <div className={styles.summary}><h3>Clinical summary</h3><p>{selected.clinicalIntake?.clinicalSummary || 'Clinical summary is still being processed.'}</p></div>
      {selected.triageResult && <div className={styles.triage}><strong>{selected.triageResult.acuity}</strong><span>Urgency {selected.triageResult.urgencyScore}/100</span><p>{selected.triageResult.decision}</p></div>}
      {(selected.clinicalIntake?.medicalHistory || selected.clinicalIntake?.medications || selected.clinicalIntake?.allergies) && <div className={styles.contextGrid}>{selected.clinicalIntake?.medicalHistory && <div><b>History</b><span>{selected.clinicalIntake.medicalHistory}</span></div>}{selected.clinicalIntake?.medications && <div><b>Medications</b><span>{selected.clinicalIntake.medications}</span></div>}{selected.clinicalIntake?.allergies && <div><b>Allergies</b><span>{selected.clinicalIntake.allergies}</span></div>}</div>}
      <div className={styles.transcript}><div className={styles.transcriptTitle}>Full transcript {detailLoading && '· loading'}</div>{selected.transcripts?.length ? selected.transcripts.map(line => <div key={line.id} className={styles.line}><span>{line.speaker}</span><p>{line.text}</p><time>{new Date(line.timestamp).toLocaleTimeString()}</time></div>) : <div className={styles.empty}>Transcript is not available yet. The backend will retain it when Vapi sends the call transcript.</div>}</div>
    </div>}
  </section>;
}
