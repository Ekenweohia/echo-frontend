'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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

interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
}

const ILLNESS_SYSTEM_PROMPTS: Record<string, string> = {
  diabetes: 'You are Echo, a clinical AI assistant. The patient wants to discuss diabetes — symptoms, management, blood sugar, insulin, diet, and lifestyle. Be empathetic, clear, and always recommend consulting a real doctor for diagnosis.',
  hypertension: 'You are Echo, a clinical AI assistant. The patient wants to discuss hypertension — blood pressure management, medications, lifestyle changes, salt intake, and stress. Be empathetic and helpful.',
  asthma: 'You are Echo, a clinical AI assistant. The patient wants to discuss asthma — triggers, inhalers, breathing exercises, and emergency protocols. Be empathetic and clear.',
  malaria: 'You are Echo, a clinical AI assistant. The patient wants to discuss malaria — symptoms, treatment, prevention, and when to seek emergency care. Be thorough and empathetic.',
  typhoid: 'You are Echo, a clinical AI assistant. The patient wants to discuss typhoid fever — symptoms, antibiotic treatment, hydration, and prevention. Be helpful and clear.',
  fever: 'You are Echo, a clinical AI assistant. The patient is experiencing fever. Help assess severity, recommend home care, and advise when to seek emergency care.',
  chest_pain: 'You are Echo, a clinical AI assistant. The patient has chest pain concerns. Take this seriously — help them assess whether it is an emergency, and guide them appropriately.',
  headache: 'You are Echo, a clinical AI assistant. The patient wants to discuss headaches — tension, migraine, cluster types, triggers, and treatments.',
  'baby-sick': 'You are Echo, a clinical AI assistant. The patient is concerned about a sick baby or child. Be extra careful, empathetic, and thorough about pediatric symptoms.',
  injury: 'You are Echo, a clinical AI assistant. The patient has an injury concern. Help assess severity, first aid, and when to seek immediate care.',
  elderly: 'You are Echo, a clinical AI assistant. The patient is seeking advice for elderly care — fall prevention, chronic disease management, medication safety, and cognitive health.',
  seizure: 'You are Echo, a clinical AI assistant. The patient wants to discuss seizures — types, triggers, first aid, medications, and when to call emergency services.',
  emergency: 'You are Echo, a clinical AI assistant. The patient may have a medical emergency. Be calm, clear, and direct. Help them assess the situation and call for help if needed.',
  general: 'You are Echo, a clinical AI assistant. You help patients understand their symptoms, medical conditions, and general health questions. Always recommend consulting a real doctor for diagnosis and treatment.',
};

export default function TextChat({ isOpen, onClose, illnessTag, illnessTitle = 'Medical Chat', illnessColor = '#00f5d4', illnessIcon = '🩺' }: TextChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat session when opened
  useEffect(() => {
    if (!isOpen) return;
    setMessages([]);
    setSessionId(null);
    setSessionInitialized(false);
    initSession();
  }, [isOpen, illnessTag]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const initSession = async () => {
    let sid = `text-session-${Math.random().toString(36).substring(4)}`;

    // Try to create a backend session
    try {
      const response = await apiClient('/echo-ai/sessions', {
        method: 'POST',
        body: JSON.stringify({
          language: 'en',
          isSOS: false,
          sessionType: 'TEXT_CHAT',
          illnessTag,
        })
      });
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data?.id) sid = json.data.id;
      }
    } catch {
      // offline – use generated ID
    }

    if (!isMountedRef.current) return;
    setSessionId(sid);
    setSessionInitialized(true);

    // Greeting from Echo AI
    const greeting = `Hello! I'm **Echo**, your clinical AI assistant. I'm here to help you with questions about **${illnessTitle}**.\n\nPlease remember: I provide general health information only. Always consult a qualified doctor for diagnosis and treatment.\n\nHow can I help you today?`;
    appendMessage('ai', greeting);
  };

  const appendMessage = (role: 'user' | 'ai' | 'system', text: string) => {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(4)}`,
      role,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, msg]);
  };

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading || !sessionInitialized) return;

    setInputText('');
    appendMessage('user', text);
    setIsLoading(true);

    const systemPrompt = ILLNESS_SYSTEM_PROMPTS[illnessTag] || ILLNESS_SYSTEM_PROMPTS.general;

    try {
      // Attempt Vapi text endpoint
      const response = await apiClient('/echo-ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          message: text,
          illnessTag,
          systemPrompt,
        })
      });

      if (response.ok) {
        const json = await response.json();
        const aiText = json.data?.message || json.data?.response || json.message || 'I understand. Could you tell me more?';
        if (isMountedRef.current) appendMessage('ai', aiText);
      } else {
        throw new Error('API returned non-ok status');
      }
    } catch {
      // Smart offline fallback responses
      const fallback = generateFallbackResponse(illnessTag, text);
      if (isMountedRef.current) appendMessage('ai', fallback);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [inputText, isLoading, sessionInitialized, sessionId, illnessTag]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={chatModalStyle} className="glass-panel text-chat-modal">
        {/* Header */}
        <div style={chatHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ ...iconCircleStyle, background: illnessColor + '22', border: `1.5px solid ${illnessColor}44`, color: illnessColor }}>
              {illnessIcon}
            </div>
            <div>
              <div style={chatTitleStyle}>Echo AI — {illnessTitle}</div>
              <div style={chatSubtitleStyle}>
                <span style={{ ...onlineDotStyle, background: sessionInitialized ? '#22c55e' : '#f59e0b' }} />
                {sessionInitialized ? 'Connected · Clinical AI' : 'Connecting...'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={closeButtonStyle} title="Close chat">✕</button>
        </div>

        {/* Disclaimer Banner */}
        <div style={disclaimerBannerStyle}>
          ⚠️ For informational purposes only. Not a substitute for professional medical advice.
        </div>

        {/* Messages */}
        <div style={messagesContainerStyle}>
          {messages.map(msg => (
            <div key={msg.id} style={messageRowStyle(msg.role)}>
              {msg.role === 'ai' && (
                <div style={aiBubbleAvatarStyle}>E</div>
              )}
              <div style={bubbleWrapStyle(msg.role)}>
                <div style={bubbleStyle(msg.role, illnessColor)}>
                  {renderMessageText(msg.text)}
                </div>
                <div style={timestampStyle(msg.role)}>{msg.timestamp}</div>
              </div>
              {msg.role === 'user' && (
                <div style={userBubbleAvatarStyle}>
                  {user?.fullName?.charAt(0) || 'P'}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div style={messageRowStyle('ai')}>
              <div style={aiBubbleAvatarStyle}>E</div>
              <div style={{ ...bubbleStyle('ai', illnessColor), padding: '0.75rem 1.1rem' }}>
                <div style={typingDotsStyle}>
                  <span style={dotStyle(0)} />
                  <span style={dotStyle(1)} />
                  <span style={dotStyle(2)} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={inputAreaStyle}>
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${illnessTitle}... (Enter to send)`}
            style={textInputStyle}
            rows={1}
            disabled={!sessionInitialized || isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading || !sessionInitialized}
            style={sendButtonStyle(illnessColor, !inputText.trim() || isLoading || !sessionInitialized)}
            title="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function renderMessageText(text: string) {
  // Simple markdown-like bold renderer
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
      )}
    </span>
  );
}

function generateFallbackResponse(tag: string, userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('symptom') || lower.includes('feel') || lower.includes('pain')) {
    return `Based on what you've described, these are common concerns related to **${tag}**. While I can provide general information, it's important to consult a licensed physician for a proper evaluation.\n\nCan you describe your symptoms in more detail? For example, how long have you been experiencing this, and how severe would you rate it on a scale of 1–10?`;
  }
  if (lower.includes('treatment') || lower.includes('medicine') || lower.includes('drug')) {
    return `Treatment options vary based on individual patient profiles. For **${tag}**, common approaches may include lifestyle modifications, medications prescribed by a doctor, and regular monitoring.\n\n**Important:** Never self-medicate. Always consult your doctor before starting any treatment.`;
  }
  if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('help')) {
    return `🚨 If this is a medical emergency, please **call emergency services immediately** or use the SOS button on your dashboard.\n\nFor urgent but non-life-threatening concerns, visit your nearest clinic or hospital as soon as possible.`;
  }
  return `Thank you for your message. Regarding **${tag}**, this is an area where getting personalized advice from a healthcare professional is very important.\n\nI can help you understand general information, common symptoms, or how to prepare for a doctor's visit. What specific aspect would you like to know more about?`;
}

// Styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(5, 10, 20, 0.75)',
  backdropFilter: 'blur(8px)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  padding: 0,
  animation: 'fadeIn 0.2s ease',
};

const chatModalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '620px',
  height: '88vh',
  maxHeight: '720px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  borderRadius: '20px 20px 0 0',
  border: '1px solid rgba(255,255,255,0.08)',
  borderBottom: 'none',
  background: 'rgba(10, 15, 28, 0.98)',
  animation: 'slideUp 0.25s ease',
};

const chatHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 1.25rem',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  flexShrink: 0,
  gap: '0.5rem',
};

const iconCircleStyle: React.CSSProperties = {
  width: '42px',
  height: '42px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.3rem',
  flexShrink: 0,
};

const chatTitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const chatSubtitleStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--text-muted)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  marginTop: '2px',
};

const onlineDotStyle: React.CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  display: 'inline-block',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  color: 'var(--text-muted)',
  width: '32px',
  height: '32px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.85rem',
  flexShrink: 0,
  transition: 'background 0.2s',
};

const disclaimerBannerStyle: React.CSSProperties = {
  background: 'rgba(245, 158, 11, 0.08)',
  borderBottom: '1px solid rgba(245, 158, 11, 0.12)',
  padding: '0.5rem 1.5rem',
  fontSize: '0.68rem',
  color: '#f59e0b',
  fontWeight: 500,
  flexShrink: 0,
};

const messagesContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(255,255,255,0.08) transparent',
};

const messageRowStyle = (role: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'flex-end',
  gap: '0.65rem',
  flexDirection: role === 'user' ? 'row-reverse' : 'row',
  animation: 'fadeIn 0.2s ease',
});

const bubbleWrapStyle = (role: string): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: role === 'user' ? 'flex-end' : 'flex-start',
  maxWidth: '75%',
});

const bubbleStyle = (role: string, color: string): React.CSSProperties => ({
  padding: '0.75rem 1.1rem',
  borderRadius: role === 'ai' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
  background: role === 'user'
    ? `linear-gradient(135deg, ${color}cc, ${color}88)`
    : 'rgba(255,255,255,0.06)',
  border: role === 'ai' ? '1px solid rgba(255,255,255,0.07)' : 'none',
  color: role === 'user' ? '#0a0f1c' : 'var(--text-primary)',
  fontSize: '0.86rem',
  lineHeight: 1.55,
  wordBreak: 'break-word',
});

const timestampStyle = (role: string): React.CSSProperties => ({
  fontSize: '0.62rem',
  color: 'var(--text-muted)',
  marginTop: '4px',
  paddingRight: role === 'ai' ? '0' : '0.25rem',
});

const aiBubbleAvatarStyle: React.CSSProperties = {
  width: '30px',
  height: '30px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #00f5d4, #6366f1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.72rem',
  fontWeight: 800,
  color: '#080c14',
  flexShrink: 0,
};

const userBubbleAvatarStyle: React.CSSProperties = {
  width: '30px',
  height: '30px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.72rem',
  fontWeight: 800,
  color: '#fff',
  flexShrink: 0,
};

const typingDotsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  alignItems: 'center',
  height: '16px',
};

const dotStyle = (i: number): React.CSSProperties => ({
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: 'var(--text-muted)',
  animation: `typingBounce 1.2s ${i * 0.2}s infinite ease-in-out`,
});

const inputAreaStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  padding: '1rem 1.25rem',
  borderTop: '1px solid rgba(255,255,255,0.06)',
  alignItems: 'flex-end',
  background: 'rgba(5,10,20,0.5)',
  flexShrink: 0,
};

const textInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '0.65rem 0.9rem',
  color: 'var(--text-primary)',
  fontSize: '1rem',   /* 16px+ prevents iOS auto-zoom */
  outline: 'none',
  resize: 'none',
  fontFamily: 'inherit',
  lineHeight: 1.5,
  maxHeight: '120px',
  transition: 'border-color 0.2s',
};

const sendButtonStyle = (color: string, disabled: boolean): React.CSSProperties => ({
  width: '42px',
  height: '42px',
  borderRadius: '12px',
  background: disabled ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${color}, ${color}aa)`,
  border: 'none',
  color: disabled ? 'var(--text-muted)' : '#080c14',
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  flexShrink: 0,
});
