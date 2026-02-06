import { supabase } from './supabase';
import { getCSRFToken } from '../utils/csrf';
import {
    ApiErrorResponse,
    ApiResult,
    unwrapResponse
} from '../types/api-response.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
function handleAppError(error: any, noThrow?: boolean): ApiErrorResponse {
    if (noThrow) {
        return {
            success: false,
            message: error.message,
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
    } catch (error: any) {
        return handleAppError(error, options.noThrow);
    }
}

export const uifApi = {
    clients: {
        list: () => apiClient<any[]>('/uif/clients'),
        get: (id: string) => apiClient<any>(`/uif/clients/${id}`),
        create: (data: any) => apiClient<any>('/uif/clients', { method: 'POST', body: data }),
        update: (id: string, data: any) => apiClient<any>(`/uif/clients/${id}`, { method: 'PATCH', body: data }),
        delete: (id: string) => apiClient<any>(`/uif/clients/${id}`, { method: 'DELETE' }),
    },
    documents: {
        list: (clientId: string) => apiClient<any[]>(`/uif/documents?client_id=${clientId}`),
        create: (data: any) => apiClient<any>('/uif/documents', { method: 'POST', body: data }),
        update: (id: string, data: any) => apiClient<any>(`/uif/documents/${id}`, { method: 'PATCH', body: data }),
        delete: (id: string) => apiClient<any>(`/uif/documents/${id}`, { method: 'DELETE' }),
        analyze: (id: string, signedUrl: string) => apiClient<any>(`/uif/documents/${id}/analyze`, { method: 'POST', body: { signedUrl } }),
    },
    analyses: {
        list: (clientId: string) => apiClient<any[]>(`/uif/analyses?client_id=${clientId}`),
        get: (id: string) => apiClient<any>(`/uif/analyses/${id}`),
        create: (data: any) => apiClient<any>('/uif/analyses', { method: 'POST', body: data }),
        update: (id: string, data: any) => apiClient<any>(`/uif/analyses/${id}`, { method: 'PATCH', body: data }),
        delete: (id: string) => apiClient<any>(`/uif/analyses/${id}`, { method: 'DELETE' }),
        finalize: (id: string) => apiClient<any>(`/uif/analyses/${id}/finalize`, { method: 'POST' }),
    }
};
