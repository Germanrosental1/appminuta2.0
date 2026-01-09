import { z, ZodError } from 'zod';
import { sanitizeObject } from './sanitize';

// Clase de error personalizada para errores de validación
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ field: string; message: string; code?: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
    
    // Mantener el stack trace correcto (solo en Node.js)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, ValidationError);
    }
  }

  // Convierte el error a un objeto serializable
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errors: this.errors,
    };
  }

  // Obtiene todos los mensajes de error concatenados
  getAllMessages(): string {
    return this.errors.map(e => `${e.field}: ${e.message}`).join('; ');
  }

  // Obtiene errores agrupados por campo
  getErrorsByField(): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};
    
    this.errors.forEach(error => {
      if (!grouped[error.field]) {
        grouped[error.field] = [];
      }
      grouped[error.field].push(error.message);
    });
    
    return grouped;
  }
}

// Formatea errores de Zod a nuestro formato personalizado
const formatZodErrors = (zodError: ZodError): Array<{ field: string; message: string; code?: string }> => {
  return zodError.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
};

// Valida y sanitiza datos contra un schema Zod (lanza ValidationError si falla)
export const validateRequest = <T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> => {
  try {
    // 1. Sanitizar primero (solo si es objeto)
    const sanitized = typeof data === 'object' && data !== null
      ? sanitizeObject(data as Record<string, any>)
      : data;
    
    // 2. Validar con Zod
    const result = schema.parse(sanitized);
    
    return result;
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = formatZodErrors(error);
      
      throw new ValidationError(
        'Validación fallida: ' + formattedErrors.map(e => e.message).join(', '),
        formattedErrors
      );
    }
    
    // Re-lanzar otros errores
    throw error;
  }
};

// Resultado de validación segura
export type SafeValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; errors: Array<{ field: string; message: string; code?: string }> };

// Valida de forma segura sin lanzar excepción
export const safeValidate = <T extends z.ZodType>(
  schema: T,
  data: unknown
): SafeValidationResult<z.infer<T>> => {
  try {
    // 1. Sanitizar primero
    const sanitized = typeof data === 'object' && data !== null
      ? sanitizeObject(data as Record<string, any>)
      : data;
    
    // 2. Validar con Zod
    const result = schema.safeParse(sanitized);
    
    if (result.success) {
      return { success: true, data: result.data };
    }
    
    return {
      success: false,
      errors: formatZodErrors(result.error),
    };
  } catch (error) {
    return {
      success: false,
      errors: [{ 
        field: 'unknown', 
        message: error instanceof Error ? error.message : 'Error de validación desconocido'
      }],
    };
  }
};

// Valida parcialmente un objeto (útil para validación por pasos)
export const validatePartial = <T extends z.ZodType>(
  schema: T,
  data: unknown
): Partial<z.infer<T>> => {
  const partialSchema = (schema as any).partial ? (schema as any).partial() : schema;
  return validateRequest(partialSchema, data);
};

// Valida solo ciertos campos de un objeto
export const validateFields = <T extends z.ZodObject<any>>(
  schema: T,
  data: unknown,
  fields: (keyof z.infer<T>)[]
): Partial<z.infer<T>> => {
  const pickedSchema = schema.pick(
    fields.reduce((acc, field) => {
      acc[field as string] = true;
      return acc;
    }, {} as Record<string, true>)
  );
  
  return validateRequest(pickedSchema, data);
};

// Middleware de validación para uso con express o similar
export const validationMiddleware = <T extends z.ZodType>(schema: T) => {
  return (data: unknown) => {
    return validateRequest(schema, data);
  };
};

// Valida y transforma datos de formulario (FormData o objeto)
export const validateFormData = <T extends z.ZodType>(
  schema: T,
  formData: FormData | Record<string, any>
): z.infer<T> => {
  let data: Record<string, any> = {};
  
  if (formData instanceof FormData) {
    // Convertir FormData a objeto
    formData.forEach((value, key) => {
      // Si la clave ya existe, convertir a array
      if (data[key]) {
        if (Array.isArray(data[key])) {
          data[key].push(value);
        } else {
          data[key] = [data[key], value];
        }
      } else {
        data[key] = value;
      }
    });
  } else {
    data = formData;
  }
  
  return validateRequest(schema, data);
};

// Combina múltiples validaciones
export const combineValidations = <T>(
  validators: Array<(data: unknown) => T>,
  data: unknown
): T => {
  let result = data as T;
  
  for (const validator of validators) {
    result = validator(result);
  }
  
  return result;
};

// Valida datos de forma asíncrona
export const validateAsync = async <T extends z.ZodType>(
  schema: T,
  data: unknown,
  asyncValidators?: Array<(data: z.infer<T>) => Promise<void>>
): Promise<z.infer<T>> => {
  // Validación síncrona primero
  const validated = validateRequest(schema, data);
  
  // Ejecutar validadores asíncronos si existen
  if (asyncValidators && asyncValidators.length > 0) {
    await Promise.all(asyncValidators.map(validator => validator(validated)));
  }
  
  return validated;
};

// Crea un validador personalizado
export const createCustomValidator = <T>(
  validationFn: (data: T) => boolean,
  errorMessage: string
) => {
  return (data: T) => {
    if (!validationFn(data)) {
      throw new ValidationError(errorMessage, [
        { field: 'custom', message: errorMessage }
      ]);
    }
    return data;
  };
};

// Valida que un valor esté dentro de un conjunto permitido
export const validateEnum = <T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  fieldName: string = 'value'
): T[number] => {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} debe ser una cadena de texto`, [
      { field: fieldName, message: `${fieldName} debe ser una cadena de texto` }
    ]);
  }
  
  if (!allowedValues.includes(value as any)) {
    throw new ValidationError(
      `${fieldName} debe ser uno de: ${allowedValues.join(', ')}`,
      [{
        field: fieldName,
        message: `Valor no permitido. Opciones válidas: ${allowedValues.join(', ')}`
      }]
    );
  }
  
  return value as T[number];
};

// Valida un array de datos
export const validateArray = <T extends z.ZodType>(
  schema: T,
  data: unknown[],
  options?: {
    minLength?: number;
    maxLength?: number;
  }
): z.infer<T>[] => {
  if (!Array.isArray(data)) {
    throw new ValidationError('Los datos deben ser un array', [
      { field: 'root', message: 'Se esperaba un array' }
    ]);
  }
  
  if (options?.minLength && data.length < options.minLength) {
    throw new ValidationError(
      `El array debe tener al menos ${options.minLength} elementos`,
      [{ field: 'length', message: `Mínimo ${options.minLength} elementos requeridos` }]
    );
  }
  
  if (options?.maxLength && data.length > options.maxLength) {
    throw new ValidationError(
      `El array no puede tener más de ${options.maxLength} elementos`,
      [{ field: 'length', message: `Máximo ${options.maxLength} elementos permitidos` }]
    );
  }
  
  return data.map((item, index) => {
    try {
      return validateRequest(schema, item);
    } catch (error) {
      if (error instanceof ValidationError) {
        // Agregar el índice al path de los errores
        const indexedErrors = error.errors.map(err => ({
          ...err,
          field: `[${index}].${err.field}`,
        }));
        throw new ValidationError(error.message, indexedErrors);
      }
      throw error;
    }
  });
};
