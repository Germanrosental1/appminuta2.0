import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface UserPermissionsCache {
    permissions: string[];
    projectIds: string[];
    roles: string[];
    cachedAt: number;
}

export interface UserPermissions {
    permissions: string[];
    projectIds: string[];
    roles: string[];
}

@Injectable()
export class PermissionsCacheService {
    // TTL reducido a 10 segundos para minimizar ventana de escalación de privilegios
    // Usamos TTL en segundos para compatibilidad con Redis Store v4+
    private readonly CACHE_TTL_SECONDS = 10;
    private readonly CACHE_PREFIX = 'user_perms:';

    constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) { }

    /**
     * Obtiene permisos del cache o ejecuta la función fetcher para obtenerlos
     */
    async getOrFetch(userId: string, fetcher: () => Promise<UserPermissions>): Promise<UserPermissions> {
        const key = this._getKey(userId);
        const cached = await this.cacheManager.get<UserPermissionsCache>(key);
        const now = Date.now();

        // Si hay cache válido, usarlo
        if (cached) {
            return {
                permissions: cached.permissions,
                projectIds: cached.projectIds,
                roles: cached.roles
            };
        }

        // Cache miss: ejecutar fetcher
        const data = await fetcher();

        // Guardar en cache distribuido
        const cacheEntry: UserPermissionsCache = {
            ...data,
            cachedAt: now,
        };

        // Cache-manager v4/v5 set expects ttl in milliseconds for memory, seconds/ms vary by store.
        // NestJS cache manager unified setup usually handles it, but explicit numbers safer.
        await this.cacheManager.set(key, cacheEntry, this.CACHE_TTL_SECONDS * 1000);

        return data;
    }

    /**
     * Invalida el cache para un usuario específico (ej. al cambiar roles)
     */
    async invalidateUser(userId: string): Promise<void> {
        await this.cacheManager.del(this._getKey(userId));
    }

    /**
     * Limpia tod el cache
     */
    async clearAll(): Promise<void> {
        // 'reset' no existe en la interfaz Cache estandar de nestjs/cache-manager versiones recientes
        // intentamos acceder al store subyacente si es posible o usar reset si existe runtime
        const store = (this.cacheManager as any).store;
        if (typeof store.reset === 'function') {
            await store.reset();
        } else if (typeof (this.cacheManager as any).reset === 'function') {
            await (this.cacheManager as any).reset();
        }
    }

    /**
     * Obtiene estadísticas del cache (Estimadas, ya que Redis no expone size fácilmente via wrapper)
     */
    async getStats() {
        // 🛡️ SEGURIDAD: Acceso defensivo al store para evitar 500 en health check
        const store = (this.cacheManager as any)?.store;
        const isRedis = store && (typeof store.getClient === 'function' || !!store.getClient);

        return {
            backend: isRedis ? 'redis' : 'memory',
            ttlSeconds: this.CACHE_TTL_SECONDS,
            prefix: this.CACHE_PREFIX,
            // ⚡ Información adicional de diagnóstico
            storeType: store ? store.constructor.name : 'unknown'
        };
    }

    private _getKey(userId: string): string {
        return `${this.CACHE_PREFIX}${userId}`;
    }
}
