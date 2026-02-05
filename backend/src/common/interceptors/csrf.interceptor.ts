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
                'https://localhost:8080',
                'https://localhost:8081',
                'https://localhost:5173',
                'https://localhost:3000',
            ];
        this.allowedOrigins = new Set(origins.map(o => o.trim().toLowerCase()));
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        if (this.shouldValidateCsrf(request)) {
            this.validateCsrf(request);
        }

        // Generar nuevo token para la respuesta (rotación)
        const newToken = this.generateToken();
        this.setCsrfCookie(response, newToken);
        response.setHeader('X-CSRF-Token', newToken);

        return next.handle();
    }

    private shouldValidateCsrf(request: any): boolean {
        const method = request.method;
        const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

        if (!writeMethods.includes(method)) return false;

        // 🔓 EXCEPTION: Permitir bypass si hay Header de Autorización (Bearer Token)
        // Pero aún así validamos Origin en producción (SEC-005)
        const authHeader = request.headers['authorization'];
        const hasBearerToken = authHeader?.startsWith('Bearer ');

        // 🔓 EXCEPTION: Excluir explícitamente endpoints de importación/webhooks (n8n)
        const isExcludedPath = request.url.includes('/unidades/import');

        if (isExcludedPath) return false;

        const isProduction = process.env.NODE_ENV === 'production';

        // 🔒 SEC-005 FIX: Even with Bearer token, validate Origin/Referer in production
        if (isProduction && hasBearerToken) {
            this.validateOriginForBearer(request);
            return false; // Skip standard cookie check if bearer is valid and origin checked
        }

        // Si hay token bearer, saltamos la validación de cookie CSRF estándar
        if (hasBearerToken) return false;

        const csrfEnabled = process.env.CSRF_ENABLED !== 'false';
        return isProduction && csrfEnabled;
    }

    private validateOriginForBearer(request: any) {
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

    private validateCsrf(request: any) {
        const cookieToken = request.cookies?.[this.CSRF_COOKIE_NAME];
        const headerToken = request.headers[this.CSRF_HEADER_NAME];

        if (!cookieToken || !headerToken) {
            throw new UnauthorizedException('CSRF token missing. Please refresh the page.');
        }

        if (cookieToken !== headerToken) {
            throw new UnauthorizedException('CSRF token mismatch. Possible CSRF attack detected.');
        }
    }

    private setCsrfCookie(response: any, token: string) {
        response.cookie(this.CSRF_COOKIE_NAME, token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: this.COOKIE_MAX_AGE,
        });
    }

    /**
     * 🔒 SEC-005: Validates Origin or Referer header against allowed origins
     * Returns true if:
     * - No Origin/Referer (server-to-server like n8n)
     * - Origin/Referer matches allowed origins
     */
    private validateOriginOrReferer(request: { headers: Record<string, string | undefined> }): boolean {
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
