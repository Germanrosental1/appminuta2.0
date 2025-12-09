/**
 * 🔒 SECURITY: Validación de complejidad de contraseñas para appminuta
 * 
 * Estas funciones pueden usarse para:
 * - Validar contraseñas antes de enviarlas a Supabase Auth
 * - Formularios de cambio de contraseña
 * - Futuro formulario de registro si se implementa
 */

// Función para validar contraseña y obtener errores específicos
export function validatePasswordComplexity(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }
  
  if (password.length > 100) {
    errors.push('Máximo 100 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Una letra mayúscula (A-Z)');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Una letra minúscula (a-z)');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Un número (0-9)');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
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
  let score = 0;

  // Longitud
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Mayúsculas
  if (/[A-Z]/.test(password)) score += 15;

  // Minúsculas
  if (/[a-z]/.test(password)) score += 15;

  // Números
  if (/[0-9]/.test(password)) score += 15;

  // Caracteres especiales
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

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
