import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiCreatedResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponse, ApiErrorResponse, PaginatedDto } from '../dto/api-response.dto';

/**
 * Decorador personalizado para documentar respuestas envueltas en ApiResponse<T>
 *
 * PROBLEMA:
 * Swagger no puede inferir automáticamente el tipo genérico T en ApiResponse<T>
 *
 * SOLUCIÓN:
 * Este decorador genera la documentación correcta para el tipo específico
 *
 * USO:
 * @ApiResponseWrapper(MinutaResponseDto)
 * @Get(':id')
 * findOne(@Param('id') id: string) { ... }
 *
 * Genera documentación que muestra:
 * {
 *   "success": true,
 *   "data": { ...MinutaResponseDto... },
 *   "metadata": { ...metadatos... }
 * }
 */
export const ApiResponseWrapper = <TModel extends Type<any>>(
  model: TModel,
  isArray = false
) => {
  return applyDecorators(
    ApiExtraModels(ApiResponse, model),
    ApiOkResponse({
      description: 'Operación exitosa',
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Operación exitosa', nullable: true },
              data: isArray
                ? { type: 'array', items: { $ref: getSchemaPath(model) } }
                : { $ref: getSchemaPath(model) },
              metadata: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string', format: 'date-time' },
                  version: { type: 'string', example: 'v1' },
                  path: { type: 'string', example: '/api/minutas' },
                  method: { type: 'string', example: 'GET' },
                  duration: { type: 'number', example: 145 },
                  requestId: { type: 'string', nullable: true },
                },
              },
            },
          },
        ],
      },
    })
  );
};

/**
 * Decorador para respuestas de creación (201 Created)
 */
export const ApiCreatedResponseWrapper = <TModel extends Type<any>>(
  model: TModel
) => {
  return applyDecorators(
    ApiExtraModels(ApiResponse, model),
    ApiCreatedResponse({
      description: 'Recurso creado exitosamente',
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Recurso creado', nullable: true },
              data: { $ref: getSchemaPath(model) },
              metadata: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string', format: 'date-time' },
                  version: { type: 'string', example: 'v1' },
                  path: { type: 'string', example: '/api/minutas' },
                  method: { type: 'string', example: 'POST' },
                  duration: { type: 'number', example: 245 },
                },
              },
            },
          },
        ],
      },
    })
  );
};

/**
 * Decorador para respuestas paginadas
 */
export const ApiPaginatedResponseWrapper = <TModel extends Type<any>>(
  model: TModel
) => {
  return applyDecorators(
    ApiExtraModels(ApiResponse, PaginatedDto, model),
    ApiOkResponse({
      description: 'Lista paginada obtenida exitosamente',
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', nullable: true },
              data: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: { $ref: getSchemaPath(model) },
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'number', example: 1 },
                      limit: { type: 'number', example: 20 },
                      total: { type: 'number', example: 150 },
                      totalPages: { type: 'number', example: 8 },
                      hasNext: { type: 'boolean', example: true },
                      hasPrev: { type: 'boolean', example: false },
                    },
                  },
                },
              },
              metadata: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string', format: 'date-time' },
                  version: { type: 'string', example: 'v1' },
                  path: { type: 'string' },
                  method: { type: 'string' },
                  duration: { type: 'number' },
                },
              },
            },
          },
        ],
      },
    })
  );
};

/**
 * Decorador para documentar respuestas de error
 */
export const ApiErrorResponseWrapper = (status: number, description: string) => {
  return applyDecorators(
    ApiExtraModels(ApiErrorResponse),
    ApiOkResponse({
      status,
      description,
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: false },
              message: { type: 'string', example: description },
              statusCode: { type: 'number', example: status },
              errorCode: { type: 'string', example: 'RESOURCE_NOT_FOUND', nullable: true },
              details: { type: 'object', nullable: true },
              metadata: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string', format: 'date-time' },
                  version: { type: 'string', example: 'v1' },
                  path: { type: 'string' },
                  method: { type: 'string' },
                },
              },
            },
          },
        ],
      },
    })
  );
};
