/**
 * SECURITY: Validación de complejidad de contraseñas para appminuta
 * 
 * Estas funciones pueden usarse para:
 * - Validar contraseñas antes de enviarlas a Supabase Auth
 * - Formularios de cambio de contraseña
 * - Futuro formulario de registro si se implementa
 */

// Sanitizar contraseña removiendo caracteres peligrosos sin afectar complejidad
export function sanitizePassword(password: string): string {
  if (typeof password !== 'string') return '';

  return password
    .trim()
    // Remover caracteres de control peligrosos
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remover NULL bytes
    .replace(/\x00/g, '')
    // Remover secuencias de escape peligrosas
    .replaceAll(/\\x[\da-fA-F]{2}/g, '')
    .replaceAll(/\\u[\da-fA-F]{4}/g, '');
}

// Función auxiliar para validar contraseña y obtener errores específicos
export function validatePasswordComplexity(password: string): {
  valid: boolean;
  errors: string[];
} {
  // Sanitizar primero
  const sanitized = sanitizePassword(password);
  const errors: string[] = [];

  if (sanitized.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }

  if (sanitized.length > 100) {
    errors.push('Máximo 100 caracteres');
  }

  if (!/[A-Z]/.test(sanitized)) {
    errors.push('Una letra mayúscula (A-Z)');
  }

  if (!/[a-z]/.test(sanitized)) {
    errors.push('Una letra minúscula (a-z)');
  }

  if (!/\d/.test(sanitized)) {
    errors.push('Un número (0-9)');
  }

  if (!/[^A-Za-z\d]/.test(sanitized)) {
    errors.push('Un carácter especial (!@#$%...)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Función para calcular la fortaleza de la contraseña (0-100)
export function calculatePasswordStrength(password: string): {
  score: number;
  level: 'muy débil' | 'débil' | 'medio' | 'fuerte' | 'muy fuerte';
  color: string;
} {
  // Sanitizar primero
  const sanitized = sanitizePassword(password);
  let score = 0;

  // Longitud
  if (sanitized.length >= 8) score += 20;
  if (sanitized.length >= 12) score += 10;
  if (sanitized.length >= 16) score += 10;

  // Mayúsculas
  if (/[A-Z]/.test(sanitized)) score += 15;

  // Minúsculas
  if (/[a-z]/.test(sanitized)) score += 15;

  // Números
  if (/\d/.test(sanitized)) score += 15;

  // Caracteres especiales
  if (/[^A-Za-z\d]/.test(sanitized)) score += 15;

  // Nivel de fortaleza y color
  let level: 'muy débil' | 'débil' | 'medio' | 'fuerte' | 'muy fuerte';
  let color: string;

  if (score < 40) {
    level = 'muy débil';
    color = 'text-red-500';
  } else if (score < 60) {
    level = 'débil';
    color = 'text-orange-500';
  } else if (score < 75) {
    level = 'medio';
    color = 'text-yellow-500';
  } else if (score < 90) {
    level = 'fuerte';
    color = 'text-green-500';
  } else {
    level = 'muy fuerte';
    color = 'text-emerald-500';
  }

  return { score, level, color };
}
