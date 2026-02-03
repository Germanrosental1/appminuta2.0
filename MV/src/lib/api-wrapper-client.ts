/**
 * Cliente API mejorado con soporte completo para ApiResponse<T>
 */

import { apiFetch } from './api-client';
import {
    ApiResponse,
    ApiErrorResponse,
    ApiResult,
    unwrapResponse,
    isSuccessResponse,
} from '../types/api-response.types';

interface WrapperRequestOptions extends RequestInit {
    raw?: boolean;
    noThrow?: boolean;
}

export async function apiFetchWrapped<T>(
    endpoint: string,
    options?: WrapperRequestOptions
): Promise<T | ApiResponse<T> | ApiErrorResponse> {
    const { raw, noThrow, ...fetchOptions } = options || {};

    try {
        const data: ApiResult<T> = await apiFetch<ApiResult<T>>(endpoint, fetchOptions);

        if (raw) {
            return data as any;
        }

        if (noThrow && !isSuccessResponse(data)) {
            return data as any;
        }

        return unwrapResponse(data) as any;

    } catch (error: any) {
        if (noThrow) {
            return {
                success: false,
                message: error.message || 'Error de conexión',
                statusCode: 0,
                metadata: {
                    timestamp: new Date().toISOString(),
                },
            } as ApiErrorResponse;
        }

        throw error;
    }
}

export async function apiGet<T>(
    endpoint: string,
    options?: WrapperRequestOptions
): Promise<T> {
    return apiFetchWrapped<T>(endpoint, { ...options, method: 'GET' }) as Promise<T>;
}

export async function apiPost<T>(
    endpoint: string,
    body?: any,
    options?: WrapperRequestOptions
): Promise<T> {
    return apiFetchWrapped<T>(endpoint, {
        ...options,
        method: 'POST',
        body: body instanceof FormData ? body : JSON.stringify(body),
    }) as Promise<T>;
}

export async function apiPatch<T>(
    endpoint: string,
    body?: any,
    options?: WrapperRequestOptions
): Promise<T> {
    return apiFetchWrapped<T>(endpoint, {
        ...options,
        method: 'PATCH',
        body: body instanceof FormData ? body : JSON.stringify(body),
    }) as Promise<T>;
}

export async function apiPut<T>(
    endpoint: string,
    body?: any,
    options?: WrapperRequestOptions
): Promise<T> {
    return apiFetchWrapped<T>(endpoint, {
        ...options,
        method: 'PUT',
        body: body instanceof FormData ? body : JSON.stringify(body),
    }) as Promise<T>;
}

export async function apiDelete<T>(
    endpoint: string,
    options?: WrapperRequestOptions
): Promise<T> {
    return apiFetchWrapped<T>(endpoint, { ...options, method: 'DELETE' }) as Promise<T>;
}
