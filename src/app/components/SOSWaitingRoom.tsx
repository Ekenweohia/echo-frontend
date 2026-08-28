'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/apiClient';

interface SOSWaitingRoomProps {
  onDoctorJoined: (consultationId: string) => void;
  onCancel: () => void;
}

export default function SOSWaitingRoom({ onDoctorJoined, onCancel }: SOSWaitingRoomProps) {
  const [status, setStatus] = useState<'triggering' | 'waiting' | 'error'>('triggering');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;
    let isMounted = true;

    const triggerSOS = async () => {
      try {
        const res = await apiClient('/echo-ai/sos', { method: 'POST' });
        if (!res.ok) {
          throw new Error('Failed to trigger SOS');
        }
        if (isMounted) {
          setStatus('waiting');
          startPolling();
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err.message || 'An error occurred triggering the SOS alert.');
        }
      }
    };

    const startPolling = () => {
      pollingInterval = setInterval(async () => {
        try {
          const res = await apiClient('/consultations/live', { method: 'GET' });
          if (res.ok) {
            const json = await res.json();
            if (json.data && json.data.status === 'ACTIVE' && json.data.id) {
              clearInterval(pollingInterval);
              if (isMounted) {
                onDoctorJoined(json.data.id);
              }
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    };

    triggerSOS();

    return () => {
      isMounted = false;
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [onDoctorJoined]);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle} className="glass-panel">
        {status === 'triggering' && (
          <div style={contentStyle}>
            <div style={spinnerStyle}>🚨</div>
            <h2 style={titleStyle}>Triggering SOS...</h2>
            <p style={subtitleStyle}>Alerting available doctors immediately.</p>
          </div>
        )}

        {status === 'waiting' && (
          <div style={contentStyle}>
            <div style={{ ...spinnerStyle, animation: 'pulse 1.5s infinite' }}>🚨</div>
            <h2 style={titleStyle}>SOS Alert Sent</h2>
            <p style={subtitleStyle}>Please hold. A doctor is being routed to you and will open a video room momentarily.</p>
          </div>
        )}

        {status === 'error' && (
          <div style={contentStyle}>
            <div style={spinnerStyle}>❌</div>
            <h2 style={titleStyle}>SOS Failed</h2>
            <p style={subtitleStyle}>{errorMessage}</p>
            <button onClick={onCancel} style={cancelBtnStyle}>Go Back</button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px',
  background: 'rgba(30, 5, 5, 0.9)',
  backdropFilter: 'blur(8px)'
};

const modalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '400px',
  background: '#1a0505',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: 16,
  boxShadow: '0 28px 80px rgba(239, 68, 68, 0.2)',
  padding: '40px 24px',
  textAlign: 'center'
};

const contentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px'
};

const spinnerStyle: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: '8px'
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '24px',
  color: '#fca5a5',
  fontWeight: 'bold'
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '15px',
  color: '#f87171',
  lineHeight: 1.5
};

const cancelBtnStyle: React.CSSProperties = {
  marginTop: '24px',
  padding: '10px 24px',
  background: 'transparent',
  border: '1px solid #fca5a5',
  color: '#fca5a5',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 600
};
