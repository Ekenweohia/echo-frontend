'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing health systems...');
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Status message simulation
  useEffect(() => {
    const statusSteps = [
      { threshold: 0, text: 'Initializing health core...' },
      { threshold: 25, text: 'Securing HIPAA-compliant gateway...' },
      { threshold: 50, text: 'Connecting to patient records database...' },
      { threshold: 75, text: 'Syncing real-time vital streams...' },
      { threshold: 90, text: 'Preparing medical workspace...' },
      { threshold: 100, text: 'System Ready' }
    ];

    const currentStep = statusSteps
      .reverse()
      .find((step) => progress >= step.threshold);
    
    if (currentStep) {
      setStatusText(currentStep.text);
    }
  }, [progress]);

  // Progress bar simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        // Random incremental updates to feel like real loading
        const increment = Math.floor(Math.random() * 12) + 5;
        return Math.min(prev + increment, 100);
      });
    }, 250);

    return () => clearInterval(timer);
  }, []);

  // Handle completion fadeout transition
  useEffect(() => {
    if (progress === 100) {
      const fadeTimeout = setTimeout(() => {
        setIsFadingOut(true);
        const completeTimeout = setTimeout(() => {
          onComplete();
        }, 800); // Matches the CSS transition duration
        return () => clearTimeout(completeTimeout);
      }, 500); // Keep full bar visible briefly
      return () => clearTimeout(fadeTimeout);
    }
  }, [progress, onComplete]);

  return (
    <div style={containerStyle(isFadingOut)}>
      {/* Background Orbs */}
      <div className="glow-orb glow-orb-primary" />
      <div className="glow-orb glow-orb-secondary" />

      <div style={contentStyle}>
        
        <div style={logoWrapperStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <img src="/assets/emergencyecho.png" alt="EmergencyEcho Logo" style={{ height: '70px', objectFit: 'contain', animation: 'float 3s infinite ease-in-out' }} />
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>EmergencyEcho</h1>
          </div>
        </div>

        {/* EKG / Heartbeat Animated SVG Trace */}
        <div style={pulseContainerStyle}>
          <svg 
            width="400" 
            height="100" 
            viewBox="0 0 400 100" 
            style={{ width: '100%', maxWidth: '400px' }}
          >
            {/* Background faint pulse path */}
            <path
              d="M 10,50 L 120,50 L 130,30 L 140,80 L 155,20 L 165,60 L 175,50 L 220,50 L 230,35 L 238,65 L 246,25 L 254,75 L 262,45 L 270,50 L 390,50"
              fill="none"
              stroke="rgba(0, 245, 212, 0.08)"
              strokeWidth="2"
            />
            {/* Foreground animated heartbeat line */}
            <path
              d="M 10,50 L 120,50 L 130,30 L 140,80 L 155,20 L 165,60 L 175,50 L 220,50 L 230,35 L 238,65 L 246,25 L 254,75 L 262,45 L 270,50 L 390,50"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1000"
              strokeDashoffset="1000"
              style={{
                animation: 'drawStroke 4s linear infinite',
              }}
            />
          </svg>
        </div>

        {/* Progress & Info Container */}
        <div style={progressCardStyle}>
          <div style={statusWrapperStyle}>
            <span style={statusTextStyle}>{statusText}</span>
            <span style={percentageTextStyle}>{progress}%</span>
          </div>
          
          <div style={progressBarBgStyle}>
            <div style={progressBarFillStyle(progress)} />
          </div>

          <div style={securityBadgeStyle}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            256-bit Encrypted Connection Active
          </div>
        </div>

      </div>
    </div>
  );
}

// Inline Styles for detailed layout control
const containerStyle = (isFadingOut: boolean): React.CSSProperties => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'var(--bg-base)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999,
  opacity: isFadingOut ? 0 : 1,
  transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
  transform: isFadingOut ? 'scale(1.03)' : 'scale(1)',
  overflow: 'hidden',
});

const contentStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '90%',
  maxWidth: '480px',
  animation: 'fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
};

const logoWrapperStyle: React.CSSProperties = {
  marginBottom: '2rem',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
};

const placeholderBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '260px',
  height: '240px',
  padding: '1.5rem',
  borderRadius: '20px',
  background: 'rgba(15, 22, 38, 0.7)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '2px dashed rgba(0, 245, 212, 0.3)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 15px rgba(0, 245, 212, 0.05)',
  textAlign: 'center',
  animation: 'pulseGlow 4s infinite ease-in-out',
};

const placeholderIconWrapperStyle: React.CSSProperties = {
  width: '72px',
  height: '72px',
  borderRadius: '50%',
  background: 'rgba(0, 245, 212, 0.06)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: '1rem',
  border: '1px solid rgba(0, 245, 212, 0.15)',
};

const placeholderLabelStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 700,
  letterSpacing: '0.15em',
  color: 'var(--primary)',
  marginBottom: '0.5rem',
};

const placeholderHelpTextStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.4',
};

const pulseContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '80px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: '2rem',
};

const progressCardStyle: React.CSSProperties = {
  width: '100%',
  padding: '1.5rem',
  borderRadius: 'var(--border-radius-lg)',
  background: 'rgba(22, 32, 53, 0.4)',
  border: '1px solid rgba(255, 255, 255, 0.04)',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const statusWrapperStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const statusTextStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  color: 'var(--text-secondary)',
  fontWeight: 500,
  letterSpacing: '0.01em',
};

const percentageTextStyle: React.CSSProperties = {
  fontSize: '0.88rem',
  fontWeight: 600,
  color: 'var(--primary)',
  fontVariantNumeric: 'tabular-nums',
};

const progressBarBgStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  background: 'rgba(255, 255, 255, 0.06)',
  overflow: 'hidden',
  position: 'relative',
};

const progressBarFillStyle = (width: number): React.CSSProperties => ({
  height: '100%',
  width: `${width}%`,
  borderRadius: '3px',
  background: 'linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%)',
  boxShadow: '0 0 10px rgba(0, 245, 212, 0.5)',
  transition: 'width 0.25s ease-out',
});

const securityBadgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.35rem',
  fontSize: '0.68rem',
  color: 'var(--text-muted)',
  letterSpacing: '0.02em',
  marginTop: '0.2rem',
};
