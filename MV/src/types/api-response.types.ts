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
    details?: Record<string, unknown>;
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
 */
export function isSuccessResponse<T>(
    response: ApiResult<T>
): response is ApiResponse<T> {
    return response.success === true;
}

/**
 * Type guard para verificar si una respuesta es un error
 */
export function isErrorResponse<T>(
    response: ApiResult<T>
): response is ApiErrorResponse {
    return response.success === false;
}

interface ApiError extends Error {
    statusCode?: number;
    errorCode?: string;
    details?: Record<string, unknown>;
}

/**
 * Unwrap automático de ApiResponse<T> -> T
 */
export function unwrapResponse<T>(response: ApiResult<T>): T {
    if (isSuccessResponse(response)) {
        return response.data;
    }

    const error: ApiError = new Error(response.message);
    error.statusCode = response.statusCode;
    error.errorCode = response.errorCode;
    error.details = response.details;
    throw error;
}

/**
 * Interface for Gastos Generales (Expenses)
 */
export interface GastosGenerales {
    proyecto: string;
    sellado?: number;
    certificaciondefirmas?: number;
    alajamiento?: number;
    planosm2propiedad?: number;
    planosm2cochera?: number;
    comisioninmobiliaria?: number;
    otrosgastos?: number;
    fecha_posesion?: string;
    etapatorre?: string;
    [key: string]: unknown;
}

