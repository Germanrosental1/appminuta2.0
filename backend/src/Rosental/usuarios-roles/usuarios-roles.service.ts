import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ⚡ CACHE: Cache in-memory para roles de usuario (TTL: 5 minutos)
interface UserRolesCache {
    roles: any[];
    cachedAt: number;
}
const ROLES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const userRolesCache = new Map<string, UserRolesCache>();

@Injectable()
export class UsuariosRolesService {
    constructor(private readonly prisma: PrismaService) { }

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

            // ⚡ Invalidar cache después de asignar rol
            this.invalidateUserRolesCache(userId);

            return result;
        } catch (error) {
            // P2002: Unique constraint violation (rol ya asignado)
            if (error.code === 'P2002') {
                throw new ConflictException('El rol ya está asignado a este usuario');
            }
            // P2003: Foreign key constraint violation (usuario o rol no existe)
            if (error.code === 'P2003') {
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

        // ⚡ Invalidar cache después de remover rol
        this.invalidateUserRolesCache(userId);

        return result;
    }

    async getUserRoles(userId: string) {
        // ⚡ Verificar si hay cache válido
        const cached = userRolesCache.get(userId);
        const now = Date.now();

        if (cached && (now - cached.cachedAt) < ROLES_CACHE_TTL_MS) {
            return cached.roles;
        }

        // Si no hay cache o expiró, hacer la query
        const userRoles = await this.prisma.usuariosRoles.findMany({
            where: { IdUsuario: userId },
            include: {
                Roles: true,
            },
        });

        if (userRoles.length === 0) {
            throw new NotFoundException(`Usuario sin roles o no encontrado`);
        }

        // Filter out any entries where the relation might be broken (null roles)
        const roles = userRoles
            .filter(ur => ur && ur.Roles)
            .map((ur) => ur.Roles);

        // Guardar en cache
        userRolesCache.set(userId, {
            roles,
            cachedAt: now,
        });

        return roles;
    }

    // Método para invalidar cache de un usuario (llamar cuando cambien sus roles)
    public invalidateUserRolesCache(userId: string): void {
        userRolesCache.delete(userId);
    }

    // Método para limpiar todo el cache de roles
    public clearAllRolesCache(): void {
        userRolesCache.clear();
    }

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
