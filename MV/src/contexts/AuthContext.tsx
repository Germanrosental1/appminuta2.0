import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Tipos para los roles de usuario de MV
export type UserRoleMV = 'superadminmv' | 'adminmv' | 'viewerinmobiliariamv' | 'viewermv';

interface Role {
    id: string;
    nombre: string;
    created_at: string;
}

interface Permission {
    id: string;
    nombre: string;
    descripcion: string | null;
}

interface AuthUser extends User {
    roles?: Role[];
    permissions?: Permission[];
    nombre?: string;
    apellido?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;

    // Permission-based checks
    permissions: Permission[];
    roles: Role[];
    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (...permissions: string[]) => boolean;
    hasAllPermissions: (...permissions: string[]) => boolean;
    hasRole: (role: string) => boolean;

    // Method to manually fetch roles
    refreshRoles: (user?: AuthUser) => Promise<Role[]>;

    // Helper properties
    isSuperAdminMV: boolean;
    isAdminMV: boolean;
}

interface UserProfile {
    nombre: string;
    apellido: string;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function: Fetch user profile from database
const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
        const { data: profile, error } = await supabase
            .from('Profiles')
            .select('Nombre, Apellido')
            .eq('Id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }

        // Map PascalCase DB to camelCase Interface
        return {
            nombre: profile.Nombre,
            apellido: profile.Apellido
        } as UserProfile;
    } catch (error) {
        console.error('Exception fetching profile:', error);
        return null;
    }
};

// Helper function: Fetch user roles from usuarios-roles table
const fetchUserRoles = async (userId: string): Promise<Role[]> => {
    console.log('[fetchUserRoles DEBUG] Buscando roles para userId:', userId);
    try {
        // Consulta simple a UsuariosRoles
        const { data: rawData, error: rawError } = await supabase
            .from('UsuariosRoles')
            .select('*')
            .eq('IdUsuario', userId);

        console.log('[fetchUserRoles DEBUG] usuarios-roles:', { rawData, rawError });

        if (!rawData || rawData.length === 0) {
            console.log('[fetchUserRoles DEBUG] No se encontraron asignaciones de rol');
            return [];
        }

        // Obtener TODOS los IDs de roles (PascalCase keys)
        const roleIds = rawData.map((r: any) => r.IdRol);
        console.log('[fetchUserRoles DEBUG] Role IDs a buscar:', roleIds);

        // Consultar todos los roles en una sola query
        const { data: rolesData, error: rolesError } = await supabase
            .from('Roles')
            .select('*')
            .in('Id', roleIds);

        console.log('[fetchUserRoles DEBUG] Roles encontrados:', { rolesData, rolesError });

        if (rolesData && rolesData.length > 0) {
            // Map PascalCase DB to camelCase Interface
            return rolesData.map((r: any) => ({
                id: r.Id,
                nombre: r.Nombre,
                created_at: r.CreatedAt
            })) as Role[];
        }

        return [];
    } catch (error) {
        console.error('Exception fetching roles:', error);
        return [];
    }
};

// Helper function: Enrich auth user with profile data and roles
const enrichUserWithProfile = async (authUser: User): Promise<AuthUser> => {
    const [profile, roles] = await Promise.all([
        fetchUserProfile(authUser.id),
        fetchUserRoles(authUser.id),
    ]);

    return {
        ...authUser,
        roles: roles.length > 0 ? roles : undefined,
        permissions: [],
        nombre: profile?.nombre,
        apellido: profile?.apellido,
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

    // Permission check helpers
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
        const result = roles.some(r => r.nombre === role);
        // DEBUG: Ver qué roles tiene el usuario y por qué hasRole falla
        console.log('[hasRole DEBUG]', {
            checkingRole: role,
            userRoles: roles.map(r => r.nombre),
            result
        });
        return result;
    }, [roles]);

    const refreshRoles = useCallback(async (providedUser?: AuthUser) => {
        const currentUser = providedUser || userRef.current;
        if (!currentUser) {
            return [];
        }

        // If roles are already loaded, return them
        if (currentUser.roles && currentUser.roles.length > 0) {
            setRoles(currentUser.roles);
            return currentUser.roles;
        }

        // Fetch roles from database
        try {
            const fetchedRoles = await fetchUserRoles(currentUser.id);
            setUser(prev => prev ? { ...prev, roles: fetchedRoles } : null);
            setRoles(fetchedRoles);
            return fetchedRoles;
        } catch (e) {
            console.error('Error refreshing roles:', e);
            return [];
        }
    }, []);

    // Load profile in background
    const loadProfileInBackground = useCallback(async (authUser: User) => {
        try {
            const enrichedUser = await enrichUserWithProfile(authUser);
            setUser(enrichedUser);
        } catch (error) {
            console.error('Error loading profile:', error);
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
                console.error('Error checking user:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        // Subscribe to auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setLoading(false);
                    return;
                }

                if (event === 'TOKEN_REFRESHED') {
                    return;
                }

                if (event === 'SIGNED_IN' && session?.user) {
                    enrichUserWithProfile(session.user).then(enrichedUser => {
                        setUser(enrichedUser);
                        setLoading(false);
                    });
                    return;
                }

                if (session?.user) {
                    setUser(session.user as AuthUser);
                    setLoading(false);

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

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [loadProfileInBackground]);

    const signIn = async (email: string, password: string) => {
        try {
            const { error, data } = await supabase.auth.signInWithPassword({ email, password });
            return { error };
        } catch (error) {
            return { error };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    // Helper properties for common role checks
    const isSuperAdminMV = hasRole('superadminmv');
    const isAdminMV = hasRole('adminmv');

    const contextValue = React.useMemo(
        () => ({
            user,
            loading,
            signIn,
            signOut,
            permissions,
            roles,
            hasPermission,
            hasAnyPermission,
            hasAllPermissions,
            hasRole,
            refreshRoles,
            isSuperAdminMV,
            isAdminMV,
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
            refreshRoles,
            isSuperAdminMV,
            isAdminMV,
        ]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
