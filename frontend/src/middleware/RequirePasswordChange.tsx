import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// Middleware para verificar si el usuario requiere cambio de contraseña
export const useRequirePasswordChange = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const checkPasswordChangeRequired = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('require_password_change, first_login')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        // Si requiere cambio y no está en la página de cambio, redirigir
        if (data?.require_password_change && window.location.pathname !== '/change-password') {
          navigate('/change-password', { replace: true });
        }
      } catch (err) {
        console.error('Error checking password change requirement:', err);
      }
    };

    checkPasswordChangeRequired();
  }, [user, navigate]);
};

// HOC para proteger rutas que requieren verificación de contraseña
export const withPasswordChangeCheck = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    useRequirePasswordChange();
    return <Component {...props} />;
  };
};
