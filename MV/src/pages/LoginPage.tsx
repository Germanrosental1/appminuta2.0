import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';

import { supabase } from '@/lib/supabase';

export const LoginPage: React.FC = () => {
    const { user, loading, refreshRoles } = useAuth();
    const navigate = useNavigate();
    const [verifyingRoles, setVerifyingRoles] = useState(false);
    const [mfaState, setMfaState] = useState<'login' | 'enroll' | 'verify' | 'complete'>('login');
    const hasRedirected = useRef(false);

    // Check MFA status after authentication
    const checkMFAStatus = async () => {
        try {
            const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

            if (error) {
                // No permitir bypass en error - cerrar sesión
                console.error('Error checking MFA:', error);
                await supabase.auth.signOut();
                setMfaState('login');
                return;
            }

            // User needs to verify MFA (has factor but hasn't verified yet)
            if (data.nextLevel === 'aal2' && data.currentLevel === 'aal1') {
                setMfaState('verify');
                return;
            }

            // User has completed MFA verification
            if (data.currentLevel === 'aal2') {
                setMfaState('complete');
                return;
            }

            // Check if user has any TOTP factors enrolled
            const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

            if (factorsError) {
                // No permitir bypass en error
                console.error('Error listing factors:', factorsError);
                await supabase.auth.signOut();
                setMfaState('login');
                return;
            }

            const hasVerifiedFactor = factors?.totp?.some(f => f.status === 'verified');

            if (hasVerifiedFactor) {
                // Has factor but needs verification
                setMfaState('verify');
            } else {
                // No MFA enrolled - require enrollment for MV users
                setMfaState('enroll');
            }
        } catch (err) {
            // No permitir bypass en error
            console.error('MFA check error:', err);
            await supabase.auth.signOut();
            setMfaState('login');
        }
    };

    // Helper function to determine redirect path based on user roles
    const getRedirectPath = (roles: Array<{ nombre: string }>): string => {
        // Todos los usuarios van al dashboard principal
        // El sistema mostrará solo los proyectos y opciones según su rol
        return '/';
    };

    // Handle redirect after role verification
    const performRedirect = async (currentUser: typeof user) => {
        if (!currentUser) return;

        hasRedirected.current = true;
        setVerifyingRoles(true);

        try {
            const roles = await refreshRoles(currentUser);
            const redirectPath = getRedirectPath(roles);
            navigate(redirectPath, { replace: true });
        } catch (error) {
            console.error('Error verificando roles:', error);
            navigate('/', { replace: true });
        } finally {
            setVerifyingRoles(false);
        }
    };

    useEffect(() => {
        // Reset redirect flag when user logs out
        if (!user) {
            hasRedirected.current = false;
            return;
        }

        // If still loading or already redirected, skip
        if (loading || hasRedirected.current) {
            return;
        }

        // User exists and we haven't redirected yet - do it now
        performRedirect(user);
    }, [user, loading, navigate]);

    // Show loading screen while verifying authentication or roles
    if (loading || verifyingRoles) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-gray-600">Verificando acceso...</p>
            </div>
        );
    }

    // If user exists, we're redirecting (or about to), don't show login form
    if (user) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-gray-600">Redirigiendo...</p>
            </div>
        );
    }

    return <LoginForm />;
};
