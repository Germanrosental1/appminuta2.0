import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { sanitizePassword } from '@/utils/passwordValidation';
import { setCSRFToken, clearCSRFToken, refreshCSRFToken } from '@/utils/csrf';

// Tipos para los roles de usuario
export type UserRole = 'comercial' | 'administracion';

interface AuthUser extends User {
  role?: UserRole;
  nombre?: string;
  apellido?: string;
  require_password_change?: boolean;
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

interface UserProfile {
  role: UserRole;
  nombre: string;
  apellido: string;
  require_password_change: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function: Fetch user profile from database
const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, nombre, apellido, require_password_change')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error al obtener perfil:', error);
      return null;
    }

    return profile as UserProfile;
  } catch (error) {
    console.error('Error al obtener perfil del usuario:', error);
    return null;
  }
};

// Helper function: Enrich auth user with profile data
const enrichUserWithProfile = async (authUser: User): Promise<AuthUser> => {
  const profile = await fetchUserProfile(authUser.id);

  if (!profile) {
    return authUser as AuthUser;
  }

  return {
    ...authUser,
    role: profile.role,
    nombre: profile.nombre,
    apellido: profile.apellido,
    require_password_change: profile.require_password_change
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const lastSignInTime = useRef<number>(0);

  // Memoized function to load profile in background
  const loadProfileInBackground = useCallback((authUser: User) => {
    setTimeout(async () => {
      try {
        const enrichedUser = await enrichUserWithProfile(authUser);
        setUser(enrichedUser);
      } catch (error) {
        console.error('Error al cargar perfil en segundo plano:', error);
      }
    }, 100);
  }, []);

  useEffect(() => {
    // Check initial authentication state
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setUser(null);
          return;
        }

        const enrichedUser = await enrichUserWithProfile(session.user);
        setUser(enrichedUser);
      } catch (error) {
        console.error('Error al obtener el usuario actual:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Handle sign out
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
          return;
        }

        // Ignore token refresh events
        if (event === 'TOKEN_REFRESHED') {
          return;
        }

        // Handle sign in with deduplication
        if (event === 'SIGNED_IN' && session?.user) {
          const now = Date.now();

          // Prevent duplicate sign-in events within 60 seconds
          if (now - lastSignInTime.current < 60000) {
            return;
          }

          lastSignInTime.current = now;

          // Set basic user immediately for fast UI response
          setUser(session.user as AuthUser);
          setLoading(false);

          // Load full profile in background
          loadProfileInBackground(session.user);
          return;
        }

        // Handle other events with session
        if (session?.user) {
          setUser(session.user as AuthUser);
          setLoading(false);

          // Load profile in background if not already loaded
          if (!(user?.role)) {
            loadProfileInBackground(session.user);
          }
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    checkUser();

    // Cleanup subscription
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [loadProfileInBackground]);

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
        // Si requiere cambio, el middleware se encargará de redirigir
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

        // Actualizar flags en el perfil usando RPC seguro (bypassing RLS)
        const { error: rpcError } = await supabase.rpc('update_password_flags');

        if (rpcError) {
          console.error('Error al actualizar flags de perfil vía RPC:', rpcError);
          // Intentar fallback directo por si acaso (aunque probablemente falle si RLS lo bloquea)
          await supabase
            .from('profiles')
            .update({
              require_password_change: false,
              first_login: false
            })
            .eq('id', user.id);
        }
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Propiedades derivadas para verificar roles
  const isAdmin = user?.role === 'administracion';
  const isComercial = user?.role === 'comercial';

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(
    () => ({ user, loading, signIn, signOut, updatePassword, isAdmin, isComercial }),
    [user, loading, isAdmin, isComercial]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// El hook useAuth se ha movido a src/hooks/useAuth.ts
