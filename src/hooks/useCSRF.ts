import { useEffect } from 'react';
import { getCSRFToken, setCSRFToken } from '@/utils/csrf';

// inicializar CSRF token al montar la aplicación

export const useCSRFProtection = () => {
  useEffect(() => {
    // Verificar si existe token, si no, generar uno
    const token = getCSRFToken();

    if (!token) {
      setCSRFToken();
    } else {

    }

    // Cleanup al desmontar (opcional)
    return () => {
      // No limpiar el token aquí para mantener la sesión
    };
  }, []);
};

// validar CSRF token en formularios

export const useCSRFValidation = () => {
  const validateCSRF = (): boolean => {
    const token = getCSRFToken();

    if (!token) {
      console.error('[CSRF] No se encontró token CSRF');
      return false;
    }

    if (token.length !== 64) {
      console.error('[CSRF] Token CSRF inválido');
      return false;
    }

    return true;
  };

  return { validateCSRF };
};
