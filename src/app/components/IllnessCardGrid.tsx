'use client';

import React from 'react';

export interface IllnessItem {
  tag: string;
  title: string;
  icon: string;
  color: string;
  description?: string;
}

export const ILLNESS_LIST: IllnessItem[] = [
  { tag: 'emergency',   title: 'Emergency',    icon: '🚨', color: '#ef4444', description: 'Acute emergencies & critical symptoms' },
  { tag: 'chest_pain',  title: 'Chest Pain',   icon: '❤️‍🩹', color: '#f97316', description: 'Chest tightness, pressure, discomfort' },
  { tag: 'headache',    title: 'Headache',     icon: '🧠', color: '#eab308', description: 'Migraines, tension headaches & clusters' },
  { tag: 'fever',       title: 'Fever',        icon: '🌡️', color: '#3b82f6', description: 'High temperature, chills & body aches' },
  { tag: 'baby-sick',   title: 'Baby / Child', icon: '👶', color: '#22c55e', description: 'Paediatric symptoms & childcare' },
  { tag: 'injury',      title: 'Injury',       icon: '🩹', color: '#f59e0b', description: 'Cuts, sprains, fractures & first aid' },
  { tag: 'diabetes',    title: 'Diabetes',     icon: '💉', color: '#8b5cf6', description: 'Blood sugar, insulin & lifestyle' },
  { tag: 'hypertension',title: 'Hypertension', icon: '🩺', color: '#ec4899', description: 'Blood pressure, medications & diet' },
  { tag: 'asthma',      title: 'Asthma',       icon: '💨', color: '#06b6d4', description: 'Breathing difficulties & inhalers' },
  { tag: 'malaria',     title: 'Malaria',      icon: '🦟', color: '#84cc16', description: 'Fever, prevention & treatment' },
  { tag: 'seizure',     title: 'Seizure',      icon: '⚡', color: '#f43f5e', description: 'Epilepsy, triggers & first aid' },
  { tag: 'elderly',     title: 'Elderly Care', icon: '🧓', color: '#a78bfa', description: 'Senior health, falls & chronic illness' },
];

interface IllnessCardGridProps {
  onSelectIllness: (item: IllnessItem) => void;
}

export default function IllnessCardGrid({ onSelectIllness }: IllnessCardGridProps) {
  return (
    <div style={sectionStyle}>
      <div style={headerRowStyle}>
        <div>
          <h3 style={sectionTitleStyle}>Quick Health Categories</h3>
          <p style={sectionSubStyle}>Select a topic to start an AI-powered health chat</p>
        </div>
        <div style={poweredBadgeStyle}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          Powered by Echo AI
        </div>
      </div>

      <div style={gridStyle} className="illness-card-grid">
        {ILLNESS_LIST.map(item => (
          <IllnessCard key={item.tag} item={item} onClick={() => onSelectIllness(item)} />
        ))}
      </div>
    </div>
  );
}

function IllnessCard({ item, onClick }: { item: IllnessItem; onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={cardStyle(item.color, hovered)}
      title={item.description}
    >
      <div style={iconCircleStyle(item.color, hovered)}>
        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{item.icon}</span>
      </div>
      <span style={cardLabelStyle(item.color, hovered)}>{item.title}</span>
      {item.description && (
        <span style={cardDescStyle}>{item.description}</span>
      )}
    </button>
  );
}

// Styles
const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '0.75rem',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
  margin: 0,
};

const sectionSubStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  color: 'var(--text-muted)',
  marginTop: '0.2rem',
};

const poweredBadgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  fontSize: '0.66rem',
  fontWeight: 600,
  color: 'var(--primary)',
  background: 'rgba(0,245,212,0.07)',
  border: '1px solid rgba(0,245,212,0.15)',
  padding: '0.3rem 0.65rem',
  borderRadius: '999px',
  letterSpacing: '0.04em',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
  gap: '0.85rem',
};

const cardStyle = (color: string, hovered: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.5rem',
  padding: 'clamp(0.75rem, 2vw, 1.1rem) clamp(0.5rem, 1.5vw, 0.75rem)',
  borderRadius: '14px',
  background: hovered ? `${color}14` : 'rgba(255,255,255,0.035)',
  border: `1.5px solid ${hovered ? color + '44' : 'rgba(255,255,255,0.07)'}`,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  transform: hovered ? 'translateY(-3px)' : 'none',
  boxShadow: hovered ? `0 8px 24px ${color}22` : 'none',
  outline: 'none',
  textAlign: 'center',
  width: '100%',
  minHeight: '100px',
  WebkitTapHighlightColor: 'transparent',
});

const iconCircleStyle = (color: string, hovered: boolean): React.CSSProperties => ({
  width: 'clamp(42px, 8vw, 54px)',
  height: 'clamp(42px, 8vw, 54px)',
  borderRadius: '50%',
  background: hovered ? color : `${color}22`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  boxShadow: hovered ? `0 4px 12px ${color}44` : 'none',
  flexShrink: 0,
});

const cardLabelStyle = (color: string, hovered: boolean): React.CSSProperties => ({
  fontSize: 'clamp(0.68rem, 2vw, 0.78rem)',
  fontWeight: 700,
  color: hovered ? color : 'var(--text-primary)',
  transition: 'color 0.2s',
  lineHeight: 1.2,
});

const cardDescStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  color: 'var(--text-muted)',
  lineHeight: 1.3,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};
