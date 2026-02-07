import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { verifyRole, determineRedirect } from '@/utils/roleUtils';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'comercial' | 'administrador' | 'viewer' | 'firmante';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const { user, loading, hasRole, refreshRoles } = useAuth();
    const [checkingPassword, setCheckingPassword] = useState(true);
    const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [redirectPath, setRedirectPath] = useState<string | null>(null);

    // Verificar si requiere cambio de contraseña Y rol
    useEffect(() => {
        const checkRequirements = async () => {
            if (!user) {
                setCheckingPassword(false);
                setIsAuthorized(false);
                return;
            }

            try {
                // 1. Check Password Requirement
                const { data } = await supabase
                    .from('Profiles')
                    .select('RequirePasswordChange')
                    .eq('Id', user.id)
                    .single();

                const pwdRequired = data?.RequirePasswordChange || false;
                setRequiresPasswordChange(pwdRequired);

                if (pwdRequired) {
                    setCheckingPassword(false);
                    return; // Stop checks if password change needed
                }

                // 2. Check Role (Lazy Load)
                if (requiredRole) {
                    const authorized = await verifyRole(requiredRole, hasRole, async () => {
                        await refreshRoles();
                    });
                    setIsAuthorized(authorized);

                    if (!authorized) {
                        const path = await determineRedirect();
                        setRedirectPath(path);
                    }
                } else {
                    setIsAuthorized(true);
                    void refreshRoles(); // Fire and forget
                }

            } catch (err) {
                console.error('Error checking requirements:', err);
                setRequiresPasswordChange(false);
                setIsAuthorized(false);
            } finally {
                setCheckingPassword(false);
            }
        };

        if (!loading) {
            checkRequirements();
        }
    }, [user, loading, requiredRole, hasRole, refreshRoles]);

    if (loading || checkingPassword || isAuthorized === null) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-gray-500">Verificando permisos...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiresPasswordChange) {
        return <Navigate to="/change-password" replace />;
    }

    // Si falló la autorización y tenemos path de redirección
    if (isAuthorized === false) {
        if (redirectPath) {
            return <Navigate to={redirectPath} replace />;
        }
        // Fallback default
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <>{children}</>;
};
