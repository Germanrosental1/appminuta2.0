import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { sanitizePassword } from '@/utils/passwordValidation';
import { setCSRFToken, clearCSRFToken, refreshCSRFToken } from '@/utils/csrf';
import { rbacApi, Role, Permission } from '@/services/rbac';

// Tipos para los roles de usuario (deprecated - usar Role de RBAC)
export type UserRole = 'comercial' | 'administrador' | 'viewer' | 'firmante';

interface AuthUser extends User {
  role?: UserRole; // Deprecated - mantener para backward compatibility
  roles?: Role[]; // New: roles from RBAC system
  permissions?: Permission[]; // New: permissions from RBAC system
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

  // New: Permission-based checks (backend as source of truth)
  permissions: Permission[];
  roles: Role[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  hasAllPermissions: (...permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;

  // Method to manually fetch roles (lazy load)
  refreshRoles: (user?: AuthUser) => Promise<Role[]>;

  // Deprecated but kept for backward compatibility
  isAdmin: boolean;
  isComercial: boolean;
}

interface UserProfile {
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
      .select('nombre, apellido, require_password_change')
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

// Helper function: Enrich auth user with profile data and RBAC permissions
const enrichUserWithProfile = async (authUser: User): Promise<AuthUser> => {
  const profile = await fetchUserProfile(authUser.id);

  // Check if roles are already in JWT (Custom Claims)
  const jwtRoles = authUser.app_metadata?.roles as any[];

  if (!profile) {
    // If no profile, but we have JWT roles, we should return them at least
    if (jwtRoles && jwtRoles.length > 0) {
      return {
        ...authUser,
        roles: jwtRoles,
        permissions: [], // Permissions might not be in JWT yet, or need separate logic
      } as AuthUser;
    }
    return authUser as AuthUser;
  }

  return {
    ...authUser,
    // Prefer JWT roles if available, otherwise undefined (will prompt lazy load if missing)
    roles: jwtRoles || undefined,
    permissions: [],
    nombre: profile.nombre,
    apellido: profile.apellido,
    require_password_change: profile.require_password_change
  } as AuthUser;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const userRef = useRef<AuthUser | null>(null);

  // Keep userRef in sync with user state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Update permissions and roles when user changes
  useEffect(() => {
    if (user?.permissions) {
      setPermissions(user.permissions);
    } else {
      setPermissions([]);
    }

    if (user?.roles) {
      setRoles(user.roles);
    } else {
      setRoles([]);
    }
  }, [user]);

  // Permission check helpers (backend is source of truth)
  const hasPermission = useCallback((permission: string): boolean => {
    return permissions.some(p => p.nombre === permission);
  }, [permissions]);

  const hasAnyPermission = useCallback((...perms: string[]): boolean => {
    return perms.some(p => hasPermission(p));
  }, [hasPermission]);

  const hasAllPermissions = useCallback((...perms: string[]): boolean => {
    return perms.every(p => hasPermission(p));
  }, [hasPermission]);

  const hasRole = useCallback((role: string): boolean => {
    return roles.some(r => r.nombre === role);
  }, [roles]);

  const refreshRoles = useCallback(async (providedUser?: AuthUser) => {
    const currentUser = providedUser || userRef.current;
    if (!currentUser) {
      return [];
    }

    // If roles are already loaded (e.g. from JWT or previous fetch), return them
    if (currentUser.roles && currentUser.roles.length > 0) {
      setRoles(currentUser.roles);
      return currentUser.roles;
    }

    // Fetch roles from API
    try {
      const [fetchedRoles, fetchedPermissions] = await Promise.all([
        rbacApi.getMyRoles(),
        rbacApi.getUserPermissions(currentUser.id),
      ]);

      // Update user object with fetched roles
      setUser(prev => prev ? { ...prev, roles: fetchedRoles, permissions: fetchedPermissions } : null);
      setRoles(fetchedRoles);
      setPermissions(fetchedPermissions);
      return fetchedRoles;
    } catch (e) {
      console.error('Error al cargar roles:', e);
      return [];
    }
  }, []);

  // Memoized function to load profile in background
  const loadProfileInBackground = useCallback(async (authUser: User) => {
    try {
      const enrichedUser = await enrichUserWithProfile(authUser);
      setUser(enrichedUser);
    } catch (error) {
      console.error('Error al cargar perfil en segundo plano:', error);
    }
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
          console.log('[AuthContext] SIGNED_OUT event');
          setUser(null);
          setLoading(false);
          return;
        }

        // Ignore token refresh events
        if (event === 'TOKEN_REFRESHED') {
          return;
        }

        // Handle sign in
        if (event === 'SIGNED_IN' && session?.user) {
          // CRITICAL: Immediately enrich with JWT roles for instant redirect
          enrichUserWithProfile(session.user).then(enrichedUser => {
            setUser(enrichedUser);
            setLoading(false);
          });
          return;
        }

        // Handle other events with session
        if (session?.user) {
          setUser(session.user as AuthUser);
          setLoading(false);

          // Load profile in background if not already loaded
          if (!user?.roles || user.roles.length === 0) {
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
  // Mantener backward compatibility usando el nuevo sistema de roles
  const isAdmin = hasRole('administrador');
  const isComercial = hasRole('comercial');

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      updatePassword,
      permissions,
      roles,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      refreshRoles,
      isAdmin,
      isComercial
    }),
    [
      user,
      loading,
      permissions,
      roles,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      isAdmin,
      isComercial
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// El hook useAuth se ha movido a src/hooks/useAuth.ts
