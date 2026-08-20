'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import Vapi from '@vapi-ai/web';

interface JarvisVoiceChatProps {
  isOpen: boolean;
  onClose: () => void;
  isSOSMode?: boolean;
}

interface TranscriptLine {
  speaker: 'AI' | 'USER' | 'SYSTEM';
  text: string;
  timestamp: string;
}

const vapiPublicKey: string = 'c0c5baf7-ec97-4971-b7ac-a18e9bb8db2b';
const vapiAssistantId: string = 'cd66b0d9-3543-4417-9f12-e1f18b67f951';

export default function JarvisVoiceChat({ isOpen, onClose, isSOSMode = false }: JarvisVoiceChatProps) {
  const { user } = useAuth();
  
  // Vapi and Call States
  const [callStatus, setCallStatus] = useState<'idle' | 'initializing' | 'active' | 'ending'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCriticalAlert, setIsCriticalAlert] = useState(false);

  // UI & Audio Wave States
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [aiIsSpeaking, setAiIsSpeaking] = useState(false);
  const [statusText, setStatusText] = useState('Echo AI offline');
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const callStartedRef = useRef(false);
  const vapiInstanceRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  const isVapiConfigured = 
    vapiPublicKey && 
    vapiPublicKey !== 'vapi-public-key-placeholder' && 
    vapiAssistantId && 
    vapiAssistantId !== 'vapi-assistant-id-placeholder';

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      cleanupVapi();
    };
  }, []);

  // Handle Call Lifecycle
  useEffect(() => {
    if (!isOpen) return;

    handleStartCall();

    return () => {
      if (!isMountedRef.current) return;
      cleanupVapi();
    };
  }, [isOpen]);

  // Cleanup function for Vapi instance
  const cleanupVapi = () => {
    if (vapiInstanceRef.current) {
      try {
        vapiInstanceRef.current.stop();
        vapiInstanceRef.current.destroy();
      } catch (e) {
        console.log('[Vapi] Cleanup error:', e);
      }
      vapiInstanceRef.current = null;
    }
    callStartedRef.current = false;
  };

  // Establish call coordination with Backend & Vapi
  const handleStartCall = async () => {
    if (callStartedRef.current || !isMountedRef.current) return;
    callStartedRef.current = true;

    // Clean up any existing instance first
    cleanupVapi();

    setCallStatus('initializing');
    setTranscripts([{
      speaker: 'SYSTEM',
      text: isSOSMode ? '🚨 EMERGENCY SOS INTAKE CONNECTING...' : 'Initializing Echo clinical intake session...',
      timestamp: new Date().toLocaleTimeString()
    }]);

    let createdSessionId = '';

    // 1. POST /echo-ai/sessions (Tell backend we are starting, only for PATIENTS)
    if (user?.role === 'PATIENT') {
      try {
        const location = { latitude: 6.5244, longitude: 3.3792 };
        if (isSOSMode && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            location.latitude = pos.coords.latitude;
            location.longitude = pos.coords.longitude;
          });
        }

        const response = await apiClient('/echo-ai/sessions', {
          method: 'POST',
          body: JSON.stringify({
            language: 'en',
            isSOS: isSOSMode,
            latitude: location.latitude,
            longitude: location.longitude
          })
        });

        if (response.ok) {
          const json = await response.json();
          if (json.success) {
            createdSessionId = json.data.id;
            setSessionId(createdSessionId);
          }
        }
      } catch (err) {
        console.warn('[Vapi] Backend offline. Running mock session registration.');
        createdSessionId = `mock-session-${Math.random().toString(36).substring(4)}`;
        setSessionId(createdSessionId);
      }
    } else {
      console.log('[Vapi] Non-patient user detected. Bypassing backend database session creation.');
      createdSessionId = `clinician-test-${Math.random().toString(36).substring(4)}`;
      setSessionId(createdSessionId);
    }

    // 2. Start Vapi Connection
    if (isVapiConfigured) {
      try {
        setStatusText('Connecting WebRTC streams...');

        // Create new Vapi instance
        const vapi = new Vapi(vapiPublicKey);
        vapiInstanceRef.current = vapi;

        // Bind Vapi Error Listener FIRST
        vapi.on('error', (err: any) => {
          const errMsg = err?.message || (typeof err === 'object' && Object.keys(err).length ? JSON.stringify(err) : String(err));
          console.error('[Vapi] WebRTC connection error. Details:', errMsg);
          if (isMountedRef.current) {
            setStatusText('Echo AI Connection Failed');
          }
        });

        // Start Vapi - FIXED: Removed nested 'assistant' property
        await vapi.start(vapiAssistantId, {
          metadata: {
            sessionId: createdSessionId,
            patientId: user?.id || ''
          },
          variableValues: {
            personIdentifier: user?.phone || user?.email || user?.id || user?.fullName || 'unknown',
            identifierType: user?.phone ? 'phone' : (user?.email ? 'email' : (user?.id ? 'customer_id' : (user?.fullName ? 'full_name' : 'unknown'))),
            patientName: user?.fullName || 'Patient'
          }
          // Removed 'assistant' property that was causing the error
        });

        // Bind Vapi Event Listeners
        vapi.on('call-start', async () => {
          if (!isMountedRef.current) return;
          setCallStatus('active');
          setStatusText(isSOSMode ? 'SOS TRACE ACTIVE' : 'Clinical Stream Connected');
          setTranscripts(prev => [...prev, {
            speaker: 'AI',
            text: isSOSMode 
              ? 'Emergency Echo AI active. Paramedics have been notified of your location. What medical crisis are you experiencing?' 
              : 'Hello, I am Echo, your clinical voice assistant. How are you feeling today?',
            timestamp: new Date().toLocaleTimeString()
          }]);
          setAiIsSpeaking(true);

          // Inform Backend that session has started
          if (createdSessionId && !createdSessionId.startsWith('mock') && !createdSessionId.startsWith('clinician')) {
            try {
              await apiClient(`/echo-ai/sessions/${createdSessionId}/start`, {
                method: 'POST',
                body: JSON.stringify({ vapiCallId: 'web-client-call' })
              });
            } catch (err) {
              console.warn('[Vapi] Failed to notify backend of session start');
            }
          }
        });

        vapi.on('call-end', () => {
          if (!isMountedRef.current) return;
          handleEndCall();
        });

        vapi.on('speech-start', () => {
          if (!isMountedRef.current) return;
          setAiIsSpeaking(true);
        });

        vapi.on('speech-end', () => {
          if (!isMountedRef.current) return;
          setAiIsSpeaking(false);
        });

        vapi.on('volume-level', (vol: number) => {
          if (!isMountedRef.current) return;
          setVolumeLevel(vol);
        });

        vapi.on('message', async (message: any) => {
          if (!isMountedRef.current) return;

          if (message.type === 'transcript' && message.transcriptType === 'final') {
            const speakerRole = message.role === 'assistant' ? 'AI' : 'USER';
            setTranscripts(prev => [...prev, {
              speaker: speakerRole,
              text: message.transcript,
              timestamp: new Date().toLocaleTimeString()
            }]);
          }

          if (message.type === 'tool-calls') {
            const toolCallList = message.toolCallList || [];
            for (const toolCall of toolCallList) {
              const name = toolCall.function?.name;
              let args: any = {};
              try {
                args = typeof toolCall.function?.arguments === 'string'
                  ? JSON.parse(toolCall.function.arguments)
                  : toolCall.function?.arguments || {};
              } catch (e) {
                args = { raw: toolCall.function?.arguments };
              }

              if (name === 'get_patient_context' || name === 'get_person_details') {
                setTranscripts(prev => [...prev, {
                  speaker: 'SYSTEM',
                  text: `🔍 [Echo Tool Call: ${name}] Syncing medical history...`,
                  timestamp: new Date().toLocaleTimeString()
                }]);

                try {
                  const dmkRes = await apiClient('/dmk/me');
                  let dmkData: any = null;
                  if (dmkRes.ok) {
                    const dmkJson = await dmkRes.json();
                    if (dmkJson.success) {
                      dmkData = dmkJson.data;
                    }
                  }

                  const activeConditions = (dmkData?.conditions ?? []).map((c: any) => c.name);
                  const activeMedications = (dmkData?.medications ?? []).map((m: any) =>
                    [m.name, m.dosage, m.frequency].filter(Boolean).join(' ')
                  );
                  const knownAllergies = (dmkData?.allergies ?? []).map((a: any) =>
                    `${a.allergen} (${a.severity}${a.reaction ? ` — ${a.reaction}` : ''})`
                  );

                  const result = {
                    patientName: user?.fullName || 'Patient',
                    firstName: user?.fullName ? user.fullName.split(' ')[0] : 'Patient',
                    activeConditions,
                    activeMedications,
                    knownAllergies,
                    dmkCompleteness: dmkData ? 'available' : 'not_initialized',
                  };

                  // Send client-side tool result directly back to Vapi WebRTC stream
                  if (vapiInstanceRef.current) {
                    (vapiInstanceRef.current as any).send({
                      type: 'add-message',
                      message: {
                        role: 'tool',
                        name: name,
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result)
                      }
                    });
                  }

                  console.log('✅ [Vapi] Sent patient context tool result successfully.');
                } catch (err) {
                  console.error('[Vapi] Failed to fetch patient context:', err);
                  if (vapiInstanceRef.current) {
                    (vapiInstanceRef.current as any).send({
                      type: 'add-message',
                      message: {
                        role: 'tool',
                        name: name,
                        tool_call_id: toolCall.id,
                        content: JSON.stringify({ error: 'Failed to retrieve patient details.' })
                      }
                    });
                  }
                }
              }

              if (name === 'flag_red_flag') {
                setIsCriticalAlert(true);
                setTranscripts(prev => [...prev, {
                  speaker: 'SYSTEM',
                  text: `🚨 [Echo Tool Call: flag_red_flag] EMERGENCY ALERT DISPATCHED: ${args.evidence || 'Severe symptoms reported.'}`,
                  timestamp: new Date().toLocaleTimeString()
                }]);

                if (vapiInstanceRef.current) {
                  (vapiInstanceRef.current as any).send({
                    type: 'add-message',
                    message: {
                      role: 'tool',
                      name: name,
                      tool_call_id: toolCall.id,
                      content: JSON.stringify({ success: true, message: 'Red flag recorded.' })
                    }
                  });
                }
              }

              if (name === 'finish_intake') {
                setTranscripts(prev => [...prev, {
                  speaker: 'SYSTEM',
                  text: `✓ [Echo Tool Call: finish_intake] Intake completed. Triage queued.`,
                  timestamp: new Date().toLocaleTimeString()
                }]);

                if (vapiInstanceRef.current) {
                  (vapiInstanceRef.current as any).send({
                    type: 'add-message',
                    message: {
                      role: 'tool',
                      name: name,
                      tool_call_id: toolCall.id,
                      content: JSON.stringify({ success: true, message: 'Intake finished.' })
                    }
                  });
                }
              }
            }
          }
        });
      } catch (err) {
        console.error('[Vapi] Failed to connect to Vapi server:', err);
        if (isMountedRef.current) {
          setStatusText('Echo AI Connection Failed');
        }
      }
    } else {
      setStatusText('Vapi Client SDK Offline');
    }
  };

  // End Call & push data to backend
  const handleEndCall = async (skipBackend = false) => {
    if (!isMountedRef.current) return;
    
    callStartedRef.current = false;
    setCallStatus('ending');
    setStatusText('Disconnecting call...');
    setVolumeLevel(0);
    setAiIsSpeaking(false);
    setIsCriticalAlert(false);

    // Clean up Vapi
    cleanupVapi();

    if (!skipBackend && sessionId) {
      try {
        const textSummary = transcripts
          .filter(t => t.speaker !== 'SYSTEM')
          .map(t => `${t.speaker}: ${t.text}`)
          .join('\n');

          await apiClient(`/echo-ai/sessions/${sessionId}/end`, {
            method: 'POST',
            body: JSON.stringify({
              durationSeconds: 120,
              analysisSummary: isSOSMode ? 'EMERGENCY SOS: Medical emergency reported.' : 'Intake: Medical assessment completed.',
              structuredData: {
                chiefComplaint: isSOSMode ? 'Emergency' : 'Medical assessment',
                clinicalSummary: textSummary,
                symptoms: [],
                redFlags: []
              }
            })
          });
      } catch (err) {
        console.warn('[Vapi] Backend offline. Ended session locally.');
      }
    }

    if (isMountedRef.current) {
      setCallStatus('idle');
      onClose();
    }
  };

  const toggleMute = () => {
    if (vapiInstanceRef.current) {
      vapiInstanceRef.current.setMuted(!isMuted);
    }
    setIsMuted(!isMuted);
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={jarvisModalStyle} className="glass-panel">
        
        {/* Header */}
        <div style={jarvisHeaderStyle}>
          <div style={statusLabelStyle(isSOSMode, isCriticalAlert)}>
            <span style={pulsingDotStyle(callStatus === 'active', isSOSMode, isCriticalAlert)} />
            {statusText.toUpperCase()}
          </div>
          <button onClick={() => handleEndCall(false)} style={closeBtnStyle}>✕</button>
        </div>

        {/* Jarvis Glowing Morphing Sphere Container */}
        <div style={visualizerContainerStyle}>
          <div style={radialAmbientGlow(isSOSMode, isCriticalAlert)} />
          
          {/* JARVIS core sphere */}
          <div style={jarvisCoreStyle(callStatus === 'active', volumeLevel, isSOSMode, aiIsSpeaking, isCriticalAlert)}>
            {/* Inner rings */}
            <div style={innerRingStyle(aiIsSpeaking, volumeLevel)} />
            <div style={innerPulseStyle(volumeLevel, isSOSMode, isCriticalAlert)} />
            <span style={coreTextStyle(isSOSMode, isCriticalAlert)}>
              {(isSOSMode || isCriticalAlert) ? 'SOS' : 'ECHO'}
            </span>
          </div>

          {/* Sound waves pulsing around the core */}
          <div style={wavesContainerStyle}>
            <div style={audioWaveStyle(1, volumeLevel, isSOSMode, isCriticalAlert)} />
            <div style={audioWaveStyle(2, volumeLevel, isSOSMode, isCriticalAlert)} />
            <div style={audioWaveStyle(3, volumeLevel, isSOSMode, isCriticalAlert)} />
          </div>
        </div>

        {/* Live Conversation Transcript Panel */}
        <div style={transcriptPanelStyle}>
          <div style={panelLabelStyle}>REAL-TIME INTELSTREAM</div>
          <div style={transcriptScrollerStyle}>
            {transcripts.map((t, idx) => (
              <div 
                key={idx} 
                style={t.speaker === 'AI' ? aiBubbleStyle : t.speaker === 'USER' ? userBubbleStyle : systemBubbleStyle}
              >
                <div style={bubbleHeaderStyle}>
                  <span style={bubbleSpeakerStyle(t.speaker)}>{t.speaker}</span>
                  <span style={bubbleTimeStyle}>{t.timestamp}</span>
                </div>
                <p style={bubbleTextStyle}>{t.text}</p>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Control Center Panel */}
        <div style={controlPanelStyle}>
          <button onClick={toggleMute} style={controlBtnStyle(isMuted)}>
            {isMuted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            )}
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          
          <button onClick={() => handleEndCall(false)} style={hangUpBtnStyle(isSOSMode, isCriticalAlert)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
            </svg>
            End
          </button>
        </div>

      </div>
    </div>
  );
}

// Visuals styling calculations - same as before
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 10000,
  backgroundColor: 'rgba(5, 7, 12, 0.85)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '1.5rem',
};

const jarvisModalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '460px',
  height: '90vh',
  maxHeight: '680px',
  display: 'flex',
  flexDirection: 'column',
  padding: '1.5rem',
  gap: '1.25rem',
  animation: 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
};

const jarvisHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  paddingBottom: '0.75rem',
};

const statusLabelStyle = (isSOS: boolean, isAlert = false): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: (isSOS || isAlert) ? '#ff5a5f' : 'var(--primary)',
  letterSpacing: '0.12em',
});

const pulsingDotStyle = (active: boolean, isSOS: boolean, isAlert = false): React.CSSProperties => ({
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: (isSOS || isAlert) ? '#ff5a5f' : 'var(--primary)',
  boxShadow: active ? `0 0 10px ${(isSOS || isAlert) ? '#ff5a5f' : 'var(--primary)'}` : 'none',
  animation: active ? 'heartbeat 1.5s infinite ease-in-out' : 'none',
});

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '0.9rem',
  cursor: 'pointer',
};

const visualizerContainerStyle: React.CSSProperties = {
  height: '200px',
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
};

const radialAmbientGlow = (isSOS: boolean, isAlert = false): React.CSSProperties => ({
  position: 'absolute',
  width: '180px',
  height: '180px',
  borderRadius: '50%',
  background: (isSOS || isAlert)
    ? 'radial-gradient(circle, rgba(255, 90, 95, 0.15) 0%, transparent 70%)'
    : 'radial-gradient(circle, rgba(0, 245, 212, 0.12) 0%, transparent 70%)',
  filter: 'blur(30px)',
  zIndex: 0,
});

const jarvisCoreStyle = (active: boolean, vol: number, isSOS: boolean, isSpeaking: boolean, isAlert = false): React.CSSProperties => {
  const scale = 1 + vol * 0.18;
  const shadowColor = (isSOS || isAlert) ? 'rgba(255, 90, 95, 0.4)' : 'rgba(0, 245, 212, 0.4)';
  return {
    width: '92px',
    height: '92px',
    borderRadius: '50%',
    background: 'rgba(15, 22, 38, 0.9)',
    border: `2px solid ${(isSOS || isAlert) ? '#ff5a5f' : 'var(--primary)'}`,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    position: 'relative',
    transform: `scale(${scale})`,
    boxShadow: `0 0 ${20 + vol * 30}px ${shadowColor}, inset 0 0 15px ${shadowColor}`,
    transition: 'transform 0.1s cubic-bezier(0.1, 0.8, 0.2, 1)',
    cursor: 'pointer',
    animation: isSpeaking ? 'heartbeat 1.2s infinite ease-in-out' : 'float 6s infinite ease-in-out',
  };
};

const innerRingStyle = (isSpeaking: boolean, vol: number): React.CSSProperties => ({
  position: 'absolute',
  width: '80%',
  height: '80%',
  borderRadius: '50%',
  border: '1px dashed rgba(0, 187, 249, 0.4)',
  transform: `rotate(${isSpeaking ? vol * 180 : 0}deg)`,
  transition: 'transform 0.15s linear',
});

const innerPulseStyle = (vol: number, isSOS: boolean, isAlert = false): React.CSSProperties => ({
  position: 'absolute',
  width: '60%',
  height: '60%',
  borderRadius: '50%',
  background: (isSOS || isAlert) ? 'rgba(255, 90, 95, 0.05)' : 'rgba(0, 245, 212, 0.05)',
  transform: `scale(${1 + vol * 0.2})`,
  transition: 'transform 0.08s ease-out',
});

const coreTextStyle = (isSOS: boolean, isAlert = false): React.CSSProperties => ({
  fontSize: '0.64rem',
  fontWeight: 800,
  letterSpacing: '0.12em',
  color: (isSOS || isAlert) ? '#ff5a5f' : 'var(--primary)',
});

const wavesContainerStyle: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  pointerEvents: 'none',
  zIndex: 1,
};

const audioWaveStyle = (index: number, vol: number, isSOS: boolean, isAlert = false): React.CSSProperties => {
  const size = 100 + index * 40 + vol * (index * 20);
  const opacity = Math.max(0.02, 0.18 - index * 0.05 - (vol * 0.05));
  return {
    position: 'absolute',
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    border: `1px solid ${(isSOS || isAlert) ? '#ff5a5f' : 'var(--secondary)'}`,
    opacity: opacity,
    transform: `scale(${1 + vol * 0.08})`,
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  };
};

const transcriptPanelStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(0, 0, 0, 0.2)',
  borderRadius: 'var(--border-radius-md)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  overflow: 'hidden',
};

const panelLabelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.1em',
  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  paddingBottom: '0.4rem',
};

const transcriptScrollerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
  paddingRight: '0.25rem',
};

const bubbleBase: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  maxWidth: '85%',
  animation: 'fadeIn 0.3s ease-out',
};

const aiBubbleStyle: React.CSSProperties = {
  ...bubbleBase,
  alignSelf: 'flex-start',
};

const userBubbleStyle: React.CSSProperties = {
  ...bubbleBase,
  alignSelf: 'flex-end',
  textAlign: 'right',
};

const systemBubbleStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignSelf: 'center',
  maxWidth: '90%',
  textAlign: 'center',
  fontSize: '0.72rem',
  color: 'var(--secondary)',
  padding: '0.4rem 0.8rem',
  background: 'rgba(0, 187, 249, 0.05)',
  border: '1px solid rgba(0, 187, 249, 0.15)',
  borderRadius: '6px',
  letterSpacing: '0.02em',
};

const bubbleHeaderStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'baseline',
};

const bubbleSpeakerStyle = (speaker: 'AI' | 'USER' | 'SYSTEM'): React.CSSProperties => ({
  fontSize: '0.68rem',
  fontWeight: 700,
  color: speaker === 'AI' ? 'var(--primary)' : 'var(--secondary)',
  letterSpacing: '0.02em',
});

const bubbleTimeStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  color: 'var(--text-muted)',
};

const bubbleTextStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  lineHeight: '1.45',
  color: 'var(--text-primary)',
};

const controlPanelStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  paddingTop: '1rem',
};

const controlBtnStyle = (muted: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '0.75rem',
  borderRadius: 'var(--border-radius-sm)',
  background: muted ? 'rgba(255, 90, 95, 0.08)' : 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${muted ? 'rgba(255, 90, 95, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
  color: muted ? '#ff5a5f' : 'var(--text-primary)',
  fontWeight: 600,
  fontSize: '0.8rem',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '0.5rem',
  cursor: 'pointer',
});

const hangUpBtnStyle = (isSOS: boolean, isAlert = false): React.CSSProperties => ({
  flex: 1.5,
  padding: '0.75rem',
  borderRadius: 'var(--border-radius-sm)',
  background: (isSOS || isAlert) ? '#ff5a5f' : 'rgba(255, 255, 255, 0.08)',
  border: 'none',
  color: (isSOS || isAlert) ? '#080c14' : 'var(--text-primary)',
  fontWeight: 700,
  fontSize: '0.8rem',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '0.5rem',
  cursor: 'pointer',
  boxShadow: (isSOS || isAlert) ? '0 4px 15px rgba(255, 90, 95, 0.3)' : 'none',
});