import { useEffect } from 'react';
import { getCSRFToken, setCSRFToken } from '@/utils/csrf';

/**
 * Hook para inicializar CSRF token al montar la aplicación
 * Usar en App.tsx o en el componente raíz
 */
export const useCSRFProtection = () => {
  useEffect(() => {
    // Verificar si existe token, si no, generar uno
    const token = getCSRFToken();
    
    if (!token) {
      console.log('[CSRF] Token no encontrado, generando nuevo token');
      setCSRFToken();
    } else {
      console.log('[CSRF] Token existente encontrado');
    }
    
    // Cleanup al desmontar (opcional)
    return () => {
      // No limpiar el token aquí para mantener la sesión
    };
  }, []);
};

/**
 * Hook para validar CSRF token en formularios
 * Devuelve una función para incluir en onSubmit
 */
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
