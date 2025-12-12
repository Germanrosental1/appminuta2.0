import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsuariosRolesService {
    constructor(private readonly prisma: PrismaService) { }

    async assignRole(userId: string, roleId: string) {
        // Verificar que el usuario existe
        const user = await this.prisma.profiles.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
        }

        // Verificar que el rol existe
        const role = await this.prisma.roles.findUnique({
            where: { id: roleId },
        });

        if (!role) {
            throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
        }

        // Verificar si ya existe la asignación
        const existing = await this.prisma.usuarios_roles.findUnique({
            where: {
                idusuario_idrol: {
                    idusuario: userId,
                    idrol: roleId,
                },
            },
        });

        if (existing) {
            throw new ConflictException('El rol ya está asignado a este usuario');
        }

        return this.prisma.usuarios_roles.create({
            data: {
                idusuario: userId,
                idrol: roleId,
            },
            include: {
                roles: true,
            },
        });
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

        return this.prisma.usuarios_roles.delete({
            where: {
                idusuario_idrol: {
                    idusuario: userId,
                    idrol: roleId,
                },
            },
        });
    }

    async getUserRoles(userId: string) {
        console.log(`Getting roles for user ${userId}`);
        // Verificar que el usuario existe
        const user = await this.prisma.profiles.findUnique({
            where: { id: userId },
        });

        if (!user) {
            console.log(`User ${userId} not found`);
            throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
        }

        console.log(`User found, fetching roles...`);
        try {
            const userRoles = await this.prisma.usuarios_roles.findMany({
                where: { idusuario: userId },
                include: {
                    roles: true,
                },
            });
            console.log(`Fetched ${userRoles.length} user roles`);

            // Filter out any entries where the relation might be broken (null roles)
            const result = userRoles
                .filter(ur => ur && ur.roles)
                .map((ur) => ur.roles);

            console.log(`Returning ${result.length} valid roles`);
            return result;
        } catch (error) {
            console.error('Error fetching user roles:', error);
            throw error;
        }
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
