import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';

export const LoginPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    // Solo proceder si no está cargando
    if (!loading) {
      // Si hay un usuario autenticado
      if (user) {


        // Verificar si el usuario tiene un rol definido
        if (user.role === undefined) {
          // Si no tiene rol, mostrar un mensaje o redirigir a una página de error
          console.error('El usuario no tiene un rol definido');
          // Por defecto, redirigir a una página de perfil incompleto
          navigate('/perfil-incompleto');
        } else {
          // Redirigir según el rol del usuario
          if (user.role === 'administracion') {

            navigate('/admin/dashboard');
          } else {

            navigate('/comercial/dashboard');
          }
        }
        setRedirectAttempted(true);
      } else if (!redirectAttempted) {
        // Si no hay usuario y no se ha intentado redireccionar antes,
        // marcar que ya se intentó para evitar bucles
        setRedirectAttempted(true);

      }
    }
  }, [user, loading, navigate, redirectAttempted]);

  // Mostrar pantalla de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <LoginForm />;
};
