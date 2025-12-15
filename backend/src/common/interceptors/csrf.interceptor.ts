import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as crypto from 'node:crypto';

/**
 * Interceptor para protección CSRF
 * 🔒 SEGURIDAD: Implementa Double Submit Cookie pattern
 */
@Injectable()
export class CsrfInterceptor implements NestInterceptor {
    private readonly CSRF_COOKIE_NAME = 'XSRF-TOKEN';
    private readonly CSRF_HEADER_NAME = 'x-csrf-token';
    private readonly COOKIE_MAX_AGE = 3600000; // 1 hora

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const method = request.method;

        // Solo validar en operaciones de escritura
        const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

        if (writeMethods.includes(method)) {
            // Obtener token de cookie y header
            const cookieToken = request.cookies?.[this.CSRF_COOKIE_NAME];
            const headerToken = request.headers[this.CSRF_HEADER_NAME];

            // Validar que ambos existan y coincidan
            if (!cookieToken || !headerToken) {
                throw new UnauthorizedException(
                    'CSRF token missing. Please refresh the page.'
                );
            }

            if (cookieToken !== headerToken) {
                throw new UnauthorizedException(
                    'CSRF token mismatch. Possible CSRF attack detected.'
                );
            }
        }

        // Generar nuevo token para la respuesta (rotación)
        const newToken = this.generateToken();
        response.cookie(this.CSRF_COOKIE_NAME, newToken, {
            httpOnly: false, // Debe ser accesible por JavaScript
            secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
            sameSite: 'strict',
            maxAge: this.COOKIE_MAX_AGE,
        });

        // Agregar token al header de respuesta para que el frontend lo use
        response.setHeader('X-CSRF-Token', newToken);

        return next.handle();
    }

    /**
     * Genera un token CSRF aleatorio
     */
    private generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }
}
