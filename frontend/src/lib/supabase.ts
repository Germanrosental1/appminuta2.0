import { createClient } from '@supabase/supabase-js';
import { getCSRFToken } from '@/utils/csrf';

// Estas variables deberían estar en un archivo .env
// Por ahora las definimos aquí para desarrollo
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Crear el cliente de Supabase con opciones para persistir la sesión
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Configuración para evitar recargas frecuentes
    autoRefreshToken: false, // Desactivar el refresco automático del token
    persistSession: true,
    storage: globalThis.localStorage, // Usar localStorage en lugar de sessionStorage
    detectSessionInUrl: false, // Desactivar la detección de sesión en la URL
    flowType: 'pkce', // Usar PKCE para mayor seguridad
    storageKey: 'supabase-auth-token-24h'
  },
  global: {
    headers: {
      'x-application-name': 'minuta-generator', // Identificar la aplicación
      // CSRF token se agregará dinámicamente en cada request
    },
    fetch: (url, options) => {
      // Interceptor para agregar CSRF token a todas las peticiones
      const csrfToken = getCSRFToken();

      // Crear objeto de opciones con tipo correcto
      const fetchOptions: RequestInit = options || {};

      // Usar Headers API para manejar headers de forma segura independientemente del formato de entrada
      // (Supabase puede pasar headers como objeto, array o instancia de Headers)
      const headers = new Headers(fetchOptions.headers);

      // Solo agregar CSRF en métodos que modifican datos
      const method = fetchOptions.method?.toUpperCase();
      if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        if (csrfToken) {
          headers.set('X-CSRF-Token', csrfToken);
        }
      }

      // Asignar los headers actualizados
      fetchOptions.headers = headers;

      return fetch(url, fetchOptions);
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10 // Limitar eventos en tiempo real
    }
  }
});

// Tipos para los roles de usuario
export type UserRole = 'comercial' | 'administracion';

// Funciones de autenticación
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  try {
    // Obtener la sesión directamente
    // Obtener la sesión directamente
    const { data: sessionData } = await supabase.auth.getSession();

    // Si no hay sesión, no intentar obtener el usuario
    if (!sessionData.session) {
      return null;
    }


    // Usar directamente el usuario de la sesión para evitar una llamada adicional
    const user = sessionData.session.user;

    // Log para depuración


    try {
      // Obtener el rol del usuario desde la tabla de perfiles


      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role') // Seleccionar solo el campo necesario
        .eq('id', user.id)
        .single();



      if (profileError) {
        console.error('Error al obtener el perfil del usuario:', profileError);
        // En caso de error, devolvemos el usuario sin rol
        return {
          ...user,
          role: undefined
        };
      }

      // Devolver el usuario con su rol
      return {
        ...user,
        role: profile?.role as UserRole
      };
    } catch (profileError) {
      console.error('Error al obtener el perfil:', profileError);
      // Si hay un error al obtener el perfil, devolver el usuario sin rol
      return {
        ...user,
        role: undefined
      };
    }
  } catch (error) {
    console.error('Error inesperado al obtener el usuario:', error);
    return null;
  }
}
