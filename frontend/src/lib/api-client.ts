export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

import { supabase } from './supabase';

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

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

        // Handle 401 Unauthorized globally if needed (e.g. redirect to login)
        if (response.status === 401) {
            console.error('Unauthorized access to API');
        }

        throw new Error(errorBody.message || `API Error: ${response.statusText}`);
    }

    return response.json();
}

export async function apiFetchBuffer(endpoint: string, options?: RequestInit): Promise<{ buffer: ArrayBuffer, contentType: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

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
