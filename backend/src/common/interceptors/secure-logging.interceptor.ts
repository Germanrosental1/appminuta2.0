import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor para logging seguro
 * 🔒 SEGURIDAD: Sanitiza datos sensibles antes de loggear
 */
@Injectable()
export class SecureLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    // Lista de campos sensibles a remover de logs
    private readonly sensitiveFields = [
        'password',
        'token',
        'access_token',
        'refresh_token',
        'jwt',
        'secret',
        'authorization',
        'api_key',
        'apiKey',
        'credit_card',
        'ssn',
    ];

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, body, headers } = request;
        const userAgent = headers['user-agent'] || '';
        const ip = request.ip || request.connection.remoteAddress;

        // Sanitizar body antes de loggear
        const sanitizedBody = this.sanitizeObject(body);

        this.logger.log(
            `${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 50)}`
        );

        if (Object.keys(sanitizedBody || {}).length > 0) {
            this.logger.debug(`Body: ${JSON.stringify(sanitizedBody)}`);
        }

        const now = Date.now();

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const responseTime = Date.now() - now;
                    this.logger.log(
                        `${method} ${url} - ${context.switchToHttp().getResponse().statusCode} - ${responseTime}ms`
                    );
                },
                error: (error) => {
                    const responseTime = Date.now() - now;
                    this.logger.error(
                        `${method} ${url} - ${error.status || 500} - ${responseTime}ms - ${error.message}`
                    );
                },
            })
        );
    }

    /**
     * Sanitiza un objeto removiendo campos sensibles
     */
    private sanitizeObject(obj: any): any {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }

        const sanitized: any = {};

        for (const [key, value] of Object.entries(obj)) {
            // Si la key es sensible, reemplazar con [REDACTED]
            if (this.isSensitiveField(key)) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'object' && value !== null) {
                // Recursivamente sanitizar objetos anidados
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Verifica si un campo es sensible
     */
    private isSensitiveField(fieldName: string): boolean {
        const lowerField = fieldName.toLowerCase();
        return this.sensitiveFields.some(sensitive =>
            lowerField.includes(sensitive.toLowerCase())
        );
    }
}
