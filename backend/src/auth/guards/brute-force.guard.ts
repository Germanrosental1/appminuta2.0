import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
} from '@nestjs/common';

/**
 * Guard para protección contra Brute Force
 * 🔒 SEGURIDAD: Limita intentos de login y bloquea temporalmente después de fallos
 */
@Injectable()
export class BruteForceGuard implements CanActivate {
    private attempts: Map<string, { count: number; blockedUntil?: number }> = new Map();

    // Configuración
    private readonly MAX_ATTEMPTS = 5;
    private readonly BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos
    private readonly ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutos

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const identifier = this.getIdentifier(request);

        // Limpiar intentos antiguos periódicamente
        this.cleanupOldAttempts();

        const attemptData = this.attempts.get(identifier);

        // Verificar si está bloqueado
        if (attemptData?.blockedUntil) {
            if (Date.now() < attemptData.blockedUntil) {
                const remainingMinutes = Math.ceil(
                    (attemptData.blockedUntil - Date.now()) / 60000
                );
                throw new HttpException(
                    {
                        statusCode: HttpStatus.TOO_MANY_REQUESTS,
                        message: `Demasiados intentos fallidos. Cuenta bloqueada temporalmente. Intenta nuevamente en ${remainingMinutes} minutos.`,
                        error: 'Too Many Requests',
                    },
                    HttpStatus.TOO_MANY_REQUESTS
                );
            } else {
                // El bloqueo expiró, resetear
                this.attempts.delete(identifier);
            }
        }

        // Permitir el intento
        return true;
    }

    /**
     * Registra un intento fallido
     */
    recordFailedAttempt(request: any): void {
        const identifier = this.getIdentifier(request);
        const attemptData = this.attempts.get(identifier) || { count: 0 };

        attemptData.count += 1;

        if (attemptData.count >= this.MAX_ATTEMPTS) {
            attemptData.blockedUntil = Date.now() + this.BLOCK_DURATION_MS;
            console.warn(
                `🔒 Brute force protection: ${identifier} blocked for ${this.BLOCK_DURATION_MS / 60000} minutes`
            );
        }

        this.attempts.set(identifier, attemptData);
    }

    /**
     * Resetea los intentos después de un login exitoso
     */
    resetAttempts(request: any): void {
        const identifier = this.getIdentifier(request);
        this.attempts.delete(identifier);
    }

    /**
     * Obtiene un identificador único (IP + email si está disponible)
     */
    private getIdentifier(request: any): string {
        const ip = request.ip || request.connection.remoteAddress || 'unknown';
        const email = request.body?.email || request.body?.username || '';
        return `${ip}:${email}`;
    }

    /**
     * Limpia intentos antiguos para evitar memory leaks
     */
    private cleanupOldAttempts(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, data] of this.attempts.entries()) {
            // Si está bloqueado y el bloqueo expiró, o si no hay bloqueo reciente
            if (data.blockedUntil && data.blockedUntil < now) {
                expiredKeys.push(key);
            }
        }

        expiredKeys.forEach(key => this.attempts.delete(key));
    }

    /**
     * Obtiene información de intentos (para debugging/monitoring)
     */
    getAttemptInfo(request: any): { count: number; blockedUntil?: number } | null {
        const identifier = this.getIdentifier(request);
        return this.attempts.get(identifier) || null;
    }
}
