import { supabase } from './supabase';
import { getCSRFToken } from '../utils/csrf';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

import type { Session } from '@supabase/supabase-js';
let cachedSession: Session | null = null;
let sessionCachedAt = 0;
const SESSION_CACHE_TTL_MS = 60000;

async function getCachedSession(): Promise<Session | null> {
    const now = Date.now();
    if (cachedSession && (now - sessionCachedAt) < SESSION_CACHE_TTL_MS) {
        const expiresAt = cachedSession.expires_at;
        const nowSeconds = Math.floor(now / 1000);
        if (expiresAt && (expiresAt - nowSeconds) < 300) {
            const { data: { session: refreshedSession }, error } =
                await supabase.auth.refreshSession();
            if (!error && refreshedSession) {
                cachedSession = refreshedSession;
                sessionCachedAt = now;
            }
        }
        return cachedSession;
    }
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!error && session) {
        cachedSession = session;
        sessionCachedAt = now;
    }
    return session;
}

export function invalidateSessionCache(): void {
    cachedSession = null;
    sessionCachedAt = 0;
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const session = await getCachedSession();
    if (!session) {
        console.warn('No valid session found, redirecting to login');
        invalidateSessionCache();
        throw new Error('Authentication required');
    }

    const token = session.access_token;
    const method = (options?.method || 'GET').toUpperCase();
    const csrfToken = getCSRFToken();
    const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    const isFormData = options?.body instanceof FormData;

    const headers = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(needsCSRF && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...options?.headers,
    } as HeadersInit;

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        if (response.status === 401) {
            console.error('Unauthorized request');
            invalidateSessionCache();
        }
        throw new Error(errorBody.message || `API Error: ${response.statusText}`);
    }

    return response.json();
}
