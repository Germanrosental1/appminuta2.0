/**
 * Tipos TypeScript para las respuestas de la API
 *
 * Estos tipos deben coincidir EXACTAMENTE con los DTOs del backend:
 * - backend/src/common/dto/api-response.dto.ts
 *
 * IMPORTANTE: Mantener sincronizados backend y frontend
 */

/**
 * Metadatos de la respuesta API
 */
export interface ApiResponseMetadata {
  timestamp: string;
  version?: string;
  path?: string;
  method?: string;
  duration?: number;
  requestId?: string;
}

/**
 * Wrapper genérico para respuestas exitosas
 *
 * @template T Tipo del payload de datos
 *
 * @example
 * // Respuesta individual
 * ApiResponse<Minuta>
 *
 * @example
 * // Respuesta de array
 * ApiResponse<Unidad[]>
 *
 * @example
 * // Respuesta paginada
 * ApiResponse<PaginatedData<Minuta>>
 */
export interface ApiResponse<T> {
  success: true;
  message?: string;
  data: T;
  metadata: ApiResponseMetadata;
}

/**
 * Respuesta de error
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  errorCode?: string;
  details?: any;
  metadata: ApiResponseMetadata;
}

/**
 * Union type para cualquier respuesta de la API
 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

/**
 * Metadatos de paginación
 */
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * DTO para respuestas paginadas
 */
export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMetadata;
}

/**
 * Type guard para verificar si una respuesta es exitosa
 *
 * @example
 * const response = await api.get('/minutas/123');
 * if (isSuccessResponse(response)) {
 *   console.log(response.data); // TypeScript sabe que es MinutaResponseDto
 * } else {
 *   console.error(response.message); // TypeScript sabe que es error
 * }
 */
export function isSuccessResponse<T>(
  response: ApiResult<T>
): response is ApiResponse<T> {
  return response.success === true;
}

/**
 * Type guard para verificar si una respuesta es un error
 */
export function isErrorResponse(
  response: ApiResult<any>
): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Unwrap automático de ApiResponse<T> -> T
 *
 * Extrae el payload de datos y lanza error si la respuesta falló
 *
 * @throws Error si la respuesta no fue exitosa
 *
 * @example
 * const minuta = unwrapResponse(await api.get('/minutas/123'));
 * // minuta es de tipo MinutaResponseDto (sin wrapper)
 */
export function unwrapResponse<T>(response: ApiResult<T>): T {
  if (isSuccessResponse(response)) {
    return response.data;
  }

  // Lanzar error con información útil
  const error = new Error(response.message);
  (error as any).statusCode = response.statusCode;
  (error as any).errorCode = response.errorCode;
  (error as any).details = response.details;
  throw error;
}

/**
 * Unwrap seguro que retorna null en caso de error
 *
 * Útil cuando no queremos manejar errores con try/catch
 *
 * @example
 * const minuta = safeUnwrap(response);
 * if (minuta === null) {
 *   console.error('Error al obtener minuta');
 *   return;
 * }
 * // usar minuta...
 */
export function safeUnwrap<T>(response: ApiResult<T>): T | null {
  if (isSuccessResponse(response)) {
    return response.data;
  }
  return null;
}

/**
 * Unwrap con valor por defecto en caso de error
 *
 * @example
 * const minutas = unwrapOrDefault(response, []);
 * // Si hay error, retorna array vacío
 */
export function unwrapOrDefault<T>(response: ApiResult<T>, defaultValue: T): T {
  if (isSuccessResponse(response)) {
    return response.data;
  }
  return defaultValue;
}
