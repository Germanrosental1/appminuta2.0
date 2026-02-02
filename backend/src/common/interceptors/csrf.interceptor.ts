import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as crypto from 'node:crypto';

/**
 * Interceptor para protección CSRF
 * 🔒 SEGURIDAD: Implementa Double Submit Cookie pattern
 * 🔒 SEC-005 FIX: Validates Origin/Referer even with Bearer tokens
 */
@Injectable()
export class CsrfInterceptor implements NestInterceptor {
    private readonly logger = new Logger(CsrfInterceptor.name);
    private readonly CSRF_COOKIE_NAME = 'XSRF-TOKEN';
    private readonly CSRF_HEADER_NAME = 'x-csrf-token';
    private readonly COOKIE_MAX_AGE = 3600000; // 1 hora

    // 🔒 SEC-005: Allowed origins for Origin/Referer validation
    private readonly allowedOrigins: Set<string>;

    constructor() {
        const origins = process.env.NODE_ENV === 'production'
            ? (process.env.ALLOWED_ORIGINS?.split(',') || [])
            : [
                'http://localhost:8080',
                'http://localhost:8081',
                'http://localhost:5173',
                'http://localhost:3000',
            ];
        this.allowedOrigins = new Set(origins.map(o => o.trim().toLowerCase()));
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const method = request.method;

        // Solo validar en operaciones de escritura
        const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

        if (writeMethods.includes(method)) {
            // 🔒 SEGURIDAD: En producción, CSRF está HABILITADO por defecto
            // Para deshabilitar explícitamente, usar CSRF_ENABLED=false
            // 🛠️ En desarrollo: CSRF es opcional para facilitar el desarrollo
            const isProduction = process.env.NODE_ENV === 'production';
            const csrfEnabled = process.env.CSRF_ENABLED !== 'false';

            // Obtener token de cookie y header
            const cookieToken = request.cookies?.[this.CSRF_COOKIE_NAME];
            const headerToken = request.headers[this.CSRF_HEADER_NAME];

            // 🔓 EXCEPTION: Permitir bypass si hay Header de Autorización (Bearer Token)
            const authHeader = request.headers['authorization'];
            const hasBearerToken = authHeader?.startsWith('Bearer ');

            // 🔓 EXCEPTION: Excluir explícitamente endpoints de importación/webhooks (n8n)
            const isExcludedPath = request.url.includes('/unidades/import');

            // 🔒 SEC-005 FIX: Even with Bearer token, validate Origin/Referer in production
            // This provides defense-in-depth against stolen JWTs being used from malicious sites
            if (isProduction && hasBearerToken && !isExcludedPath) {
                const originValid = this.validateOriginOrReferer(request);
                if (!originValid) {
                    this.logger.warn(
                        `SEC-005: Request with Bearer token from untrusted origin blocked. ` +
                        `Origin: ${request.headers['origin'] || 'none'}, ` +
                        `Referer: ${request.headers['referer'] || 'none'}, ` +
                        `IP: ${request.ip}`
                    );
                    throw new UnauthorizedException(
                        'Request origin not allowed. Possible CSRF attack detected.'
                    );
                }
            }

            // Validar CSRF en producción (habilitado por defecto)
            // Solo si NO hay token Bearer Y NO es un path excluido
            if (isProduction && csrfEnabled && !hasBearerToken && !isExcludedPath) {
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
     * 🔒 SEC-005: Validates Origin or Referer header against allowed origins
     * Returns true if:
     * - No Origin/Referer (server-to-server like n8n)
     * - Origin/Referer matches allowed origins
     */
    private validateOriginOrReferer(request: any): boolean {
        const origin = request.headers['origin'];
        const referer = request.headers['referer'];

        // No Origin or Referer = server-to-server request (n8n, mobile apps, Postman)
        // These are allowed because they're protected by JWT authentication
        if (!origin && !referer) {
            return true;
        }

        // Check Origin header first (more reliable)
        if (origin) {
            return this.isAllowedOrigin(origin);
        }

        // Fallback to Referer header
        if (referer) {
            try {
                const refererUrl = new URL(referer);
                const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
                return this.isAllowedOrigin(refererOrigin);
            } catch {
                return false;
            }
        }

        return false;
    }

    /**
     * Checks if origin is in allowed list
     */
    private isAllowedOrigin(origin: string): boolean {
        return this.allowedOrigins.has(origin.toLowerCase());
    }

    /**
     * Genera un token CSRF aleatorio
     */
    private generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }
}
