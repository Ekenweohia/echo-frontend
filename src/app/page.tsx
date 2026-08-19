'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import SplashScreen from './components/SplashScreen';
import Dashboard from './components/Dashboard';
import ClinicianDashboard from './components/ClinicianDashboard';
import LandingPage from './components/LandingPage';

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const { loading, user } = useAuth();

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
      <div style={loadingContainerStyle}>
        <div style={spinnerStyle} />
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  if (user?.role === 'DOCTOR' || user?.role === 'NURSE' || (user?.role as string) === 'ADMIN') {
    return <ClinicianDashboard />;
  }
  
  return <Dashboard />;
}

const loadingContainerStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-base)',
  minHeight: '100vh',
  width: '100vw',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const spinnerStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  border: '2px solid rgba(0, 245, 212, 0.1)',
  borderTopColor: 'var(--primary)',
  animation: 'heartbeat 1.5s infinite ease-in-out',
};
