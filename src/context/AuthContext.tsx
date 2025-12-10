import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logAuthEvent } from '../lib/authLogger';

// Tipos para los roles de usuario
export type UserRole = 'comercial' | 'administracion';

interface AuthUser extends User {
  role?: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isComercial: boolean;
  lastActivity: Date | null;
  resetInactivityTimer: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Tiempo de inactividad en minutos antes de cerrar sesión automáticamente
const INACTIVITY_TIMEOUT_MINUTES = 30;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastProcessedEvent, setLastProcessedEvent] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<Date | null>(new Date());
  const inactivityTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Verificar el estado de autenticación inicial
    const checkUser = async () => {
      try {
        console.log('Verificando estado de autenticación inicial...');
        
        // Intentar obtener la sesión directamente de Supabase
        const { data: sessionData } = await supabase.auth.getSession();
        
        console.log('Datos de sesión de Supabase:', sessionData.session ? 'Sesión activa' : 'Sin sesión');
        
        if (sessionData.session) {
          // Si hay sesión, obtener el usuario completo con su rol
          try {
            // Obtener el perfil del usuario directamente
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', sessionData.session.user.id)
              .single();
            
            if (profileError) {
              console.error('Error al obtener perfil:', profileError);
              setUser(sessionData.session.user as AuthUser);
            } else {
              // Crear el usuario completo con su rol
              const userWithRole = {
                ...sessionData.session.user,
                role: profile?.role as UserRole
              };
              
              console.log('Usuario con rol:', userWithRole);
              setUser(userWithRole);
            }
          } catch (error) {
            console.error('Error al obtener usuario tras cambio de autenticación:', error);
            // Usar el usuario de la sesión como fallback
            setUser(sessionData.session.user as AuthUser);
          }
        } else {
          console.log('No hay sesión activa');
          setUser(null);
        }
      } catch (error) {
        console.error('Error al obtener el usuario actual:', error);
        setUser(null);
      } finally {
        console.log('Finalizando estado de carga inicial');
        setLoading(false);
      }
    };

    // Usamos el estado lastProcessedEvent declarado fuera del useEffect
    
    // Suscribirse a cambios en la autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Generar un ID único para este evento
        const eventId = `${event}-${Date.now()}`;
        
        // Evitar procesar eventos duplicados en un corto periodo de tiempo
        if (event === 'SIGNED_IN' && lastProcessedEvent && Date.now() - parseInt(lastProcessedEvent.split('-')[1]) < 60000) {
          console.log('Ignorando evento duplicado de inicio de sesión');
          return;
        }
        
        console.log('Evento de autenticación:', event, session ? 'Con sesión' : 'Sin sesión');
        
        // Actualizar el último evento procesado
        if (event === 'SIGNED_IN') {
          setLastProcessedEvent(eventId);
        }
        
        // Manejar eventos específicos
        if (event === 'SIGNED_OUT') {
          console.log('Usuario cerró sesión');
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refrescado exitosamente');
          // Registrar renovación de token
          if (session?.user) {
            logAuthEvent('token_refreshed', session.user);
          }
          // Mantener la sesión activa
          return;
        }
        
        // Para el evento SIGNED_IN, usar directamente los datos de la sesión
        // sin hacer consultas adicionales que podrían bloquear
        if (session?.user && event === 'SIGNED_IN') {
          console.log('Usuario inició sesión, usando datos básicos');
          
          // Verificar si ya tenemos un usuario con rol
          if (user?.role) {
            console.log('Ya tenemos un usuario con rol, manteniendo estado actual');
            setLoading(false);
            return;
          }
          
          // Usar los datos de la sesión directamente
          const basicUser = session.user as AuthUser;
          setUser(basicUser);
          setLoading(false);
          
          // Obtener el rol en segundo plano sin bloquear
          setTimeout(() => {
            // Usar un bloque try-catch en lugar de .catch()
            try {
              supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single()
                .then(({ data: profile, error: profileError }) => {
                  if (!profileError && profile) {
                    console.log('Perfil obtenido en segundo plano:', profile);
                    setUser({
                      ...session.user,
                      role: profile.role as UserRole
                    });
                  }
                });
            } catch (error) {
              console.error('Error al obtener perfil en segundo plano:', error);
            }
          }, 100);
          
          return;
        }
        
        // Para otros eventos con sesión
        if (session?.user) {
          // Si ya tenemos un usuario con rol, no hacer nada
          if (user?.role) {
            console.log('Manteniendo usuario existente con rol');
            return;
          }
          
          // Usar los datos de la sesión directamente
          setUser(session.user as AuthUser);
          setLoading(false);
          
          // Obtener el rol en segundo plano
          setTimeout(() => {
            try {
              supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single()
                .then(({ data: profile }) => {
                  if (profile) {
                    setUser({
                      ...session.user,
                      role: profile.role as UserRole
                    });
                  }
                });
            } catch (error) {
              // Ignorar errores silenciosamente
            }
          }, 100);
        } else {
          console.log('Sin sesión activa, estableciendo usuario como null');
          setUser(null);
          setLoading(false);
        }
      }
    );

    checkUser();

    // Limpiar suscripción
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Función para reiniciar el temporizador de inactividad
  const resetInactivityTimer = useCallback(() => {
    const now = new Date();
    setLastActivity(now);
    
    // Limpiar el temporizador existente si hay uno
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
    }
    
    // Configurar un nuevo temporizador
    if (user) {
      inactivityTimerRef.current = window.setTimeout(() => {
        console.log('Sesión cerrada por inactividad');
        logAuthEvent('session_expired', user, { reason: 'inactivity' });
        signOut();
      }, INACTIVITY_TIMEOUT_MINUTES * 60 * 1000);
    }
  }, [user]);

  // Efecto para configurar listeners de actividad del usuario
  useEffect(() => {
    if (!user) return;
    
    // Eventos para detectar actividad del usuario
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const handleUserActivity = () => {
      resetInactivityTimer();
    };
    
    // Agregar listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });
    
    // Iniciar el temporizador
    resetInactivityTimer();
    
    // Limpiar listeners al desmontar
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [user, resetInactivityTimer]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // Registrar intento fallido
        logAuthEvent('login_failed', null, { email, error: error.message });
        return { error };
      }
      
      // Registrar inicio de sesión exitoso
      logAuthEvent('login_success', data.user);
      resetInactivityTimer();
      return { error: null };
    } catch (error) {
      // Registrar error inesperado
      logAuthEvent('auth_error', null, { email, error: String(error) });
      return { error };
    }
  };

  const signOut = async () => {
    if (user) {
      // Registrar cierre de sesión
      await logAuthEvent('logout', user);
    }
    
    // Limpiar el temporizador de inactividad
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    await supabase.auth.signOut();
  };

  // Propiedades derivadas para verificar roles
  const isAdmin = user?.role === 'administracion';
  const isComercial = user?.role === 'comercial';

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signOut, 
      isAdmin, 
      isComercial,
      lastActivity,
      resetInactivityTimer
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// El hook useAuth se ha movido a src/hooks/useAuth.ts
