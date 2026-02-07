import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

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

// URL base del backend API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:3000';

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
        const endpoint = token ? '/api/auth/log' : '/api/auth/log-public';

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                eventType,
                email: user?.email,
                details,
                userAgent: navigator.userAgent,
            }),
        });

        if (!response.ok) { /* empty */ }
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
        const token = await getAuthToken();

        if (!token) {
            return [];
        }

        const response = await fetch(
            `${API_BASE_URL}/api/auth/logs/${userId}?limit=${limit}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) { return []; }

        const data = await response.json();
        return data.events as AuthLogEntry[];
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
        const token = await getAuthToken();

        if (!token) {
            return false;
        }

        const response = await fetch(
            `${API_BASE_URL}/api/auth/suspicious/${userId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) { return false; }

        const data = await response.json();
        return data.isSuspicious;
    } catch (error) { return false; }
}
