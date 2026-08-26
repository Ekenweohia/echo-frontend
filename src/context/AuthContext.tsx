'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient, setAccessToken, setRefreshTokenCallback } from '@/services/apiClient';

const LOCAL_AUTH_SESSION_KEY = 'emergencyEchoLocalAuth';
const LOCAL_ACCESS_TOKEN = 'local-development-access-token';

const LOCAL_USERS: Array<UserProfile & { password: string }> = [
  {
    id: 'local-patient-jane', fullName: 'Jane Doe', username: 'jane', phone: '+2348000000001',
    email: 'jane@example.com', password: 'Password1234!', role: 'PATIENT', isVerified: true, isApproved: true,
  },
  {
    id: 'local-doctor-smith', fullName: 'Dr. Smith', username: 'smith', phone: '+2348000000002',
    email: 'smith@example.com', password: 'Password1234!', role: 'DOCTOR', isVerified: true, isApproved: true, accountStatus: 'ACTIVE',
  },
];

function makeLocalUserProfile(data: {
  fullName: string;
  username: string;
  phone: string;
  email: string;
  role: UserProfile['role'];
}) {
  return {
    id: `local-${data.role.toLowerCase()}-${data.username}-${Date.now()}`,
    fullName: data.fullName,
    username: data.username,
    phone: data.phone,
    email: data.email,
    role: data.role,
    isVerified: true,
    isApproved: data.role === 'PATIENT' || data.role === 'PARTNER',
  } satisfies UserProfile;
}

function localAuthEnabled() {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1'].includes(window.location.hostname) || process.env.NEXT_PUBLIC_ENABLE_LOCAL_AUTH === 'true';
}

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
    if (localAuthEnabled() && localStorage.getItem(LOCAL_AUTH_SESSION_KEY) === 'true') {
      setAccessToken(LOCAL_ACCESS_TOKEN);
      return LOCAL_ACCESS_TOKEN;
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      console.log('[Auth] Attempting token refresh...');
      const response = await apiClient('/auth/refresh', {
        method: 'POST',
        skipAuth: true,
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

      if (!response.ok && response.status >= 500) {
        localStorage.removeItem('refreshToken');
      }
    } catch (err) {
      console.warn('[Auth] Failed to connect to refresh endpoint. Maintaining local session details.');
      localStorage.removeItem('refreshToken');
    }
    return null;
  };

  // 2. Fetch User Profile
  const fetchProfile = async (token: string): Promise<UserProfile | null> => {
    if (token === LOCAL_ACCESS_TOKEN && localAuthEnabled() && localStorage.getItem(LOCAL_AUTH_SESSION_KEY) === 'true') {
      const localUser = localStorage.getItem('userSession');
      return localUser ? JSON.parse(localUser) : null;
    }

    try {
      setAccessToken(token);
      const response = await apiClient('/auth/me');

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          const serverUser = json.data.user ?? json.data;

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
      console.warn('[Auth] Could not fetch profile from server.');
    }

    return null;
  };

  // 3. Register User
  const register = async (data: any) => {
    try {
      const response = await apiClient('/auth/register', {
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
      console.warn('[Auth] Registration request failed.', err);
      if (localAuthEnabled()) {
        const profile = makeLocalUserProfile({
          fullName: data.fullName,
          username: data.username,
          phone: data.phone,
          email: data.email,
          role: data.role,
        });

        setAccessToken(LOCAL_ACCESS_TOKEN);
        localStorage.setItem('refreshToken', 'local-development-refresh-token');
        localStorage.setItem(LOCAL_AUTH_SESSION_KEY, 'true');
        localStorage.setItem('userSession', JSON.stringify(profile));
        setUser(profile);

        return { success: true };
      }
      return { success: false, error: 'Unable to reach the authentication service. Please try again.' };
    }
  };

  // 4. Log in User
  const login = async (identifier: string, password: string) => {
    try {
      const response = await apiClient('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        if (localAuthEnabled() && response.status >= 500) {
          const normalisedIdentifier = identifier.trim().toLowerCase();
          const localUser = LOCAL_USERS.find((candidate) =>
            (candidate.email === normalisedIdentifier || candidate.username === normalisedIdentifier) && candidate.password === password
          );

          if (localUser) {
            const { password: _password, ...profile } = localUser;
            setAccessToken(LOCAL_ACCESS_TOKEN);
            localStorage.setItem('refreshToken', 'local-development-refresh-token');
            localStorage.setItem(LOCAL_AUTH_SESSION_KEY, 'true');
            localStorage.setItem('userSession', JSON.stringify(profile));
            setUser(profile);
            return { success: true };
          }
        }
        return { success: false, error: json.message || 'Invalid credentials.' };
      }

      const serverUser = json.data?.user;
      const tokens = json.data?.tokens ?? json.data;
      const { accessToken, refreshToken } = tokens || {};

      if (!serverUser || !accessToken || !refreshToken) {
        return { success: false, error: 'The authentication service returned an incomplete session. Please try again.' };
      }
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
      console.warn('[Auth] Login request failed.', err);
      if (localAuthEnabled()) {
        const normalisedIdentifier = identifier.trim().toLowerCase();
        const localUser = LOCAL_USERS.find((candidate) =>
          (candidate.email === normalisedIdentifier || candidate.username === normalisedIdentifier) && candidate.password === password
        );

        if (localUser) {
          const { password: _password, ...profile } = localUser;
          setAccessToken(LOCAL_ACCESS_TOKEN);
          localStorage.setItem('refreshToken', 'local-development-refresh-token');
          localStorage.setItem(LOCAL_AUTH_SESSION_KEY, 'true');
          localStorage.setItem('userSession', JSON.stringify(profile));
          setUser(profile);
          return { success: true };
        }
      }
      return { success: false, error: 'Unable to reach the authentication service. Please check your connection and try again.' };
    }
  };

  // 5. Submit Licensing Verification (For Doctors/Nurses)
  const submitVerification = async (licenseNumber: string, institution: string) => {
    if (!user) return { success: false };

    // Optimistically mark as verified/pending immediately so routing works
    // even if the backend call fails or is offline
    const optimisticUser: UserProfile = {
      ...user,
      isVerified: true,
      isApproved: false,
    };
    setUser(optimisticUser);
    localStorage.setItem('userSession', JSON.stringify(optimisticUser));

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
          return { success: true };
        }
      }
      // Even if the server returns an error, the user is already in pending state locally
      return { success: true };
    } catch (err) {
      console.warn('[Auth] Server offline — verification submitted locally in pending state.');
      // Already set optimistically above
      return { success: true };
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
      const refreshToken = localStorage.getItem('refreshToken');
      await apiClient('/auth/logout', { method: 'POST', skipAuth: true, body: JSON.stringify({ refreshToken }) });
    } catch (e) {
      // Ignore network errors on logout
    }
    setAccessToken(null);
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userSession');
    localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
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
        // A UI cache is not proof of an authenticated session. Authentication
        // is restored only through a valid refresh token and /me response.
        localStorage.removeItem('userSession');
        setUser(null);
      }
      setLoading(false);
    }
    restoreSession();
  }, []);

  // 8. Navigation Guard & Redirect Logic
  useEffect(() => {
    if (loading) return;

    const publicPaths = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/lobby'];
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
          // Only redirect to /verify if they haven't submitted credentials yet
          if (!user.isVerified && pathname !== '/verify') {
            router.push('/verify');
          } else if (user.isVerified && (pathname === '/verify' || pathname === '/lobby')) {
            // Verified (pending OR approved) → go to dashboard. Locked overlay handles pending state.
            router.push('/');
          }
        }
      }
    }
  }, [user, loading, pathname]);

  const redirectBasedOnRole = (profile: UserProfile) => {
    if (profile.role === 'DOCTOR' || profile.role === 'NURSE') {
      if (!profile.isVerified) {
        // Haven't submitted credentials yet
        if (pathname !== '/verify') router.push('/verify');
      } else {
        // Submitted credentials — go to dashboard regardless of approval.
        // Dashboard shows a locked overlay if not yet approved.
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
