import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// Componente especial para la página de cambio de contraseña 
// Solo permite acceso si el usuario está autenticado Y requiere cambio de contraseña
export const PasswordChangeRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading, hasRole } = useAuth();

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-gray-500">Cargando...</p>
            </div>
        );
    }

    // Si no hay usuario, login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Si NO requiere cambio de contraseña, redirigir al dashboard según rol RBAC
    if (!user.RequirePasswordChange) {
        // comercial → dashboard comercial
        // administrador, firmante, viewer → dashboard admin
        if (hasRole('comercial')) {
            return <Navigate to="/comercial/dashboard" replace />;
        } else {
            return <Navigate to="/admin/dashboard" replace />;
        }
    }

    return <>{children}</>;
};
