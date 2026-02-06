import { ApiProperty } from '@nestjs/swagger';

/**
 * Metadatos adicionales de la respuesta API
 * Información útil para debugging, versionado y monitoreo
 */
export class ApiResponseMetadata {
  @ApiProperty({
    description: 'Timestamp ISO 8601 de la respuesta',
    example: '2026-02-02T10:30:00.000Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Versión de la API',
    example: 'v1',
    required: false
  })
  version?: string;

  @ApiProperty({
    description: 'Path del endpoint solicitado',
    example: '/api/minutas',
    required: false
  })
  path?: string;

  @ApiProperty({
    description: 'Método HTTPS utilizado',
    example: 'GET',
    required: false
  })
  method?: string;

  @ApiProperty({
    description: 'Duración de la request en ms (performance monitoring)',
    example: 145,
    required: false
  })
  duration?: number;

  @ApiProperty({
    description: 'Request ID para trazabilidad (opcional)',
    example: 'req_abc123xyz',
    required: false
  })
  requestId?: string;
}

/**
 * Wrapper genérico para todas las respuestas exitosas de la API
 *
 * Ventajas:
 * - Contrato consistente para todos los consumidores (web, mobile, integraciones)
 * - Metadatos útiles para debugging y monitoreo
 * - Fácil de extender sin breaking changes
 * - Type-safe con TypeScript generics
 *
 * @template T Tipo del payload de datos (ej: MinutaResponseDto, UnidadResponseDto[])
 *
 * @example
 * // Respuesta individual
 * ApiResponse<MinutaResponseDto>
 *
 * @example
 * // Respuesta de lista
 * ApiResponse<UnidadResponseDto[]>
 *
 * @example
 * // Respuesta paginada
 * ApiResponse<PaginatedDto<MinutaResponseDto>>
 */
export class ApiResponse<T> {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa',
    example: true
  })
  success: boolean = true;

  @ApiProperty({
    description: 'Mensaje descriptivo de la operación (opcional)',
    example: 'Minuta creada exitosamente',
    required: false
  })
  message?: string;

  @ApiProperty({
    description: 'Datos de la respuesta (tipo genérico)',
    type: Object // Swagger no puede inferir el tipo genérico automáticamente
  })
  data: T;

  @ApiProperty({
    description: 'Metadatos adicionales de la respuesta',
    type: () => ApiResponseMetadata
  })
  metadata: ApiResponseMetadata;

  constructor(data: T, message?: string, metadata?: Partial<ApiResponseMetadata>) {
    this.message = message;
    this.data = data;
    this.metadata = {
      timestamp: new Date().toISOString(),
      version: 'v1',
      ...metadata
    };
  }

  /**
   * Factory method para crear respuestas exitosas de forma concisa
   */
  static success<T>(
    data: T,
    message?: string,
    metadata?: Partial<ApiResponseMetadata>
  ): ApiResponse<T> {
    return new ApiResponse(data, message, metadata);
  }
}

/**
 * Respuesta de error consistente con el wrapper genérico
 * Utilizada por AllExceptionsFilter para errores
 */
export class ApiErrorResponse {
  @ApiProperty({
    description: 'Indica que la operación falló',
    example: false
  })
  success: boolean = false;

  @ApiProperty({
    description: 'Mensaje de error',
    example: 'Minuta no encontrada'
  })
  message: string;

  @ApiProperty({
    description: 'Código de error HTTPS',
    example: 404
  })
  statusCode: number;

  @ApiProperty({
    description: 'Código de error interno (opcional)',
    example: 'MINUTA_NOT_FOUND',
    required: false
  })
  errorCode?: string;

  @ApiProperty({
    description: 'Detalles adicionales del error (solo en desarrollo)',
    required: false,
    type: Object
  })
  details?: any;

  @ApiProperty({
    description: 'Metadatos de la respuesta',
    type: () => ApiResponseMetadata
  })
  metadata: ApiResponseMetadata;

  constructor(
    message: string,
    statusCode: number,
    errorCode?: string,
    details?: any,
    metadata?: Partial<ApiResponseMetadata>
  ) {
    this.message = message;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.metadata = {
      timestamp: new Date().toISOString(),
      version: 'v1',
      ...metadata
    };
  }
}

/**
 * DTO para respuestas paginadas
 * Útil para listados con paginación
 */
export class PaginationMetadata {
  @ApiProperty({ description: 'Página actual', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items por página', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total de items', example: 150 })
  total: number;

  @ApiProperty({ description: 'Total de páginas', example: 8 })
  totalPages: number;

  @ApiProperty({ description: '¿Tiene página siguiente?', example: true })
  hasNext: boolean;

  @ApiProperty({ description: '¿Tiene página anterior?', example: false })
  hasPrev: boolean;
}

export class PaginatedDto<T> {
  @ApiProperty({ description: 'Items de la página actual', type: 'array' })
  items: T[];

  @ApiProperty({ description: 'Información de paginación', type: () => PaginationMetadata })
  pagination: PaginationMetadata;
}
