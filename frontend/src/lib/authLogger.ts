import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { apiPost, apiGet } from './api-wrapper-client';

// Tipos de eventos de autenticación para el registro
export type AuthEventType =
    | 'login_success'
    | 'login_failed'
    | 'logout'
    | 'token_refreshed'
    | 'session_expired'
    | 'auth_error';

// Interfaz para el registro de eventos de autenticación
interface AuthLogEntry {
    user_id?: string;
    email?: string;
    event_type: AuthEventType;
    timestamp: string;
    details?: Record<string, any>;
    user_agent: string;
}

/**
 * Obtiene el token JWT del usuario actual
 */
async function getAuthToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
}

/**
 * Registra eventos de autenticación llamando al backend API
 * Esta función ahora es segura porque el backend valida y registra los eventos
 */
export async function logAuthEvent(
    eventType: AuthEventType,
    user: User | null = null,
    details: Record<string, any> = {}
): Promise<void> {
    try {
        const token = await getAuthToken();

        // Si no hay token y el evento requiere autenticación, usar endpoint público
        const endpoint = token ? '/auth/log' : '/auth/log-public';

        await apiPost(endpoint, {
            eventType,
            email: user?.email,
            details,
            userAgent: navigator.userAgent,
        }, {
            requiresAuth: false, // El wrapper añadirá el token si existe en caché, pero no fallará si no hay sesión
            noThrow: true
        });

    } catch (error) { /* empty */ }
}

/**
 * Obtiene los últimos eventos de autenticación para un usuario específico
 * Llama al backend API que valida que el usuario solo pueda ver sus propios logs
 */
export async function getRecentAuthEvents(
    userId: string,
    limit: number = 5
): Promise<AuthLogEntry[]> {
    try {
        // En este caso requerimos autenticación explícita
        const result = await apiGet<{ events: AuthLogEntry[] }>(
            `/auth/logs/${userId}?limit=${limit}`,
            { requiresAuth: true, noThrow: true }
        );

        if (result && 'events' in result) {
            return result.events;
        }
        return [];
    } catch (error) {
        return [];
    }
}

/**
 * Detecta posibles accesos sospechosos basados en patrones de inicio de sesión
 * Retorna true si se detecta actividad sospechosa
 * Llama al backend API que realiza el análisis de forma segura
 */
export async function detectSuspiciousActivity(userId: string): Promise<boolean> {
    try {
        const result = await apiGet<{ isSuspicious: boolean }>(
            `/auth/suspicious/${userId}`,
            { requiresAuth: true, noThrow: true }
        );

        if (result && 'isSuspicious' in result) {
            return result.isSuspicious;
        }
        return false;
    } catch (error) { return false; }
}
