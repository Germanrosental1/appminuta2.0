import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { VerifyMFA } from '@/components/auth/VerifyMFA';
import { EnrollMFA } from '@/components/auth/EnrollMFA';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

type MFAState = 'checking' | 'login' | 'verify' | 'enroll' | 'complete';

export const LoginPage: React.FC = () => {
    const { user, loading, refreshRoles } = useAuth();
    const navigate = useNavigate();
    const [mfaState, setMfaState] = useState<MFAState>('checking');
    const [verifyingRoles, setVerifyingRoles] = useState(false);
    const hasRedirected = useRef(false);

    // Check MFA status after authentication
    const checkMFAStatus = async () => {
        try {
            const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

            if (error) {
                // 🔒 SECURITY: No permitir bypass en error - cerrar sesión
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
                // 🔒 SECURITY: No permitir bypass en error
                console.error('Error listing factors:', factorsError);
                await supabase.auth.signOut();
                setMfaState('login');
                return;
            }

            const hasVerifiedFactor = factors?.totp?.some(f => f.status === 'verified');

            if (!hasVerifiedFactor) {
                // No MFA enrolled - require enrollment for MV users
                setMfaState('enroll');
            } else {
                // Has factor but needs verification
                setMfaState('verify');
            }
        } catch (err) {
            // 🔒 SECURITY: No permitir bypass en error
            console.error('MFA check error:', err);
            await supabase.auth.signOut();
            setMfaState('login');
        }
    };

    // Redirect after MFA is complete
    const performRedirect = async (currentUser: typeof user) => {
        if (!currentUser) return;

        hasRedirected.current = true;
        setVerifyingRoles(true);

        try {
            await refreshRoles(currentUser);
            navigate('/', { replace: true });
        } catch (error) {
            console.error('Error verificando roles:', error);
            navigate('/', { replace: true });
        } finally {
            setVerifyingRoles(false);
        }
    };

    useEffect(() => {
        if (!user) {
            hasRedirected.current = false;
            setMfaState('login');
            return;
        }

        if (loading || hasRedirected.current) {
            return;
        }

        // User is authenticated, check MFA status
        if (mfaState === 'checking' || mfaState === 'login') {
            checkMFAStatus();
        }
    }, [user, loading]);

    // Handle MFA completion
    useEffect(() => {
        if (mfaState === 'complete' && user && !hasRedirected.current) {
            performRedirect(user);
        }
    }, [mfaState, user]);

    // Loading states
    if (loading || mfaState === 'checking' || verifyingRoles) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-gray-600">
                    {verifyingRoles ? 'Verificando acceso...' : 'Cargando...'}
                </p>
            </div>
        );
    }

    // Show MFA verification screen
    if (mfaState === 'verify') {
        return (
            <VerifyMFA
                onVerified={() => setMfaState('complete')}
                onCancel={async () => {
                    await supabase.auth.signOut();
                    setMfaState('login');
                }}
            />
        );
    }

    // Show MFA enrollment screen (mandatory for MV)
    if (mfaState === 'enroll') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="space-y-4">
                    <EnrollMFA
                        onEnrolled={() => setMfaState('complete')}
                        onCancelled={async () => {
                            await supabase.auth.signOut();
                            setMfaState('login');
                        }}
                    />
                    <p className="text-xs text-center text-muted-foreground">
                        La autenticación de dos factores es obligatoria para acceder a Mapa de Ventas
                    </p>
                </div>
            </div>
        );
    }

    // Show login form
    return <LoginForm />;
};

