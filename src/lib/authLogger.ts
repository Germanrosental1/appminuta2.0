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

/**
 * Registra eventos de autenticación en la tabla auth_logs
 * Esta función ayuda a detectar posibles usos no autorizados de credenciales
 */
export async function logAuthEvent(
  eventType: AuthEventType, 
  user: User | null = null, 
  details: Record<string, any> = {}
): Promise<void> {
  try {
    const logEntry: AuthLogEntry = {
      user_id: user?.id,
      email: user?.email,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      details,
      user_agent: navigator.userAgent
    };

    // Registrar en Supabase
    const { error } = await supabase
      .from('auth_logs')
      .insert([logEntry]);

    if (error) {
      console.error('Error al registrar evento de autenticación:', error);
    }
  } catch (error) {
    console.error('Error al procesar registro de autenticación:', error);
  }
}

/**
 * Obtiene los últimos eventos de autenticación para un usuario específico
 * Útil para mostrar al usuario sus últimos inicios de sesión
 */
export async function getRecentAuthEvents(
  userId: string, 
  limit: number = 5
): Promise<AuthLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('auth_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error al obtener eventos de autenticación:', error);
      return [];
    }

    return data as AuthLogEntry[];
  } catch (error) {
    console.error('Error al procesar consulta de eventos:', error);
    return [];
  }
}

/**
 * Detecta posibles accesos sospechosos basados en patrones de inicio de sesión
 * Retorna true si se detecta actividad sospechosa
 */
export async function detectSuspiciousActivity(userId: string): Promise<boolean> {
  try {
    // Obtener los últimos 10 eventos de inicio de sesión
    const { data, error } = await supabase
      .from('auth_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('event_type', 'login_success')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error || !data || data.length < 2) {
      return false;
    }

    // Implementación simple: si hay más de 5 inicios de sesión en la última hora, es sospechoso
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const recentLogins = data.filter(log => 
      new Date(log.timestamp) > oneHourAgo
    );

    return recentLogins.length > 5;
  } catch (error) {
    console.error('Error al detectar actividad sospechosa:', error);
    return false;
  }
}
