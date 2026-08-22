'use client';

import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';

interface TextChatProps {
  isOpen: boolean;
  onClose: () => void;
  illnessTag: string;
  illnessTitle?: string;
  illnessColor?: string;
  illnessIcon?: string;
}

interface TranscriptLine {
  id: string;
  speaker: 'AI' | 'USER' | 'SYSTEM';
  text: string;
}

const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || 'c0c5baf7-ec97-4971-b7ac-a18e9bb8db2b';
const VAPI_ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || 'cd66b0d9-3543-4417-9f12-e1f18b67f951';
const isBackendSession = (id: string | null) => Boolean(id && !id.startsWith('mock-') && !id.startsWith('clinician-'));

export default function TextChat({ isOpen, onClose, illnessTag, illnessTitle = 'Medical Chat', illnessColor = '#00f5d4', illnessIcon = '🩺' }: TextChatProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'connecting' | 'active' | 'error'>('connecting');
  const [input, setInput] = useState('');
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const pendingUserMessagesRef = useRef<string[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const endedRef = useRef(false);
  const mountedRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const addLine = useCallback((speaker: TranscriptLine['speaker'], text: string) => {
    const line = { id: crypto.randomUUID(), speaker, text };
    transcriptRef.current = [...transcriptRef.current, line];
    setTranscript(transcriptRef.current);
  }, []);

  const sendToolResult = useCallback((toolCall: any, result: unknown) => {
    vapiRef.current?.send({ type: 'add-message', message: {
      role: 'tool', name: toolCall.function?.name, tool_call_id: toolCall.id, content: JSON.stringify(result),
    } } as any);
  }, []);

  const handleToolCall = useCallback(async (toolCall: any) => {
    const name = toolCall.function?.name;
    if (name === 'get_patient_context' || name === 'get_person_details') {
      addLine('SYSTEM', 'Syncing your medical history…');
      try {
        const response = await apiClient('/dmk/me');
        const payload = response.ok ? await response.json() : null;
        const dmk = payload?.success ? payload.data : null;
        sendToolResult(toolCall, {
          patientName: user?.fullName || 'Patient', firstName: user?.fullName?.split(' ')[0] || 'Patient',
          activeConditions: (dmk?.conditions ?? []).map((item: any) => item.name),
          activeMedications: (dmk?.medications ?? []).map((item: any) => [item.name, item.dosage, item.frequency].filter(Boolean).join(' ')),
          knownAllergies: (dmk?.allergies ?? []).map((item: any) => `${item.allergen} (${item.severity}${item.reaction ? ` — ${item.reaction}` : ''})`),
          dmkCompleteness: dmk ? 'available' : 'not_initialized',
        });
      } catch {
        sendToolResult(toolCall, { error: 'Failed to retrieve patient details.' });
      }
      return;
    }
    if (name === 'flag_red_flag') addLine('SYSTEM', 'Urgent symptoms were flagged for clinical review.');
    if (name === 'finish_intake') addLine('SYSTEM', 'Intake complete. Your triage is being prepared.');
    sendToolResult(toolCall, { success: true, message: name === 'finish_intake' ? 'Intake finished.' : name === 'flag_red_flag' ? 'Red flag recorded.' : `Unsupported client tool: ${name || 'unknown'}` });
  }, [addLine, sendToolResult, user]);

  const endSession = useCallback(async (closeAfter: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const id = sessionIdRef.current;
    if (isBackendSession(id)) {
      const summary = transcriptRef.current.filter((line) => line.speaker !== 'SYSTEM').map((line) => `${line.speaker}: ${line.text}`).join('\n');
      try {
        await apiClient(`/echo-ai/sessions/${id}/end`, { method: 'POST', body: JSON.stringify({
          durationSeconds: Math.max(1, Math.round((Date.now() - (startedAtRef.current ?? Date.now())) / 1000)),
          rawAnalysis: { summary, structuredData: { illnessTag } },
        }) });
      } catch { /* Preserve the locally visible transcript when offline. */ }
    }
    const vapi = vapiRef.current;
    vapiRef.current = null;
    try { vapi?.stop(); (vapi as any)?.destroy?.(); } catch { /* Connection already closed. */ }
    if (closeAfter && mountedRef.current) onClose();
  }, [illnessTag, onClose]);

  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcript]);

  useEffect(() => {
    if (!isOpen) return;
    mountedRef.current = true;
    endedRef.current = false;
    startedAtRef.current = Date.now();
    sessionIdRef.current = null;
    transcriptRef.current = [];
    pendingUserMessagesRef.current = [];
    setTranscript([]);
    setSessionId(null);
    setStatus('connecting');
    addLine('SYSTEM', `Connecting your ${illnessTitle.toLowerCase()} text intake…`);

    let cancelled = false;
    const start = async () => {
      let createdId = `clinician-${crypto.randomUUID()}`;
      if (user?.role === 'PATIENT') {
        try {
          const response = await apiClient('/echo-ai/sessions', { method: 'POST', body: JSON.stringify({ language: 'en', isSOS: false }) });
          const payload = await response.json();
          if (!response.ok || !payload?.success || !payload?.data?.id) throw new Error('Session creation failed');
          createdId = payload.data.id;
        } catch {
          createdId = `mock-${crypto.randomUUID()}`;
          addLine('SYSTEM', 'Backend is unavailable; continuing in local session mode.');
        }
      }
      if (cancelled) {
        if (isBackendSession(createdId)) {
          void apiClient(`/echo-ai/sessions/${createdId}/end`, { method: 'POST', body: JSON.stringify({ durationSeconds: 1, rawAnalysis: { summary: '' } }) });
        }
        return;
      }
      sessionIdRef.current = createdId;
      setSessionId(createdId);
      const vapi = new Vapi(VAPI_PUBLIC_KEY);
      vapiRef.current = vapi;
      vapi.on('error', () => { if (mountedRef.current) setStatus('error'); });
      vapi.on('call-start', async () => {
        if (cancelled || !mountedRef.current) return;
        setStatus('active');
        
        // Force Vapi into a text-only mode by muting the microphone
        try { vapi.setMuted(true); } catch (e) {}
        
        // Mute AI audio output to make it purely text-based
        const muteAudio = () => {
          document.querySelectorAll('audio').forEach(audio => {
            audio.muted = true;
            audio.volume = 0;
          });
        };
        muteAudio();
        
        // Vapi might inject the audio element slightly after start, so we observe
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes) {
              muteAudio();
            }
          });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Clean up observer when call ends
        vapi.on('call-end', () => observer.disconnect());

        if (isBackendSession(createdId)) {
          try { await apiClient(`/echo-ai/sessions/${createdId}/start`, { method: 'POST', body: JSON.stringify({ vapiCallId: 'web-client-call' }) }); }
          catch { addLine('SYSTEM', 'The session started, but could not be synced to the backend.'); }
        }
      });
      vapi.on('call-end', () => { void endSession(false); });
      vapi.on('message', (message: any) => {
        if (cancelled || !mountedRef.current) return;
        if (message.type === 'transcript' && message.transcriptType === 'final' && message.transcript) {
          if (message.role !== 'assistant') {
            const duplicateIndex = pendingUserMessagesRef.current.indexOf(message.transcript);
            if (duplicateIndex >= 0) {
              pendingUserMessagesRef.current.splice(duplicateIndex, 1);
              return;
            }
          }
          addLine(message.role === 'assistant' ? 'AI' : 'USER', message.transcript);
        }
        if (message.type === 'tool-calls') for (const toolCall of message.toolCallList || []) void handleToolCall(toolCall);
      });
      try {
        await vapi.start(VAPI_ASSISTANT_ID, { metadata: { sessionId: createdId, patientId: user?.id || '' }, variableValues: {
          personIdentifier: user?.phone || user?.email || user?.id || 'unknown',
          identifierType: user?.phone ? 'phone' : user?.email ? 'email' : user?.id ? 'customer_id' : 'unknown',
          patientName: user?.fullName || 'Patient', illnessTag, illnessTitle,
        } });
      } catch {
        if (!cancelled && mountedRef.current) { setStatus('error'); addLine('SYSTEM', 'Unable to connect to Echo AI. Please try again.'); }
      }
    };
    void start();
    return () => { cancelled = true; mountedRef.current = false; void endSession(false); };
  }, [addLine, endSession, handleToolCall, illnessTag, illnessTitle, isOpen, user]);

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || status !== 'active' || !vapiRef.current) return;
    vapiRef.current.send({ type: 'add-message', message: { role: 'user', content: text } } as any);
    pendingUserMessagesRef.current.push(text);
    addLine('USER', text);
    setInput('');
  };

  if (!isOpen) return null;
  return <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={`${illnessTitle} text chat`}>
    <section style={modalStyle}>
      <header style={headerStyle}><div><div style={{ color: illnessColor, fontSize: 13, fontWeight: 700 }}>{illnessIcon} ECHO AI · TEXT INTAKE</div><h2 style={{ margin: '5px 0 0', fontSize: 20 }}>{illnessTitle}</h2></div><button type="button" onClick={() => void endSession(true)} style={closeStyle} aria-label="End text intake">×</button></header>
      <div style={{ ...statusStyle, color: status === 'error' ? '#fca5a5' : illnessColor }}>{status === 'active' ? 'Connected' : status === 'error' ? 'Connection problem' : 'Connecting securely…'}{sessionId && ' · Session active'}</div>
      <main style={messagesStyle} aria-live="polite">{transcript.map((line) => <div key={line.id} style={messageStyle(line.speaker, illnessColor)}>{line.speaker !== 'SYSTEM' && <span style={speakerStyle}>{line.speaker === 'AI' ? 'Echo AI' : 'You'}</span>}{line.text}</div>)}<div ref={transcriptEndRef} /></main>
      <form onSubmit={sendMessage} style={composerStyle}><input value={input} onChange={(event) => setInput(event.target.value)} disabled={status !== 'active'} placeholder={status === 'active' ? 'Describe how you feel…' : 'Waiting for a secure connection…'} style={inputStyle} /><button type="submit" disabled={!input.trim() || status !== 'active'} style={{ ...sendStyle, background: illnessColor }}>Send</button></form>
    </section>
  </div>;
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(5, 14, 28, .72)', backdropFilter: 'blur(8px)' };
const modalStyle: React.CSSProperties = { width: 'min(680px, 100%)', height: 'min(720px, calc(100vh - 40px))', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#eff6ff', background: '#0b1628', border: '1px solid rgba(147, 197, 253, .24)', borderRadius: 20, boxShadow: '0 28px 80px rgba(0,0,0,.45)' };
const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'start', justifyContent: 'space-between', padding: '22px 24px 16px', borderBottom: '1px solid rgba(147, 197, 253, .14)' };
const closeStyle: React.CSSProperties = { border: 0, color: '#cbd5e1', background: 'transparent', cursor: 'pointer', fontSize: 28, lineHeight: 1 };
const statusStyle: React.CSSProperties = { padding: '9px 24px', fontSize: 12, background: 'rgba(15, 23, 42, .7)' };
const messagesStyle: React.CSSProperties = { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: 24 };
const messageStyle = (speaker: TranscriptLine['speaker'], color: string): React.CSSProperties => ({ alignSelf: speaker === 'USER' ? 'flex-end' : 'flex-start', maxWidth: speaker === 'SYSTEM' ? '100%' : '82%', padding: speaker === 'SYSTEM' ? '2px 4px' : '12px 14px', color: speaker === 'SYSTEM' ? '#94a3b8' : '#f8fafc', background: speaker === 'USER' ? color : speaker === 'AI' ? '#17243a' : 'transparent', borderRadius: speaker === 'USER' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontSize: 14, lineHeight: 1.5 });
const speakerStyle: React.CSSProperties = { display: 'block', marginBottom: 4, color: '#93c5fd', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' };
const composerStyle: React.CSSProperties = { display: 'flex', gap: 10, padding: 18, borderTop: '1px solid rgba(147, 197, 253, .14)' };
const inputStyle: React.CSSProperties = { minWidth: 0, flex: 1, padding: '12px 14px', color: '#f8fafc', background: '#101d31', border: '1px solid #31425c', borderRadius: 10, outline: 'none' };
const sendStyle: React.CSSProperties = { padding: '0 18px', color: '#fff', border: 0, borderRadius: 10, cursor: 'pointer', fontWeight: 700 };
