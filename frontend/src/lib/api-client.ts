export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

import { supabase } from './supabase';

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // 🔒 SEGURIDAD: Validar sesión antes de cada request
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // Si no hay sesión o hay error, redirigir a login
    if (sessionError || !session) {
        console.warn('🔒 No valid session found, redirecting to login');
        window.location.href = '/login';
        throw new Error('Authentication required');
    }

    // 🔒 SEGURIDAD: Validar expiración del token
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);

    let token: string | undefined = session.access_token;

    // Si el token está próximo a expirar (menos de 5 minutos), refrescar
    if (expiresAt && (expiresAt - now) < 300) {
        console.log('🔄 Token expiring soon, refreshing session...');

        const { data: { session: refreshedSession }, error: refreshError } =
            await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession) {
            console.error('🔒 Session refresh failed, logging out');
            await supabase.auth.signOut();
            globalThis.location.href = '/login';
            throw new Error('Session expired');
        }

        token = refreshedSession.access_token;
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

        // 🔒 SEGURIDAD: Handle 401 Unauthorized - sesión inválida
        if (response.status === 401) {
            console.error('🔒 Unauthorized request, logging out');
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
