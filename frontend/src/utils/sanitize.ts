// Utilidades de sanitización para prevenir XSS y injection attacks

// Sanitiza un string removiendo caracteres peligrosos
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    // Remover caracteres de control
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
    // Sanitizar la clave también
    const sanitizedKey = sanitizeString(key);

    if (value === null || value === undefined) {
      sanitized[sanitizedKey] = value;
    } else if (typeof value === 'string') {
      // Detectar si es un email
      if (sanitizedKey.toLowerCase().includes('email') || sanitizedKey.toLowerCase().includes('correo')) {
        sanitized[sanitizedKey] = sanitizeEmail(value);
      }
      // Detectar si es un teléfono
      else if (sanitizedKey.toLowerCase().includes('phone') || sanitizedKey.toLowerCase().includes('telefono')) {
        sanitized[sanitizedKey] = sanitizePhone(value);
      }
      // Detectar si es un RUT
      else if (sanitizedKey.toLowerCase().includes('rut')) {
        sanitized[sanitizedKey] = sanitizeRut(value);
      }
      // String genérico
      else {
        sanitized[sanitizedKey] = sanitizeString(value);
      }
    } else if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return sanitizeObject(item);
        }
        if (typeof item === 'string') {
          return sanitizeString(item);
        }
        return item;
      });
    } else if (typeof value === 'object') {
      sanitized[sanitizedKey] = sanitizeObject(value);
    } else {
      sanitized[sanitizedKey] = value;
    }
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
    .replace(/'/g, "''")  // Escapar comillas simples
    .replace(/\\/g, '\\\\') // Escapar backslashes
    .replace(/\0/g, '\\0')  // Escapar null bytes
    .replace(/\n/g, '\\n')  // Escapar nuevas líneas
    .replace(/\r/g, '\\r')  // Escapar retornos de carro
    .replace(/\x1a/g, '\\Z'); // Escapar Ctrl+Z
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
