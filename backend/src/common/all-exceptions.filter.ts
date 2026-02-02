import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

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
            // Log detallado para errores no-HTTP en desarrollo
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

        // Respuesta al cliente (sin detalles internos en producción)
        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: process.env.NODE_ENV === 'production' && status >= 500
                ? 'Error interno del servidor'
                : message,
        };

        response.status(status).json(errorResponse);
    }
}
