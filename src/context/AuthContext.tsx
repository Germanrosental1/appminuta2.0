import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { sanitizePassword } from '@/utils/passwordValidation';
import { setCSRFToken, clearCSRFToken, refreshCSRFToken } from '@/utils/csrf';

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
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  isAdmin: boolean;
  isComercial: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastProcessedEvent, setLastProcessedEvent] = useState<string | null>(null);

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
          // No hacer nada especial, solo mantener la sesión activa
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

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      
      if (!error && data.user) {
        // Generar CSRF token tras login exitoso
        setCSRFToken();
        
        // Verificar si requiere cambio de contraseña
        const { data: profile } = await supabase
          .from('profiles')
          .select('require_password_change, first_login')
          .eq('id', data.user.id)
          .single();
        
        // Si requiere cambio, no hacer nada más - el middleware redirigirá
        if (profile?.require_password_change) {
          console.log('Usuario requiere cambio de contraseña');
        }
      }
      
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    // Limpiar CSRF token al cerrar sesión
    clearCSRFToken();
    await supabase.auth.signOut();
  };

  const updatePassword = async (newPassword: string) => {
    try {
      // Sanitizar contraseña
      const sanitized = sanitizePassword(newPassword);
      
      const { error } = await supabase.auth.updateUser({
        password: sanitized
      });
      
      if (!error && user) {
        // Refrescar CSRF token tras cambio de contraseña
        refreshCSRFToken();
        
        // Actualizar flags en el perfil
        await supabase
          .from('profiles')
          .update({
            require_password_change: false,
            first_login: false
          })
          .eq('id', user.id);
      }
      
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Propiedades derivadas para verificar roles
  const isAdmin = user?.role === 'administracion';
  const isComercial = user?.role === 'comercial';

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, updatePassword, isAdmin, isComercial }}>
      {children}
    </AuthContext.Provider>
  );
};

// El hook useAuth se ha movido a src/hooks/useAuth.ts
