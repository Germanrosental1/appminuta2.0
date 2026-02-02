import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Inject,
    Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

interface AttemptData {
    count: number;
    blockedUntil?: number;
}

/**
 * Guard para protección contra Brute Force
 * 🔒 SEC-006 FIX: Usa Redis (via CacheManager) para estado distribuido
 * Esto permite protección consistente en deployments multi-instancia
 */
@Injectable()
export class BruteForceGuard implements CanActivate {
    private readonly logger = new Logger(BruteForceGuard.name);

    // 🔒 Fallback en memoria si Redis no está disponible
    private readonly memoryFallback: Map<string, AttemptData> = new Map();
    private useMemoryFallback = false;

    // Configuración
    private readonly MAX_ATTEMPTS = 5;
    private readonly BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos
    private readonly CACHE_PREFIX = 'brute_force:';
    private readonly CACHE_TTL_SECONDS = 20 * 60; // 20 minutos (mayor que BLOCK_DURATION)

    constructor(
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const identifier = this.getIdentifier(request);

        const attemptData = await this.getAttemptData(identifier);

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
                await this.deleteAttemptData(identifier);
            }
        }

        // Permitir el intento
        return true;
    }

    /**
     * Registra un intento fallido
     */
    async recordFailedAttempt(request: any): Promise<void> {
        const identifier = this.getIdentifier(request);
        const attemptData = (await this.getAttemptData(identifier)) || { count: 0 };

        attemptData.count += 1;

        if (attemptData.count >= this.MAX_ATTEMPTS) {
            attemptData.blockedUntil = Date.now() + this.BLOCK_DURATION_MS;
            this.logger.warn(
                `🔒 Brute force protection: ${this.maskIdentifier(identifier)} blocked for ${this.BLOCK_DURATION_MS / 60000} minutes`
            );
        }

        await this.setAttemptData(identifier, attemptData);
    }

    /**
     * Resetea los intentos después de un login exitoso
     */
    async resetAttempts(request: any): Promise<void> {
        const identifier = this.getIdentifier(request);
        await this.deleteAttemptData(identifier);
    }

    /**
     * Obtiene un identificador único (IP + email si está disponible)
     */
    private getIdentifier(request: any): string {
        const ip = request.ip || request.connection?.remoteAddress || 'unknown';
        const email = request.body?.email || request.body?.username || '';
        return `${ip}:${email}`;
    }

    /**
     * 🔒 Mascara el identificador para logs seguros
     */
    private maskIdentifier(identifier: string): string {
        const [ip, email] = identifier.split(':');
        const maskedEmail = email ? `${email.substring(0, 3)}***` : '';
        return `${ip}:${maskedEmail}`;
    }

    /**
     * 🔒 SEC-006: Obtiene datos de Redis con fallback a memoria
     */
    private async getAttemptData(identifier: string): Promise<AttemptData | null> {
        const key = `${this.CACHE_PREFIX}${identifier}`;

        if (this.useMemoryFallback) {
            return this.memoryFallback.get(key) || null;
        }

        try {
            const data = await this.cacheManager.get<AttemptData>(key);
            return data || null;
        } catch (error) {
            this.logger.warn('Redis unavailable for brute force guard, using memory fallback');
            this.useMemoryFallback = true;
            return this.memoryFallback.get(key) || null;
        }
    }

    /**
     * 🔒 SEC-006: Guarda datos en Redis con fallback a memoria
     */
    private async setAttemptData(identifier: string, data: AttemptData): Promise<void> {
        const key = `${this.CACHE_PREFIX}${identifier}`;

        if (this.useMemoryFallback) {
            this.memoryFallback.set(key, data);
            return;
        }

        try {
            await this.cacheManager.set(key, data, this.CACHE_TTL_SECONDS * 1000);
        } catch (error) {
            this.logger.warn('Redis unavailable, storing in memory fallback');
            this.useMemoryFallback = true;
            this.memoryFallback.set(key, data);
        }
    }

    /**
     * 🔒 SEC-006: Elimina datos de Redis con fallback a memoria
     */
    private async deleteAttemptData(identifier: string): Promise<void> {
        const key = `${this.CACHE_PREFIX}${identifier}`;

        if (this.useMemoryFallback) {
            this.memoryFallback.delete(key);
            return;
        }

        try {
            await this.cacheManager.del(key);
        } catch (error) {
            this.memoryFallback.delete(key);
        }
    }

    /**
     * Obtiene información de intentos (para debugging/monitoring)
     */
    async getAttemptInfo(request: any): Promise<AttemptData | null> {
        const identifier = this.getIdentifier(request);
        return this.getAttemptData(identifier);
    }
}
