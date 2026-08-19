'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient, setAccessToken, setRefreshTokenCallback } from '@/services/apiClient';

export interface UserProfile {
  id: string;
  fullName: string;
  username: string;
  phone: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'NURSE' | 'PARTNER';
  isVerified: boolean; // Submitted license verification
  isApproved: boolean; // Approved by admin (keeps them in lobby if false)
  isActive?: boolean;
  accountStatus?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  submitVerification: (licenseNumber: string, institution: string) => Promise<{ success: boolean }>;
  mockApproveUser: () => void; // Utility for testing lobby approval
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // 1. JWT Silent Refresh Call
  const performSilentRefresh = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      console.log('[Auth] Attempting token refresh...');
      const response = await fetch('https://api.novacoresbank.com/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          const { accessToken, refreshToken: newRefreshToken } = json.data;
          setAccessToken(accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          console.log('✅ [Auth] Silent token refresh successful.');
          return accessToken;
        }
      }
    } catch (err) {
      console.warn('[Auth] Failed to connect to refresh endpoint. Maintaining local session details.');
    }
    return null;
  };

  // 2. Fetch User Profile
  const fetchProfile = async (token: string): Promise<UserProfile | null> => {
    try {
      setAccessToken(token);
      const response = await apiClient('/auth/me');

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          const serverUser = json.data.user;

          // Dynamically query clinician licensing status from verification endpoint
          if (serverUser.role === 'DOCTOR' || serverUser.role === 'NURSE') {
            const isActive = serverUser.accountStatus === 'ACTIVE' || serverUser.isActive === true;
            if (isActive) {
              serverUser.isVerified = true;
              serverUser.isApproved = true;
            } else {
              try {
                const url = serverUser.role === 'DOCTOR'
                  ? '/doctors/me/verification'
                  : '/nurses/me/verification';
                const verifRes = await apiClient(url);
                if (verifRes.ok) {
                  const verifJson = await verifRes.json();
                  if (verifJson.success && verifJson.data) {
                    const { verificationStatus, onboardingStatus } = verifJson.data;
                    serverUser.isVerified = (verificationStatus === 'VERIFIED' || verificationStatus === 'PENDING');
                    serverUser.isApproved = (verificationStatus === 'VERIFIED' && onboardingStatus === 'COMPLETED');
                  }
                } else {
                  serverUser.isVerified = false;
                  serverUser.isApproved = false;
                }
              } catch (e) {
                serverUser.isVerified = false;
                serverUser.isApproved = false;
              }
            }
          }
          return serverUser;
        }
      }
    } catch (err) {
      console.warn('[Auth] Could not fetch profile from server. Falling back to cached user state.');
    }

    // Fallback Mock profile if backend is offline but local storage has user session
    const localUser = localStorage.getItem('userSession');
    if (localUser) {
      return JSON.parse(localUser);
    }
    return null;
  };

  // 3. Register User
  const register = async (data: any) => {
    try {
      const response = await fetch('https://api.novacoresbank.com/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        return { success: false, error: json.message || 'Registration failed.' };
      }

      return { success: true };
    } catch (err) {
      console.warn('[Auth] Server offline. Registering in offline mockup mode...');

      // Offline mockup registration
      const mockUser: UserProfile = {
        id: `mock-usr-${Math.random().toString(36).substring(4)}`,
        fullName: data.fullName,
        username: data.username,
        phone: data.phone,
        email: data.email,
        role: data.role || 'PATIENT',
        isVerified: false,
        isApproved: false,
      };

      // Save mock session details
      localStorage.setItem('userSession', JSON.stringify(mockUser));
      return { success: true };
    }
  };

  // 4. Log in User
  const login = async (identifier: string, password: string) => {
    try {
      const response = await fetch('https://api.novacoresbank.com/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        return { success: false, error: json.message || 'Invalid credentials.' };
      }

      const { accessToken, refreshToken, user: serverUser } = json.data;
      setAccessToken(accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      const fullProfile: UserProfile = {
        ...serverUser,
        isVerified: serverUser.isVerified || false,
        isApproved: serverUser.isApproved || false,
      };

      // Query clinician verification status on login dynamically
      if (serverUser.role === 'DOCTOR' || serverUser.role === 'NURSE') {
        const isActive = serverUser.accountStatus === 'ACTIVE' || serverUser.isActive === true;
        if (isActive) {
          fullProfile.isVerified = true;
          fullProfile.isApproved = true;
        } else {
          try {
            const url = serverUser.role === 'DOCTOR'
              ? '/doctors/me/verification'
              : '/nurses/me/verification';
            const verifRes = await apiClient(url);
            if (verifRes.ok) {
              const verifJson = await verifRes.json();
              if (verifJson.success && verifJson.data) {
                const { verificationStatus, onboardingStatus } = verifJson.data;
                fullProfile.isVerified = (verificationStatus === 'VERIFIED' || verificationStatus === 'PENDING');
                fullProfile.isApproved = (verificationStatus === 'VERIFIED' && onboardingStatus === 'COMPLETED');
              }
            } else {
              fullProfile.isVerified = false;
              fullProfile.isApproved = false;
            }
          } catch (e) {
            fullProfile.isVerified = false;
            fullProfile.isApproved = false;
          }
        }
      }

      localStorage.setItem('userSession', JSON.stringify(fullProfile));
      setUser(fullProfile);

      return { success: true };
    } catch (err) {
      console.warn('[Auth] Server is offline. Logging in with Mock Session...');

      // Try to load simulated session, or create one on the fly
      let cached = localStorage.getItem('userSession');
      let mockUser: UserProfile;

      if (cached) {
        mockUser = JSON.parse(cached);
      } else {
        mockUser = {
          id: 'mock-patient-id',
          fullName: 'John Doe',
          username: 'johndoe',
          phone: '+15550100',
          email: identifier.includes('@') ? identifier : 'johndoe@example.com',
          role: 'PATIENT',
          isVerified: false,
          isApproved: false,
        };
        localStorage.setItem('userSession', JSON.stringify(mockUser));
      }

      setAccessToken('mock-access-token');
      localStorage.setItem('refreshToken', 'mock-refresh-token');
      setUser(mockUser);
      return { success: true };
    }
  };

  // 5. Submit Licensing Verification (For Doctors/Nurses)
  const submitVerification = async (licenseNumber: string, institution: string) => {
    if (!user) return { success: false };

    try {
      const isDoc = user.role === 'DOCTOR';
      const path = isDoc ? '/doctors/onboarding' : '/nurses/onboarding';

      const body = isDoc ? {
        mdcnRegistrationNumber: licenseNumber,
        medicalDegree: 'MBBS',
        universityAttended: institution,
        yearOfGraduation: new Date().getFullYear() - 5,
        verificationDocumentUrl: 'https://storage.googleapis.com/docs/license.pdf',
        specialization: 'General Practice',
        yearsOfExperience: 5,
      } : {
        nmcnRegistrationNumber: licenseNumber,
        nursingQualification: 'RN',
        universityAttended: institution,
        verificationDocumentUrl: 'https://storage.googleapis.com/docs/rn-cert.pdf',
        specialization: 'General Nursing',
        yearsOfExperience: 5,
      };

      const response = await apiClient(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success) {
          const updatedUser: UserProfile = {
            ...user,
            isVerified: true,
            isApproved: false, // verification submitted, now waiting in lobby for admin verification approval
          };
          setUser(updatedUser);
          localStorage.setItem('userSession', JSON.stringify(updatedUser));
          return { success: true };
        }
      }
      return { success: false };
    } catch (err) {
      console.error('[Auth] Failed to submit onboarding details to server:', err);
      return { success: false };
    }
  };

  // 6. Utility to mock admin approval (for previewing lobby exit transition)
  const mockApproveUser = () => {
    if (user) {
      const updatedUser: UserProfile = {
        ...user,
        isApproved: true,
      };
      setUser(updatedUser);
      localStorage.setItem('userSession', JSON.stringify(updatedUser));
      console.log('✅ [Auth] User approved.');
    }
  };

  // 7. Log out User
  const logout = async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    }
    setAccessToken(null);
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userSession');
    setUser(null);
    router.push('/login');
  };

  // Hook token refresh interceptor callback into client
  useEffect(() => {
    setRefreshTokenCallback(performSilentRefresh);
  }, []);

  // Proactive periodic token refresh timer (Runs every 14 minutes)
  useEffect(() => {
    if (!user) return;
    const intervalTime = 14 * 60 * 1000; // 14 mins

    const interval = setInterval(async () => {
      await performSilentRefresh();
    }, intervalTime);

    return () => clearInterval(interval);
  }, [user]);

  // Initial session restoration on startup
  useEffect(() => {
    async function restoreSession() {
      const token = await performSilentRefresh();
      if (token) {
        const profile = await fetchProfile(token);
        if (profile) {
          setUser(profile);
        } else {
          setUser(null);
        }
      } else {
        // Check if there is a mock session from a previous reload
        const cachedSession = localStorage.getItem('userSession');
        if (cachedSession) {
          setUser(JSON.parse(cachedSession));
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    }
    restoreSession();
  }, []);

  // 8. Navigation Guard & Redirect Logic
  useEffect(() => {
    if (loading) return;

    const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
    const isPublicPath = publicPaths.some(path => pathname?.startsWith(path));

    if (!user) {
      // Unauthenticated users are redirected to login if trying to access private space
      if (!isPublicPath && pathname !== '/') {
        router.push('/login');
      }
    } else {
      // Authenticated users
      if (isPublicPath) {
        // Logged in users shouldn't see login/register
        redirectBasedOnRole(user);
      } else if (pathname === '/') {
        redirectBasedOnRole(user);
      } else {
        // Enforce doctor/nurse routing restrictions
        if (user.role === 'DOCTOR' || user.role === 'NURSE') {
          if (!user.isVerified && pathname !== '/verify') {
            router.push('/verify');
          } else if (user.isVerified && !user.isApproved && pathname !== '/lobby') {
            router.push('/lobby');
          } else if (user.isVerified && user.isApproved && (pathname === '/verify' || pathname === '/lobby')) {
            router.push('/');
          }
        }
      }
    }
  }, [user, loading, pathname]);

  const redirectBasedOnRole = (profile: UserProfile) => {
    if (profile.role === 'DOCTOR' || profile.role === 'NURSE') {
      if (!profile.isVerified) {
        if (pathname !== '/verify') router.push('/verify');
      } else if (!profile.isApproved) {
        if (pathname !== '/lobby') router.push('/lobby');
      } else {
        if (pathname !== '/') router.push('/');
      }
    } else {
      if (pathname !== '/') router.push('/');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        submitVerification,
        mockApproveUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
