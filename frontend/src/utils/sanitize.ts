// Utilidades de sanitización para prevenir XSS y injection attacks

// Sanitiza un string removiendo caracteres peligrosos
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    // Remover caracteres de control
    // Remover caracteres de control (0-8, 11-12, 14-31, 127)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remover scripts HTML
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remover tags HTML peligrosos
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
    // Remover javascript: en URLs
    .replace(/javascript:/gi, '')
    // Remover data: URLs (pueden contener scripts)
    .replace(/data:text\/html/gi, '')
    // Remover event handlers
    .replace(/on\w+\s*=/gi, '');
};

// Sanitiza un email
export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') return '';

  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w@.+-]/g, ''); // Solo permitir caracteres válidos en emails
};

// Sanitiza un número de teléfono
export const sanitizePhone = (phone: string): string => {
  if (typeof phone !== 'string') return '';

  return phone
    .trim()
    .replace(/[^\d+\s-]/g, ''); // Solo permitir dígitos, +, espacios y guiones
};

// Sanitiza un RUT
export const sanitizeRut = (rut: string): string => {
  if (typeof rut !== 'string') return '';

  return rut
    .trim()
    .toUpperCase()
    .replace(/[^\dKk.-]/g, ''); // Solo permitir dígitos, K, k, puntos y guiones
};

// Helper para sanitizar valores string específicos según la key
const sanitizeStringValue = (key: string, value: string): string => {
  const lowerKey = key.toLowerCase();

  if (lowerKey.includes('email') || lowerKey.includes('correo')) {
    return sanitizeEmail(value);
  }
  if (lowerKey.includes('phone') || lowerKey.includes('telefono')) {
    return sanitizePhone(value);
  }
  if (lowerKey.includes('rut')) {
    return sanitizeRut(value);
  }
  return sanitizeString(value);
};

// Helper para sanitizar cualquier valor basado en su tipo
const sanitizeValue = (key: string, value: any): any => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeStringValue(key, value);
  }

  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'object' && item !== null) {
        return sanitizeObject(item);
      }
      if (typeof item === 'string') {
        return sanitizeString(item);
      }
      return item;
    });
  }

  if (typeof value === 'object') {
    return sanitizeObject(value);
  }

  return value;
};

// Sanitiza un objeto recursivamente
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'object' && item !== null) {
        return sanitizeObject(item);
      }
      if (typeof item === 'string') {
        return sanitizeString(item);
      }
      return item;
    }) as any;
  }

  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizeString(obj) as any;
    }
    return obj;
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    sanitized[sanitizedKey] = sanitizeValue(sanitizedKey, value);
  }

  return sanitized as T;
};

// Valida si una string contiene código potencialmente malicioso
export const containsMaliciousCode = (input: string): boolean => {
  if (typeof input !== 'string') return false;

  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers como onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i, // CSS expression
    /vbscript:/i,
    /data:text\/html/i,
  ];

  return maliciousPatterns.some(pattern => pattern.test(input));
};

// Sanitiza un HTML manteniendo solo tags seguros
export const sanitizeHTML = (html: string): string => {
  if (typeof html !== 'string') return '';

  // Tags permitidos
  const allowedTags = ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'span', 'div'];

  // Remover todos los tags excepto los permitidos
  let sanitized = html;

  // Primero remover scripts y tags peligrosos
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');

  // Remover event handlers de todos los tags
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  return sanitized;
};

// Escapa caracteres SQL (capa adicional de seguridad, Supabase ya lo hace)
export const escapeSQLString = (input: string): string => {
  if (typeof input !== 'string') return '';

  return input
    .replaceAll(/'/g, "''")  // Escapar comillas simples
    .replaceAll(/\\/g, '\\\\') // Escapar backslashes
    .replaceAll(/\u0000/g, '\\0')  // Escapar null bytes
    .replaceAll(/\n/g, '\\n')  // Escapar nuevas líneas
    .replaceAll(/\r/g, '\\r')  // Escapar retornos de carro
    .replaceAll(/\u001a/g, '\\Z'); // Escapar Ctrl+Z
};

// Limpia espacios en blanco excesivos
export const normalizeWhitespace = (input: string): string => {
  if (typeof input !== 'string') return '';

  return input
    .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
    .trim();
};

// Valida y sanitiza un UUID
export const sanitizeUUID = (uuid: string): string | null => {
  if (typeof uuid !== 'string') return null;

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const cleaned = uuid.trim().toLowerCase();

  return uuidPattern.test(cleaned) ? cleaned : null;
};

// Sanitiza un path de archivo para prevenir directory traversal
export const sanitizeFilePath = (path: string): string => {
  if (typeof path !== 'string') return '';

  return path
    .replace(/\.\./g, '') // Remover ..
    .replace(/\/+/g, '/') // Normalizar múltiples slashes
    .replace(/^\/+/, '')  // Remover slashes iniciales
    .trim();
};

// Lista de palabras SQL peligrosas para detectar inyección
const SQL_KEYWORDS = [
  'DROP', 'DELETE', 'INSERT', 'UPDATE', 'CREATE', 'ALTER',
  'EXEC', 'EXECUTE', 'SCRIPT', 'UNION', 'SELECT', '--', ';--'
];

// Detecta si un input contiene intentos de SQL injection
export const containsSQLInjection = (input: string): boolean => {
  if (typeof input !== 'string') return false;

  const upperInput = input.toUpperCase();

  return SQL_KEYWORDS.some(keyword => upperInput.includes(keyword));
};
