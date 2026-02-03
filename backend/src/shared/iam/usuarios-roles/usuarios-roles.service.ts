import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PermissionsCacheService } from '../services/permissions-cache.service';

@Injectable()
export class UsuariosRolesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly permissionsCache: PermissionsCacheService
    ) { }

    async assignRole(userId: string, roleId: string) {
        // OPTIMIZACIÓN: Dejar que Prisma valide FKs automáticamente
        // Reducción: 3 queries → 1 query (67% mejora)
        try {
            const result = await this.prisma.usuariosRoles.create({
                data: {
                    IdUsuario: userId,
                    IdRol: roleId,
                },
                select: {
                    // 🔒 SEGURIDAD: NO incluir IdUsuario en la respuesta
                    IdRol: true,
                    CreatedAt: true,
                    Roles: true,
                },
            });

            // ⚡ Invalidar cache centralizado después de asignar rol
            await this.permissionsCache.invalidateUser(userId);

            return result;
        } catch (error: unknown) {
            const prismaError = error as { code?: string };
            // P2002: Unique constraint violation (rol ya asignado)
            if (prismaError.code === 'P2002') {
                throw new ConflictException('El rol ya está asignado a este usuario');
            }
            // P2003: Foreign key constraint violation (usuario o rol no existe)
            if (prismaError.code === 'P2003') {
                throw new NotFoundException('Usuario o rol no encontrado');
            }
            throw error;
        }
    }

    async removeRole(userId: string, roleId: string) {
        // Verificar que la asignación existe
        const existing = await this.prisma.usuariosRoles.findUnique({
            where: {
                IdUsuario_IdRol: {
                    IdUsuario: userId,
                    IdRol: roleId,
                },
            },
        });

        if (!existing) {
            throw new NotFoundException('El rol no está asignado a este usuario');
        }

        const result = await this.prisma.usuariosRoles.delete({
            where: {
                IdUsuario_IdRol: {
                    IdUsuario: userId,
                    IdRol: roleId,
                },
            },
        });

        // ⚡ Invalidar cache centralizado después de remover rol
        await this.permissionsCache.invalidateUser(userId);

        return result;
    }

    async getUserRoles(userId: string) {
        // ⚡ Usar cache centralizado para obtener roles
        // NOTA: No usamos el cache centralizado aquí porque necesitamos el objeto Rol completo con IDs
        // El cache central solo guarda nombres (strings).
        // Se prioriza consistencia y simplicidad sobre micro-optimización de lectura de roles completos.

        const userRoles = await this.prisma.usuariosRoles.findMany({
            where: { IdUsuario: userId },
            include: {
                Roles: true,
            },
        });

        if (userRoles.length === 0) {
            // Comportamiento original lanzaba 404
            // throw new NotFoundException(`Usuario sin roles o no encontrado`);
            // Pero devolver array vacio es mejor practica. Mantendremos original por compatibilidad.
            throw new NotFoundException(`Usuario sin roles o no encontrado`);
        }

        return userRoles.map((ur) => ur.Roles);
    }

    // cache invalidation methods removed as they are delegated via injection usage


    async getUsersByRole(roleId: string) {
        // Verificar que el rol existe
        const role = await this.prisma.roles.findUnique({
            where: { Id: roleId },
        });

        if (!role) {
            throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
        }

        const usersWithRole = await this.prisma.usuariosRoles.findMany({
            where: { IdRol: roleId },
            select: {
                // 🔒 SEGURIDAD: NO incluir IdUsuario en la respuesta
                Profiles: {
                    select: {
                        Email: true,
                        Nombre: true,
                        Apellido: true,
                        Activo: true,
                        // Id: EXCLUIDO por seguridad
                    },
                },
            },
        });

        return usersWithRole.map((ur) => ur.Profiles);
    }

    async getUserPermissions(userId: string) {
        // Obtener todos los roles del usuario
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

        // Extraer permisos únicos
        const permisosSet = new Set<string>();
        const permisos: any[] = [];

        for (const userRole of userRoles) {
            for (const rolePermiso of userRole.Roles.RolesPermisos) {
                if (!permisosSet.has(rolePermiso.Permisos.Id)) {
                    permisosSet.add(rolePermiso.Permisos.Id);
                    permisos.push(rolePermiso.Permisos);
                }
            }
        }

        return permisos;
    }
}
