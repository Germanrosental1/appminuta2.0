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
    details?: any;
    metadata: ApiResponseMetadata;
}

/**
 * Union type para cualquier respuesta de la API
 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

/**
 * Type guard para verificar si una respuesta es exitosa
 */
export function isSuccessResponse<T>(
    response: ApiResult<T>
): response is ApiResponse<T> {
    return (response as any).success === true;
}

/**
 * Unwrap automático de ApiResponse<T> -> T
 */
export function unwrapResponse<T>(response: ApiResult<T>): T {
    if (isSuccessResponse(response)) {
        return response.data;
    }

    const error = new Error(response.message);
    (error as any).statusCode = response.statusCode;
    throw error;
}
