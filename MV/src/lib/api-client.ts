export const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:3000';

import { supabase } from './supabase';
import { getCSRFToken } from '../utils/csrf';

// ⚡ OPTIMIZACIÓN: Cache de sesión para evitar llamadas redundantes a Supabase
import type { Session } from '@supabase/supabase-js';
let cachedSession: Session | null = null;
let sessionCachedAt = 0;
const SESSION_CACHE_TTL_MS = 60000; // 1 minuto

async function getCachedSession(): Promise<Session | null> {
    const now = Date.now();

    // Si hay cache válido, usarlo
    if (cachedSession && (now - sessionCachedAt) < SESSION_CACHE_TTL_MS) {
        // Pero verificar si está próximo a expirar
        const expiresAt = cachedSession.expires_at;
        const nowSeconds = Math.floor(now / 1000);

        // Si el token expira en menos de 5 minutos, refrescar
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

    // Cache expirado o no existe, obtener nueva sesión
    const { data: { session }, error } = await supabase.auth.getSession();

    if (!error && session) {
        cachedSession = session;
        sessionCachedAt = now;
    }

    return session;
}

// Función para invalidar cache (llamar al logout)
export function invalidateSessionCache(): void {
    cachedSession = null;
    sessionCachedAt = 0;
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // ⚡ OPTIMIZACIÓN: Usar cache de sesión (reduce ~50% llamadas a Supabase)
    const session = await getCachedSession();

    // Si no hay sesión, redirigir a login
    if (!session) {
        console.warn('No valid session found, redirecting to login');
        invalidateSessionCache();
        globalThis.location.href = '/login';
        throw new Error('Authentication required');
    }

    const token = session.access_token;

    // Obtener CSRF token para métodos que modifican datos
    const method = (options?.method || 'GET').toUpperCase();
    const csrfToken = getCSRFToken();
    const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    const headers = {
        'Content-Type': 'application/json',
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

        // Handle 401 Unauthorized - sesión inválida
        if (response.status === 401) {
            console.error('Unauthorized request, logging out');
            await supabase.auth.signOut();
            globalThis.location.href = '/login';
            throw new Error('Session invalid or expired');
        }

        throw new Error(errorBody.message || `API Error: ${response.statusText}`);
    }

    return response.json();
}

export async function apiFetchBuffer(endpoint: string, options?: RequestInit): Promise<{ buffer: ArrayBuffer, contentType: string }> {
    // ⚡ OPTIMIZACIÓN: Refresh session to ensure token is valid
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

    let token: string | undefined;

    if (refreshError) {
        // Fallback to getSession if refresh fails
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;

        if (!token) {
            throw new Error('Authentication required');
        }
    } else {
        token = refreshedSession?.access_token;
    }

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options?.headers,
    } as HeadersInit;

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `API Error: ${response.statusText}`);
    }

    const contentType = response.headers.get('Content-Type') || '';
    const buffer = await response.arrayBuffer();
    return { buffer, contentType };
}
