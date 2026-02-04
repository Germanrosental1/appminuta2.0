import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsCacheService, UserPermissions } from '../../shared/iam/services/permissions-cache.service';
import { ROLE_PERMISSIONS } from '../../auth/authorization/roles.constants';

/**
 * MinutasPermissionsService - Unified permission handling for minutas module.
 * 
 * This service provides:
 * - Cached permission retrieval
 * - Role-based permission checks
 * - Project-specific access control
 * - Permission filter building for queries
 */
@Injectable()
export class MinutasPermissionsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly permissionsCache: PermissionsCacheService,
    ) { }

    // ==================== CACHED PERMISSIONS ====================

    /**
     * Get user permissions with caching
     */
    async getCachedPermissions(userId: string): Promise<UserPermissions> {
        return this.permissionsCache.getOrFetch(userId, () => this.fetchPermissions(userId));
    }

    /**
     * Fetch permissions from database (called on cache miss)
     */
    private async fetchPermissions(userId: string): Promise<UserPermissions> {
        const [userRoles, userProjects] = await Promise.all([
            this.prisma.usuariosRoles.findMany({
                where: { IdUsuario: userId },
                include: {
                    Roles: {
                        include: {
                            RolesPermisos: {
                                include: {
                                    Permisos: true
                                }
                            }
                        }
                    }
                }
            }),
            this.prisma.usuariosProyectos.findMany({
                where: { IdUsuario: userId },
                select: { IdProyecto: true }
            })
        ]);

        const roles = userRoles.map(ur => ur.Roles?.Nombre).filter((n): n is string => typeof n === 'string');
        const permissions = userRoles.flatMap(ur =>
            ur.Roles?.RolesPermisos?.map(rp => rp.Permisos?.Nombre) || []
        ).filter((n): n is string => typeof n === 'string');
        const projectIds = userProjects.map(up => up.IdProyecto);

        return { permissions, projectIds, roles };
    }

    /**
     * Invalidate cache for a user (call when permissions change)
     */
    async invalidateUser(userId: string): Promise<void> {
        await this.permissionsCache.invalidateUser(userId);
    }

    /**
     * Clear all cache (useful for testing or bulk changes)
     */
    async clearAll(): Promise<void> {
        await this.permissionsCache.clearAll();
    }

    /**
     * Get cache statistics
     */
    async getStats() {
        return this.permissionsCache.getStats();
    }

    // ==================== PERMISSION CHECKS ====================

    /**
     * Check if user has a specific permission
     */
    async hasPermission(userId: string, permission: string): Promise<boolean> {
        const perms = await this.getCachedPermissions(userId);
        return perms.permissions.includes(permission);
    }

    /**
     * Check if user can view all minutas
     */
    async canViewAllMinutas(userId: string): Promise<boolean> {
        return this.hasPermission(userId, 'verTodasMinutas');
    }

    /**
     * Check if user can edit minutas
     */
    async canEditMinuta(userId: string): Promise<boolean> {
        return this.hasPermission(userId, 'editarMinuta');
    }

    /**
     * Check if user can sign minutas
     */
    async canSignMinuta(userId: string): Promise<boolean> {
        return this.hasPermission(userId, 'firmarMinuta');
    }

    /**
     * Check if user is a global admin (SuperAdminMV or AdminMV)
     */
    async isGlobalAdmin(userId: string): Promise<boolean> {
        const perms = await this.getCachedPermissions(userId);
        return perms.roles.some(r => ['superadminmv', 'adminmv'].includes(r));
    }

    /**
     * Check if user has access to a specific project
     */
    async hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
        const perms = await this.getCachedPermissions(userId);

        // Global admins have access to all projects
        if (await this.isGlobalAdmin(userId)) return true;

        return perms.projectIds.includes(projectId);
    }

    // ==================== QUERY FILTERS ====================

    /**
     * Build permission-based filter for minuta queries
     */
    buildPermissionsFilter(
        query: { proyecto?: string; usuario_id?: string },
        userId: string,
        permissions: UserPermissions
    ): any {
        const canViewAll = permissions.permissions.includes('verTodasMinutas');
        const canSign = permissions.permissions.includes('firmarMinuta');
        const userProjectIds = permissions.projectIds;

        // Global admins can see everything
        if (canViewAll) {
            if (query.proyecto) return { Proyecto: query.proyecto };
            if (query.usuario_id) return { UsuarioId: query.usuario_id };
            return null;
        }

        // Users who can sign can see aprobada/firmada or own minutas
        if (canSign) {
            return {
                OR: [
                    { Estado: 'aprobada' },
                    { Estado: 'firmada' },
                    { UsuarioId: userId }
                ]
            };
        }

        // Default: Own minutas or assigned projects
        const orConditions: any[] = [{ UsuarioId: userId }];

        if (userProjectIds.length > 0) {
            if (query.proyecto) {
                if (userProjectIds.includes(query.proyecto)) {
                    orConditions.push({ Proyecto: query.proyecto });
                }
            } else {
                orConditions.push({ Proyecto: { in: userProjectIds } });
            }
        }

        return { OR: orConditions };
    }

    /**
     * Build date range filter for queries
     */
    buildDateFilter(fechaDesde?: string, fechaHasta?: string): any {
        if (!fechaDesde && !fechaHasta) return null;

        const filter: any = {};
        if (fechaDesde) filter.gte = new Date(fechaDesde);
        if (fechaHasta) filter.lte = new Date(fechaHasta);

        return filter;
    }

    // ==================== ROLE-BASED PERMISSIONS ====================

    /**
     * Get permissions for a specific role
     */
    getPermissionsForRole(role: string): string[] {
        return ROLE_PERMISSIONS[role] || [];
    }

    /**
     * Check if a role has a specific permission
     */
    roleHasPermission(role: string, permission: string): boolean {
        const rolePerms = this.getPermissionsForRole(role);
        return rolePerms.includes(permission);
    }
}
