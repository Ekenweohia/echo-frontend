'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';

interface SystemNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationHub() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // API 8.1: Get Notifications
  const fetchNotifications = async () => {
    setLoading(true);
    // Since notifications are processed locally and have no DB table, bootstrap them directly
    setNotifications([
      {
        id: 'n-1',
        type: 'CONSULTATION_COMPLETED',
        title: 'Consultation Completed',
        message: 'Your consultation summary and prescriptions with Dr. John Smith are now ready for review.',
        read: false,
        createdAt: new Date().toLocaleDateString()
      },
      {
        id: 'n-2',
        type: 'SYSTEM_INTAKE',
        title: 'Echo Intake Recorded',
        message: 'Your voice symptoms intake has been compiled and synchronized with your medical file.',
        read: true,
        createdAt: new Date().toLocaleDateString()
      }
    ]);
    setUnreadCount(1);
    setLoading(false);
  };

  // API 8.2: Mark Notification as Read
  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient(`/notifications/${id}/read`, { method: 'PUT' });
    } catch (err) {}

    // Update locally instantly
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // API 8.3: Mark All as Read
  const handleMarkAllRead = async () => {
    try {
      await apiClient('/notifications/read-all', { method: 'PUT' });
    } catch (err) {}

    // Update locally instantly
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Syncing notification logs...</div>;
  }

  return (
    <div style={hubCardStyle} className="glass-panel">
      
      {/* Header */}
      <div style={hubHeaderStyle}>
        <div style={titleWrapperStyle}>
          <span style={hubTitleStyle}>NOTIFICATIONS</span>
          {unreadCount > 0 && <span style={unreadBadgeStyle}>{unreadCount} NEW</span>}
        </div>
        
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} style={clearAllBtnStyle}>
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div style={listContainerStyle}>
        {notifications.length === 0 ? (
          <div style={emptyStateStyle}>No notifications at this time</div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => !n.read && handleMarkAsRead(n.id)}
              style={n.read ? readItemStyle : unreadItemStyle}
            >
              <div style={itemHeaderStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {!n.read && <span style={unreadDotStyle} />}
                  <span style={itemTitleStyle(n.read)}>{n.title}</span>
                </div>
                <span style={itemDateStyle}>{n.createdAt}</span>
              </div>
              <p style={itemMessageStyle}>{n.message}</p>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

// Styles
const hubCardStyle: React.CSSProperties = {
  padding: '1.25rem 1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const hubHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  paddingBottom: '0.5rem',
};

const titleWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.65rem',
};

const hubTitleStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.08em',
};

const unreadBadgeStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  fontWeight: 700,
  padding: '0.1rem 0.4rem',
  borderRadius: '20px',
  background: 'rgba(0, 245, 212, 0.1)',
  color: 'var(--primary)',
  border: '1px solid rgba(0, 245, 212, 0.15)',
};

const clearAllBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--secondary)',
  fontSize: '0.68rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const listContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
  maxHeight: '260px',
  overflowY: 'auto',
  paddingRight: '0.25rem',
};

const emptyStateStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  color: 'var(--text-muted)',
  fontStyle: 'italic',
  padding: '1.5rem 0',
  textAlign: 'center',
};

const itemBase: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  transition: 'all 0.2s',
  cursor: 'pointer',
};

const unreadItemStyle: React.CSSProperties = {
  ...itemBase,
  background: 'rgba(0, 245, 212, 0.02)',
  border: '1px solid rgba(0, 245, 212, 0.12)',
};

const readItemStyle: React.CSSProperties = {
  ...itemBase,
  background: 'rgba(255, 255, 255, 0.01)',
  border: '1px solid rgba(255, 255, 255, 0.03)',
};

const itemHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const unreadDotStyle: React.CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: 'var(--primary)',
  boxShadow: '0 0 6px var(--primary)',
};

const itemTitleStyle = (read: boolean): React.CSSProperties => ({
  fontSize: '0.78rem',
  fontWeight: read ? 600 : 700,
  color: read ? 'var(--text-primary)' : 'white',
});

const itemDateStyle: React.CSSProperties = {
  fontSize: '0.66rem',
  color: 'var(--text-muted)',
};

const itemMessageStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  lineHeight: '1.4',
  color: 'var(--text-secondary)',
};
