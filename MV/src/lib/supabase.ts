import { createClient } from '@supabase/supabase-js';

// Valores por defecto para desarrollo local
const DEFAULT_URL = 'https://your-project-id.supabase.co';
const DEFAULT_KEY = 'your-anon-key';

// Obtener valores de las variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

// Validar que la URL sea válida
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
};

// Mostrar advertencia si estamos usando valores por defecto
if (supabaseUrl === DEFAULT_URL || supabaseAnonKey === DEFAULT_KEY) {
  console.warn(
    'Supabase: Usando valores por defecto. Por favor configura las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env'
  );
}

// Validar URL antes de crear el cliente
if (!isValidUrl(supabaseUrl)) {
  console.error(`Error: URL de Supabase inválida: ${supabaseUrl}`);
  console.error('Por favor configura una URL válida en la variable VITE_SUPABASE_URL en el archivo .env');
  // En desarrollo, usamos un cliente con una URL válida para evitar que la app se rompa
  // En producción, esto debería fallar para evitar problemas de seguridad
  if (import.meta.env.DEV) {
    console.warn('Usando URL de fallback para desarrollo');
  } else {
    throw new Error(`Invalid supabaseUrl: ${supabaseUrl}. Must be a valid HTTP or HTTPS URL.`);
  }
}

// Crear el cliente de Supabase
export const supabase = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : 'https://example.supabase.co',
  supabaseAnonKey
);
