import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRoleMV } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: UserRoleMV;
    requireAnyRole?: UserRoleMV[];
}

/**
 * Componente para proteger rutas que requieren autenticación
 * Opcionalmente puede verificar si el usuario tiene un rol específico
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRole,
    requireAnyRole
}) => {
    const { user, loading, hasRole } = useAuth();

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-gray-500">Cargando...</p>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check specific role if required
    if (requiredRole && !hasRole(requiredRole)) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen p-4">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
                    <p className="text-gray-600 mb-4">
                        No tienes los permisos necesarios para acceder a esta página.
                    </p>
                    <Navigate to="/" replace />
                </div>
            </div>
        );
    }

    // Check if has any of multiple required roles
    if (requireAnyRole && !requireAnyRole.some(role => hasRole(role))) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen p-4">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
                    <p className="text-gray-600 mb-4">
                        No tienes los permisos necesarios para acceder a esta página.
                    </p>
                    <Navigate to="/" replace />
                </div>
            </div>
        );
    }

    // User is authenticated and has required role, render children
    return <>{children}</>;
};
