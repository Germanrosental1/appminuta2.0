import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/api-response.dto';
import { Request } from 'express';

/**
 * Interceptor global que envuelve automáticamente todas las respuestas exitosas
 * en el formato ApiResponse<T>
 *
 * ESTRATEGIA:
 * - Wrappea automáticamente respuestas de controladores
 * - NO wrappea si el controlador ya devolvió un ApiResponse (evita doble wrapping)
 * - NO wrappea respuestas de archivos/streams (PDF, Excel, etc)
 * - Agrega metadatos útiles: timestamp, path, method, duration
 *
 * CASOS ESPECIALES:
 * - Si el controller retorna Response de Express directamente (ej: streaming),
 *   este interceptor NO se ejecuta
 * - Los errores son manejados por AllExceptionsFilter, no pasan por aquí
 */
@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    return next.handle().pipe(
      map((data) => {
        // Si ya es un ApiResponse (wrapeado manualmente), no volver a wrapear
        if (data?.success !== undefined && data.metadata !== undefined) {
          return data;
        }

        // Si es un Buffer o Stream (archivos), no wrapear
        // Estos casos suelen usar @Res() en el controller
        if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
          return data;
        }

        // Calcular duración de la request
        const duration = Date.now() - startTime;

        // Wrapear la respuesta automáticamente
        return new ApiResponse(
          data,
          undefined, // message opcional
          {
            path: request.path,
            method: request.method,
            duration,
            // requestId puede venir de un middleware de correlation ID
            requestId: (request as any).id,
          }
        );
      }),
    );
  }
}
