import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Inject,
    Logger,
    OnModuleDestroy,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Cron, CronExpression } from '@nestjs/schedule';

interface AttemptData {
    count: number;
    blockedUntil?: number;
}

/**
 * Guard para protección contra Brute Force
 * 🔒 SEC-006 FIX: Usa Redis (via CacheManager) para estado distribuido
 * Esto permite protección consistente en deployments multi-instancia
 * ⚡ M-002 FIX: Limpieza periódica del fallback en memoria para prevenir memory leaks
 */
@Injectable()
export class BruteForceGuard implements CanActivate, OnModuleDestroy {
    private readonly logger = new Logger(BruteForceGuard.name);

    // 🔒 Fallback en memoria si Redis no está disponible
    private readonly memoryFallback: Map<string, AttemptData> = new Map();
    private useMemoryFallback = false;

    // Configuración
    private readonly MAX_ATTEMPTS = 5;
    private readonly BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos
    private readonly CACHE_PREFIX = 'brute_force:';
    private readonly CACHE_TTL_SECONDS = 20 * 60; // 20 minutos (mayor que BLOCK_DURATION)

    // ⚡ M-002: Límite máximo de entradas en memoria para prevenir crecimiento ilimitado
    private readonly MAX_MEMORY_ENTRIES = 10000;

    constructor(
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    /**
     * ⚡ M-002 FIX: Limpieza al destruir el módulo
     */
    onModuleDestroy() {
        this.memoryFallback.clear();
    }

    /**
     * ⚡ M-002 FIX: Limpieza periódica de entradas expiradas en memoria (cada 5 minutos)
     * Previene memory leaks cuando Redis no está disponible
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    cleanupExpiredMemoryEntries() {
        if (!this.useMemoryFallback || this.memoryFallback.size === 0) {
            return;
        }

        const now = Date.now();
        let cleanedCount = 0;

        for (const [key, data] of this.memoryFallback) {
            // Eliminar si el bloqueo expiró o si la entrada es muy antigua (>20 min)
            const isExpired = data.blockedUntil && data.blockedUntil < now;
            const isTooOld = (now - (data.blockedUntil || now)) > this.CACHE_TTL_SECONDS * 1000;

            if (isExpired || isTooOld) {
                this.memoryFallback.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            this.logger.log(`⚡ Memory cleanup: removed ${cleanedCount} expired brute force entries`);
        }
    }

    /**
     * ⚡ M-002: Obtener estadísticas del fallback en memoria (para monitoring)
     */
    getMemoryFallbackStats() {
        return {
            size: this.memoryFallback.size,
            maxSize: this.MAX_MEMORY_ENTRIES,
            usingFallback: this.useMemoryFallback,
        };
    }

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
     * ⚡ M-002 FIX: Incluye límite de tamaño para el fallback en memoria
     */
    private async setAttemptData(identifier: string, data: AttemptData): Promise<void> {
        const key = `${this.CACHE_PREFIX}${identifier}`;

        if (this.useMemoryFallback) {
            // ⚡ M-002: Evicción cuando se alcanza el límite máximo
            if (this.memoryFallback.size >= this.MAX_MEMORY_ENTRIES) {
                // Eliminar la entrada más antigua
                const oldestKey = this.memoryFallback.keys().next().value;
                if (oldestKey) {
                    this.memoryFallback.delete(oldestKey);
                }
            }
            this.memoryFallback.set(key, data);
            return;
        }

        try {
            await this.cacheManager.set(key, data, this.CACHE_TTL_SECONDS * 1000);
        } catch (error) {
            this.logger.warn('Redis unavailable, storing in memory fallback');
            this.useMemoryFallback = true;
            // ⚡ M-002: Aplicar límite también al cambiar a fallback
            if (this.memoryFallback.size >= this.MAX_MEMORY_ENTRIES) {
                const oldestKey = this.memoryFallback.keys().next().value;
                if (oldestKey) {
                    this.memoryFallback.delete(oldestKey);
                }
            }
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
