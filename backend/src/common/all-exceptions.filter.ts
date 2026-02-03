import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from './dto/api-response.dto';

/**
 * Filtro global de excepciones
 * Captura TODOS los errores de la aplicación y los formatea con ApiErrorResponse
 *
 * INTEGRACIÓN CON ApiResponse<T>:
 * - Errores siguen el mismo formato que respuestas exitosas
 * - Campo 'success: false' permite distinguir fácilmente
 * - Metadatos consistentes (timestamp, path, method)
 *
 * SEGURIDAD:
 * - En producción NO expone stack traces ni detalles internos
 * - Logs completos en servidor para debugging
 * - Sanitiza mensajes de error 5xx en producción
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status = exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const message = exception instanceof HttpException
            ? exception.message
            : 'Error interno del servidor';

        // Log completo del error (sin exponer datos sensibles)
        // En desarrollo: mostrar error completo para debugging
        const isProduction = process.env.NODE_ENV === 'production';

        if (!isProduction && !(exception instanceof HttpException)) {
            // Log detallado para errores no-HTTPS en desarrollo
            this.logger.error('Unhandled error:', exception instanceof Error ? exception.stack : String(exception));
        }

        this.logger.error({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: message,
            // SIEMPRE incluir stack trace en los logs internos para debugging
            stack: exception instanceof Error ? exception.stack : undefined,
        });

        // Extraer errorCode si existe (custom exceptions pueden incluirlo)
        const errorCode = (exception as any).errorCode;

        // Extraer detalles adicionales (solo en desarrollo)
        const details = !isProduction && exception instanceof HttpException
            ? exception.getResponse()
            : undefined;

        // Sanitizar mensaje en producción para errores 5xx
        const clientMessage = isProduction && status >= 500
            ? 'Error interno del servidor'
            : message;

        // Respuesta al cliente usando ApiErrorResponse
        const errorResponse = new ApiErrorResponse(
            clientMessage,
            status,
            errorCode,
            details,
            {
                path: request.path,
                method: request.method,
                requestId: (request as any).id,
            }
        );

        response.status(status).json(errorResponse);
    }
}
