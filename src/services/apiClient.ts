import { API_BASE_URL } from '@/config/api';

let currentAccessToken: string | null = null;
let onTokenRefresh: (() => Promise<string | null>) | null = null;

/**
 * Configure the active access token in memory.
 */
export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

/**
 * Return the active access token.
 */
export function getAccessToken(): string | null {
  return currentAccessToken;
}

/**
 * Setup a callback function that is invoked when a 401 error is encountered
 * to perform a silent refresh and return the new access token.
 */
export function setRefreshTokenCallback(callback: () => Promise<string | null>) {
  onTokenRefresh = callback;
}

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Enhanced fetch client with auto-base url, auth headers, and 401 auto-retry interceptor.
 */
export async function apiClient(path: string, options: ApiOptions = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const isPublicAuthPath =
    path === '/auth/login' ||
    path === '/auth/register' ||
    path === '/auth/refresh' ||
    path === '/auth/verify-email' ||
    path === '/auth/resend-verification' ||
    path === '/auth/forgot-password' ||
    path === '/auth/reset-password';
  const headers = new Headers(options.headers || {});

  // Add JSON header if needed
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject Bearer Token
  if (currentAccessToken && !options.skipAuth && !isPublicAuthPath) {
    headers.set('Authorization', `Bearer ${currentAccessToken}`);
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Intercept 401 unauthorized to attempt token refresh
  if (response.status === 401 && onTokenRefresh && !options.skipAuth && !isPublicAuthPath) {
    try {
      const newAccessToken = await onTokenRefresh();
      if (newAccessToken) {
        // Retry once with the new token
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    } catch (err) {
      console.error('[API Client] Silent refresh retry failed:', err);
    }
  }

  if (!response.ok) {
    try {
      const cloned = response.clone();
      const body = await cloned.json();
      if (body?.error?.code === 'DMK_NOT_FOUND') {
        throw new ApiError(response.status, body.error.code, body.message || 'DMK not found');
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
    }
  }

  return response;
}
