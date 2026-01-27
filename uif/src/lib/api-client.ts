import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'https://appminuta-production.up.railway.app';

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    try {
        const response = await fetch(url, options);
        // Retry on 5xx errors or network failures
        if (response.status >= 500 && retries > 0) {
            await new Promise(r => setTimeout(r, 1000));
            return fetchWithRetry(url, options, retries - 1);
        }
        return response;
    } catch (error) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, 1000));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchWithRetry(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `API Error: ${response.statusText}`;
        try {
            const json = JSON.parse(errorBody);
            errorMessage = json.message || errorMessage;
        } catch {
            // ignore
        }
        throw new ApiError(response.status, errorMessage);
    }

    return response.json();
}

export const uifApi = {
    clients: {
        list: () => apiClient<any[]>('/uif/clients'),
        get: (id: string) => apiClient<any>(`/uif/clients/${id}`),
        create: (data: any) => apiClient<any>('/uif/clients', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: any) => apiClient<any>(`/uif/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => apiClient<any>(`/uif/clients/${id}`, { method: 'DELETE' }),
    },
    documents: {
        list: (clientId: string) => apiClient<any[]>(`/uif/documents?client_id=${clientId}`),
        create: (data: any) => apiClient<any>('/uif/documents', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: any) => apiClient<any>(`/uif/documents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => apiClient<any>(`/uif/documents/${id}`, { method: 'DELETE' }),
        analyze: (id: string, signedUrl: string) => apiClient<any>(`/uif/documents/${id}/analyze`, { method: 'POST', body: JSON.stringify({ signedUrl }) }),
    },
    analyses: {
        list: (clientId: string) => apiClient<any[]>(`/uif/analyses?client_id=${clientId}`),
        get: (id: string) => apiClient<any>(`/uif/analyses/${id}`),
        create: (data: any) => apiClient<any>('/uif/analyses', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: any) => apiClient<any>(`/uif/analyses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => apiClient<any>(`/uif/analyses/${id}`, { method: 'DELETE' }),
        finalize: (id: string) => apiClient<any>(`/uif/analyses/${id}/finalize`, { method: 'POST' }),
    }
};
