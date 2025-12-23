import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
            const result = await this.prisma.usuarios_roles.create({
                data: {
                    idusuario: userId,
                    idrol: roleId,
                },
                include: {
                    roles: true,
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
        const existing = await this.prisma.usuarios_roles.findUnique({
            where: {
                idusuario_idrol: {
                    idusuario: userId,
                    idrol: roleId,
                },
            },
        });

        if (!existing) {
            throw new NotFoundException('El rol no está asignado a este usuario');
        }

        const result = await this.prisma.usuarios_roles.delete({
            where: {
                idusuario_idrol: {
                    idusuario: userId,
                    idrol: roleId,
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
        const userRoles = await this.prisma.usuarios_roles.findMany({
            where: { idusuario: userId },
            include: {
                roles: true,
            },
        });

        if (userRoles.length === 0) {
            throw new NotFoundException(`Usuario sin roles o no encontrado`);
        }

        // Filter out any entries where the relation might be broken (null roles)
        const roles = userRoles
            .filter(ur => ur && ur.roles)
            .map((ur) => ur.roles);

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
            where: { id: roleId },
        });

        if (!role) {
            throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
        }

        const usersWithRole = await this.prisma.usuarios_roles.findMany({
            where: { idrol: roleId },
            include: {
                profiles: true,
            },
        });

        return usersWithRole.map((ur) => ur.profiles);
    }

    async getUserPermissions(userId: string) {
        // Obtener todos los roles del usuario
        const userRoles = await this.prisma.usuarios_roles.findMany({
            where: { idusuario: userId },
            include: {
                roles: {
                    include: {
                        roles_permisos: {
                            include: {
                                permisos: true,
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
            for (const rolePermiso of userRole.roles.roles_permisos) {
                if (!permisosSet.has(rolePermiso.permisos.id)) {
                    permisosSet.add(rolePermiso.permisos.id);
                    permisos.push(rolePermiso.permisos);
                }
            }
        }

        return permisos;
    }
}
