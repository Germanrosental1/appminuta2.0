import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';

export const LoginPage: React.FC = () => {
  const { user, loading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [verifyingRoles, setVerifyingRoles] = useState(false);
  const hasRedirected = useRef(false);

  // Helper function to check if user has a specific role
  const hasRole = (roles: Array<{ nombre: string }>, roleName: string): boolean => {
    return roles.some(r => r.nombre === roleName);
  };

  // Helper function to determine redirect path based on user roles
  const getRedirectPath = (roles: Array<{ nombre: string }>): string => {
    if (hasRole(roles, 'administrador')) {
      return '/admin/dashboard';
    } else if (hasRole(roles, 'comercial')) {
      return '/comercial/dashboard';
    } else if (hasRole(roles, 'firmante')) {
      return '/firmante/dashboard';
    } else if (hasRole(roles, 'viewer')) {
      return '/viewer/dashboard';
    } else {
      return '/perfil-incompleto';
    }
  };

  // Handle redirect after role verification
  const performRedirect = async (currentUser: typeof user) => {
    if (!currentUser) return;

    hasRedirected.current = true;

    // FAST PATH: Use roles already in user object (from JWT)
    if (currentUser.roles && currentUser.roles.length > 0) {
      const redirectPath = getRedirectPath(currentUser.roles);
      navigate(redirectPath, { replace: true });
      return;
    }

    // FALLBACK: Fetch roles from API only if not in JWT
    setVerifyingRoles(true);
    try {
      const roles = await refreshRoles(currentUser);
      const redirectPath = getRedirectPath(roles);
      navigate(redirectPath, { replace: true });
    } catch (error) {
      console.error('Error verifying roles:', error);
      navigate('/perfil-incompleto', { replace: true });
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

  // Mostrar pantalla de carga mientras se verifica la autenticación o los roles
  if (loading || verifyingRoles) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user exists, we're redirecting (or about to), don't show login form
  if (user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased">
      {/* Background Decor: Subtle Gradient */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-200 dark:from-[#0f141e] dark:to-[#1a2233] opacity-80"></div>
        {/* Glow effect */}
        <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]"></div>
      </div>

      {/* Main Content */}
      <div className="layout-container flex h-full grow flex-col z-10 justify-center items-center p-4">
        <LoginForm />

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-slate-400 dark:text-slate-600 text-xs">
            © 2025 AppMinuta. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};
