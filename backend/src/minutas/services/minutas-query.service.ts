import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsCacheService } from '../../shared/iam/services/permissions-cache.service';

/**
 * Service responsible for minuta read operations:
 * - Building query filters
 * - Permission-based filtering
 * - Pagination
 */
@Injectable()
export class MinutasQueryService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly permissionsCache: PermissionsCacheService,
    ) { }

    /**
     * Get cached user permissions using the permissions cache service
     */
    async getCachedUserPermissions(userId: string): Promise<{
        permissions: string[];
        projectIds: string[];
        roles: string[];
    }> {
        return this.permissionsCache.getOrFetch(userId, async () => {
            const [userRoles, userProjects] = await Promise.all([
                this.prisma.usuariosRoles.findMany({
                    where: { IdUsuario: userId },
                    include: {
                        Roles: {
                            select: {
                                Nombre: true,
                                RolesPermisos: {
                                    include: {
                                        Permisos: {
                                            select: { Nombre: true }
                                        }
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

            const permissions = [...new Set(
                userRoles.flatMap(ur =>
                    ur.Roles.RolesPermisos.map(rp => rp.Permisos?.Nombre).filter(Boolean)
                )
            )] as string[];

            const roles = [...new Set(
                userRoles.map(ur => ur.Roles.Nombre).filter(Boolean)
            )] as string[];

            const projectIds = [...new Set(
                userProjects.map(up => up.IdProyecto).filter(Boolean)
            )] as string[];

            return { permissions, projectIds, roles };
        });
    }

    /**
     * Build the WHERE clause for findAll queries based on permissions
     */
    buildWhereClause(
        query: { proyecto?: string; estado?: string; usuario_id?: string; fechaDesde?: string; fechaHasta?: string },
        userId: string,
        userPermissions: string[],
        userProjectIds: string[]
    ): Record<string, unknown> {
        const where: Record<string, unknown> = {};

        // 1. Permission filters
        const permissionFilter = this.buildPermissionsFilter(query, userId, userPermissions, userProjectIds);
        if (permissionFilter) {
            Object.assign(where, permissionFilter);
        }

        // 2. State filter
        if (query.estado) where.Estado = query.estado;

        // 3. Date filters
        const dateFilter = this.buildDateFilter(query);
        if (dateFilter) {
            where.FechaCreacion = dateFilter;
        }

        return where;
    }

    /**
     * Build permission-based filter for queries
     */
    buildPermissionsFilter(
        query: { proyecto?: string; usuario_id?: string },
        userId: string,
        userPermissions: string[],
        userProjectIds: string[]
    ): Record<string, unknown> | null {
        const canViewAll = userPermissions.includes('verTodasMinutas');
        const canSign = userPermissions.includes('firmarMinuta');

        if (canViewAll) {
            if (query.proyecto) return { Proyecto: query.proyecto };
            if (query.usuario_id) return { UsuarioId: query.usuario_id };
            return null;
        }

        if (canSign) {
            return {
                OR: [
                    { Estado: 'aprobada' },
                    { Estado: 'firmada' },
                    { UsuarioId: userId }
                ]
            };
        }

        // Default: Assigned projects or own minutas
        const orConditions: Record<string, unknown>[] = [{ UsuarioId: userId }];

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
     * Build date filter for queries
     */
    buildDateFilter(query: { fechaDesde?: string; fechaHasta?: string }): Record<string, Date> | null {
        if (!query.fechaDesde && !query.fechaHasta) return null;

        const dateFilter: Record<string, Date> = {};

        if (query.fechaDesde) {
            dateFilter.gte = new Date(query.fechaDesde);
        }
        if (query.fechaHasta) {
            dateFilter.lte = new Date(query.fechaHasta);
        }

        return dateFilter;
    }

    /**
     * Validate sortBy parameter to prevent injection
     */
    sanitizeSortBy(sortBy?: string): string {
        const allowedFields = ['FechaCreacion', 'Estado', 'Proyecto', 'FechaActualizacion'];
        if (sortBy && allowedFields.includes(sortBy)) {
            return sortBy;
        }
        return 'FechaCreacion';
    }

    /**
     * Cap limit to maximum allowed
     */
    sanitizeLimit(limit: number): number {
        const MAX_LIMIT = 100;
        return Math.min(Math.max(1, limit), MAX_LIMIT);
    }

    /**
     * Get user permissions directly (non-cached version)
     */
    async getUserPermissions(userId: string) {
        const userRoles = await this.prisma.usuariosRoles.findMany({
            where: { IdUsuario: userId },
            include: {
                Roles: {
                    include: {
                        RolesPermisos: {
                            include: {
                                Permisos: true,
                            },
                        },
                    },
                },
            },
        });

        return userRoles.flatMap(ur =>
            ur.Roles.RolesPermisos.map(rp => rp.Permisos)
        );
    }
}
