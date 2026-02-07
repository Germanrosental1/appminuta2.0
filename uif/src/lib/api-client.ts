import { supabase } from './supabase';
import { getCSRFToken } from '../utils/csrf';
import {
    ApiErrorResponse,
    ApiResult,
    unwrapResponse
} from '../types/api-response.types';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:3000';

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

// ⚡ OPTIMIZACIÓN: Cache de sesión
import type { Session } from '@supabase/supabase-js';
let cachedSession: Session | null = null;
let sessionCachedAt = 0;
const SESSION_CACHE_TTL_MS = 60000;

async function getCachedSession(): Promise<Session | null> {
    const now = Date.now();
    if (cachedSession && (now - sessionCachedAt) < SESSION_CACHE_TTL_MS) {
        return cachedSession;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        cachedSession = session;
        sessionCachedAt = now;
    }
    return session;
}

/**
 * Procesa la respuesta de la API y maneja el unwrapping opcionalmente
 */
async function processResponse<T>(response: Response, options: { raw?: boolean; noThrow?: boolean }): Promise<T | ApiResult<T>> {
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        if (options.noThrow) {
            return {
                success: false,
                message: errorBody.message || response.statusText,
                statusCode: response.status,
                metadata: { timestamp: new Date().toISOString() }
            } as ApiErrorResponse;
        }
        throw new ApiError(response.status, errorBody.message || response.statusText);
    }

    const data: ApiResult<T> = await response.json();

    if (options.raw) return data;

    // Si tiene el wrapper, lo unwrappea
    if (data && typeof data === 'object' && 'success' in data) {
        return unwrapResponse(data);
    }

    return data as T;
}

/**
 * Captura errores de red o excepciones y los formatea si noThrow está activo
 */
function handleAppError(error: unknown, noThrow?: boolean): ApiErrorResponse {
    if (noThrow) {
        return {
            success: false,
            message: (error instanceof Error) ? error.message : 'Unknown error',
            statusCode: 0,
            metadata: { timestamp: new Date().toISOString() }
        } as ApiErrorResponse;
    }
    throw error;
}

export async function apiClient<T>(endpoint: string, options: RequestInit & { raw?: boolean, noThrow?: boolean } = {}): Promise<T | ApiResult<T>> {
    try {
        const session = await getCachedSession();
        const token = session?.access_token;

        const method = (options.method || 'GET').toUpperCase();
        const csrfToken = getCSRFToken();
        const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

        const isFormData = (options as any).body instanceof FormData;

        const headers: Record<string, string> = {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(needsCSRF && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
            ...(options.headers as Record<string, string>),
        };

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            body: isFormData ? (options as any).body : (options.body ? JSON.stringify(options.body) : undefined),
            headers,
        });

        return await processResponse<T>(response, options);
    } catch (error: unknown) {
        return handleAppError(error, options.noThrow);
    }
}

import { Client, Document, Analysis } from '../types/database';

export const uifApi = {
    clients: {
        list: () => apiClient<Client[]>('/uif/clients'),
        get: (id: string) => apiClient<Client>(`/uif/clients/${id}`),
        create: (data: Partial<Client>) => apiClient<Client>('/uif/clients', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Client>) => apiClient<Client>(`/uif/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => apiClient<void>(`/uif/clients/${id}`, { method: 'DELETE' }),
    },
    documents: {
        list: (clientId: string) => apiClient<Document[]>(`/uif/documents?client_id=${clientId}`),
        create: (data: Partial<Document>) => apiClient<Document>('/uif/documents', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Document>) => apiClient<Document>(`/uif/documents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => apiClient<void>(`/uif/documents/${id}`, { method: 'DELETE' }),
        analyze: (id: string, signedUrl: string) => apiClient<Record<string, unknown>>(`/uif/documents/${id}/analyze`, { method: 'POST', body: JSON.stringify({ signedUrl }) }),
    },
    analyses: {
        list: (clientId: string) => apiClient<Analysis[]>(`/uif/analyses?client_id=${clientId}`),
        get: (id: string) => apiClient<Analysis>(`/uif/analyses/${id}`),
        create: (data: Partial<Analysis>) => apiClient<Analysis>('/uif/analyses', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Analysis>) => apiClient<Analysis>(`/uif/analyses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => apiClient<void>(`/uif/analyses/${id}`, { method: 'DELETE' }),
        finalize: (id: string) => apiClient<Record<string, unknown>>(`/uif/analyses/${id}/finalize`, { method: 'POST' }),
    }
};
