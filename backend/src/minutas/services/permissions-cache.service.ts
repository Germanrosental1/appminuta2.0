import { Injectable } from '@nestjs/common';

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
    private readonly CACHE_TTL_MS = 10 * 1000;

    // Límite máximo de entradas para prevenir crecimiento de memoria ilimitado
    private readonly MAX_CACHE_SIZE = 1000;

    private readonly cache = new Map<string, UserPermissionsCache>();

    /**
     * Obtiene permisos del cache o ejecuta la función fetcher para obtenerlos
     */
    async getOrFetch(userId: string, fetcher: () => Promise<UserPermissions>): Promise<UserPermissions> {
        const cached = this.cache.get(userId);
        const now = Date.now();

        // Si hay cache válido y no ha expirado, usarlo
        if (cached && (now - cached.cachedAt) < this.CACHE_TTL_MS) {
            return {
                permissions: cached.permissions,
                projectIds: cached.projectIds,
                roles: cached.roles
            };
        }

        // Cache miss o expirado: ejecutar fetcher
        const data = await fetcher();

        // Gestionar tamaño del cache antes de insertar
        this.evictIfFull();

        // Guardar en cache
        this.cache.set(userId, {
            ...data,
            cachedAt: now,
        });

        return data;
    }

    /**
     * Invalida el cache para un usuario específico (ej. al cambiar roles)
     */
    invalidateUser(userId: string): void {
        this.cache.delete(userId);
    }

    /**
     * Limpia tod el cache (útil para tests)
     */
    clearAll(): void {
        this.cache.clear();
    }

    /**
     * Obtiene estadísticas del cache para monitoreo
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.MAX_CACHE_SIZE,
            utilizationPercent: Math.round((this.cache.size / this.MAX_CACHE_SIZE) * 100),
            ttlMs: this.CACHE_TTL_MS
        };
    }

    /**
     * Evicción LRU simple cuando el cache está lleno
     */
    private evictIfFull(): void {
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            // Map itera en orden de inserción, el primero es el más antiguo
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }
    }
}
