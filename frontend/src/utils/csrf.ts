// CSRF Token Management
// Genera y valida tokens CSRF para prevenir Cross-Site Request Forgery

// Nombre de la cookie que espera el backend
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_STORAGE_KEY = 'xsrf_token';

// Genera un token CSRF criptográficamente seguro
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Almacena el token CSRF en sessionStorage y cookie
export const setCSRFToken = (): string => {
  const token = generateCSRFToken();

  // Guardar en sessionStorage
  sessionStorage.setItem(CSRF_STORAGE_KEY, token);

  // Guardar en cookie (debe coincidir con lo que espera el backend)
  // HttpOnly: false para que JS pueda leerla
  document.cookie = `${CSRF_COOKIE_NAME}=${token}; path=/; SameSite=Strict`;

  return token;
};

// Obtiene el token CSRF actual
export const getCSRFToken = (): string | null => {
  // Intentar desde sessionStorage primero
  let token = sessionStorage.getItem(CSRF_STORAGE_KEY);

  // Si no existe, intentar desde cookie
  if (!token) {
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(c => c.trim().startsWith(`${CSRF_COOKIE_NAME}=`));
    if (csrfCookie) {
      token = csrfCookie.split('=')[1];
      // Sincronizar con sessionStorage
      sessionStorage.setItem(CSRF_STORAGE_KEY, token);
    }
  }

  // Si aún no existe, generar uno nuevo
  if (!token) {
    token = setCSRFToken();
  }

  return token;
};

// Valida un token CSRF
export const validateCSRFToken = (token: string): boolean => {
  const storedToken = getCSRFToken();
  return storedToken !== null && storedToken === token && token.length === 64;
};

// Elimina el token CSRF (usar en logout)
export const clearCSRFToken = (): void => {
  sessionStorage.removeItem(CSRF_STORAGE_KEY);
  document.cookie = `${CSRF_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
};

// Refresca el token CSRF (usar después de operaciones sensibles)
export const refreshCSRFToken = (): string => {
  clearCSRFToken();
  return setCSRFToken();
};

// Obtiene el token desde el header de una respuesta (para validación server-side)
export const getCSRFTokenFromResponse = (response: Response): string | null => {
  return response.headers.get('X-CSRF-Token');
};

// Hook para React - Inicializa CSRF token al montar componente
export const useCSRFToken = () => {
  const token = getCSRFToken();
  return {
    token,
    refresh: refreshCSRFToken,
    clear: clearCSRFToken,
    validate: (t: string) => validateCSRFToken(t),
  };
};
