import { z } from 'zod';
import { sanitizeString } from '@/utils/sanitize';

// Schema de validación de contraseña con complejidad alta
export const passwordSchema = z.string()
  .transform((val) => sanitizeString(val)) // Sanitizar antes de validar
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(100, 'La contraseña no puede exceder 100 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una letra minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial (!@#$%^&*...)');

// Schema para validar confirmación de contraseña
export const passwordConfirmSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

// Tipo inferido
export type PasswordValidation = z.infer<typeof passwordSchema>;
export type PasswordConfirmValidation = z.infer<typeof passwordConfirmSchema>;

// Función auxiliar para validar contraseña y obtener errores específicos
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
    errors.push('Falta una letra mayúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Falta una letra minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Falta un número');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Falta un carácter especial (!@#$%^&*...)');
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

  // Nivel de fortaleza
  let level: 'muy débil' | 'débil' | 'medio' | 'fuerte' | 'muy fuerte';
  
  if (score < 40) level = 'muy débil';
  else if (score < 60) level = 'débil';
  else if (score < 75) level = 'medio';
  else if (score < 90) level = 'fuerte';
  else level = 'muy fuerte';

  return { score, level };
}
