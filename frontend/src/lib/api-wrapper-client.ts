/**
 * Cliente API mejorado con soporte completo para ApiResponse<T>
 *
 * CARACTERÍSTICAS:
 * - Type-safe con TypeScript generics
 * - Unwrapping automático de ApiResponse<T>
 * - Integración con Supabase auth existente
 * - Manejo consistente de errores
 * - Cache de sesión optimizado
 */

import { supabase } from './supabase';
import { getCSRFToken } from '@/utils/csrf';
import type { Session } from '@supabase/supabase-js';
import {
  ApiResponse,
  ApiErrorResponse,
  ApiResult,
  unwrapResponse,
  isSuccessResponse,
} from '../types/api-response.types';

export const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:3000';

// ⚡ OPTIMIZACIÓN: Cache de sesión (reutilizado del api-client.ts existente)
let cachedSession: Session | null = null;
let sessionCachedAt = 0;
const SESSION_CACHE_TTL_MS = 60000; // 1 minuto

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

/**
 * Opciones para requests con wrapper support
 */
interface WrapperRequestOptions extends RequestInit {
  /**
   * Si true, retorna el ApiResponse<T> completo con metadatos.
   * Si false (default), unwrappea y retorna solo T.
   */
  raw?: boolean;

  /**
   * Si true, no lanza error en respuestas de error.
   * Retorna ApiErrorResponse en lugar de lanzar excepción.
   */
  noThrow?: boolean;

  /**
   * Si true (default), lanza error si no hay sesión activa.
   * Si false, permite requests sin sesión (para endpoints públicos).
   */
  requiresAuth?: boolean;
}

/**
 * Fetch mejorado con soporte para ApiResponse<T>
 *
 * @example
 * // Unwrapping automático (default)
 * const minuta = await apiFetchWrapped<Minuta>('/minutas/123');
 * // minuta es de tipo Minuta (sin wrapper)
 *
 * @example
 * // Respuesta completa (raw) con metadatos
 * const response = await apiFetchWrapped<Minuta>('/minutas/123', { raw: true });
 * // response es ApiResponse<Minuta>
 * console.log(response.metadata.duration); // Ver tiempo de respuesta
 *
 * @example
 * // No lanzar error, manejar manualmente
 * const result = await apiFetchWrapped<Minuta>('/minutas/123', { noThrow: true });
 * if (isSuccessResponse(result)) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.message);
 * }
 */
export async function apiFetchWrapped<T>(
  endpoint: string,
  options?: WrapperRequestOptions
): Promise<T | ApiResponse<T> | ApiErrorResponse> {
  const { raw, noThrow, requiresAuth = true, ...fetchOptions } = options || {};

  // Obtener sesión con cache
  const session = await getCachedSession();

  if (!session && requiresAuth) {
    console.warn('No valid session found, redirecting to login');
    invalidateSessionCache();
    globalThis.location.href = '/login';
    throw new Error('Authentication required');
  }

  const token = session?.access_token;

  // CSRF token para métodos mutadores
  const method = (fetchOptions?.method || 'GET').toUpperCase();
  const csrfToken = getCSRFToken();
  const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(needsCSRF && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    ...fetchOptions?.headers,
  } as HeadersInit;

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    // Parsear respuesta JSON
    const data: ApiResult<T> = await response.json();

    // Manejar 401 Unauthorized
    if (response.status === 401) {
      console.error('Unauthorized request, logging out');
      await supabase.auth.signOut();
      invalidateSessionCache();
      globalThis.location.href = '/login';
      throw new Error('Session invalid or expired');
    }

    // Si raw=true, retornar respuesta completa
    if (raw) {
      return data;
    }

    // Si noThrow=true y hay error, retornar error sin lanzar
    if (noThrow && !isSuccessResponse(data)) {
      return data;
    }

    // Unwrappear automáticamente (puede lanzar error si success === false)
    return unwrapResponse(data);

  } catch (error: unknown) {
    // Error de red, timeout, o parsing
    const errorMessage = error instanceof Error ? error.message : 'Error de conexión';
    if (noThrow) {
      return {
        success: false,
        message: errorMessage,
        statusCode: 0,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      } as ApiErrorResponse;
    }

    throw error;
  }
}

/**
 * Helper: GET request con wrapper support
 */
export async function apiGet<T>(
  endpoint: string,
  options?: WrapperRequestOptions
): Promise<T> {
  return apiFetchWrapped<T>(endpoint, { ...options, method: 'GET' }) as Promise<T>;
}

/**
 * Helper: POST request con wrapper support
 */
export async function apiPost<T, B = Record<string, unknown>>(
  endpoint: string,
  body?: B,
  options?: WrapperRequestOptions
): Promise<T> {
  return apiFetchWrapped<T>(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  }) as Promise<T>;
}

/**
 * Helper: PATCH request con wrapper support
 */
export async function apiPatch<T, B = Record<string, unknown>>(
  endpoint: string,
  body?: B,
  options?: WrapperRequestOptions
): Promise<T> {
  return apiFetchWrapped<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(body),
  }) as Promise<T>;
}

/**
 * Helper: PUT request con wrapper support
 */
export async function apiPut<T, B = Record<string, unknown>>(
  endpoint: string,
  body?: B,
  options?: WrapperRequestOptions
): Promise<T> {
  return apiFetchWrapped<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  }) as Promise<T>;
}

/**
 * Helper: DELETE request con wrapper support
 */
export async function apiDelete<T>(
  endpoint: string,
  options?: WrapperRequestOptions
): Promise<T> {
  return apiFetchWrapped<T>(endpoint, { ...options, method: 'DELETE' }) as Promise<T>;
}
