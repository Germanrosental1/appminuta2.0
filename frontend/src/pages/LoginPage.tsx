import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';

export const LoginPage: React.FC = () => {
  const { user, loading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [verifyingRoles, setVerifyingRoles] = useState(false);
  const hasRedirected = useRef(false);

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
    const performRedirect = async () => {
      hasRedirected.current = true;
      setVerifyingRoles(true);

      try {
        const roles = await refreshRoles(user);

        const hasRole = (name: string) => roles.some(r => r.nombre === name);

        if (hasRole('administrador')) {
          navigate('/admin/dashboard', { replace: true });
        } else if (hasRole('comercial')) {
          navigate('/comercial/dashboard', { replace: true });
        } else {
          console.error('[LoginPage] User has no recognized roles');
          navigate('/perfil-incompleto', { replace: true });
        }
      } catch (error) {
        console.error('[LoginPage] Error in performRedirect:', error);
        navigate('/perfil-incompleto', { replace: true });
      } finally {
        setVerifyingRoles(false);
      }
    };

    performRedirect();
    // refreshRoles is stable (no dependencies) so we don't need it in the deps array
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <LoginForm />;
};
