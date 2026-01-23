import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UsuariosRolesService } from '../usuarios-roles/usuarios-roles.service';

@Injectable()
export class RolesService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => UsuariosRolesService))
        private readonly usuariosRolesService: UsuariosRolesService,
    ) { }

    /**
     * 🔒 SEGURIDAD: Invalida cache de todos los usuarios con un rol específico
     * Se llama cuando cambian los permisos de un rol
     */
    private async invalidateCacheForUsersWithRole(roleId: string): Promise<void> {
        const usersWithRole = await this.prisma.usuariosRoles.findMany({
            where: { IdRol: roleId },
            select: { IdUsuario: true },
        });

        for (const user of usersWithRole) {
            this.usuariosRolesService.invalidateUserRolesCache(user.IdUsuario);
        }
    }

    async create(createRoleDto: CreateRoleDto) {
        // Verificar si el rol ya existe
        const existingRole = await this.prisma.roles.findFirst({
            where: { Nombre: createRoleDto.nombre },
        });

        if (existingRole) {
            throw new ConflictException(
                `Ya existe un rol con el nombre "${createRoleDto.nombre}"`,
            );
        }

        return this.prisma.roles.create({
            data: {
                Nombre: createRoleDto.nombre,
            },
        });
    }

    async findAll() {
        return this.prisma.roles.findMany({
            orderBy: { Nombre: 'asc' },
        });
    }

    async findOne(id: string) {
        const role = await this.prisma.roles.findUnique({
            where: { Id: id },
            include: {
                RolesPermisos: {
                    include: {
                        Permisos: true,
                    },
                },
            },
        });

        if (!role) {
            throw new NotFoundException(`Rol con ID ${id} no encontrado`);
        }

        return role;
    }

    async update(id: string, updateRoleDto: UpdateRoleDto) {
        // Verificar que el rol existe
        await this.findOne(id);

        // Si se está actualizando el nombre, verificar que no exista otro rol con ese nombre
        if (updateRoleDto.nombre) {
            const existingRole = await this.prisma.roles.findFirst({
                where: {
                    Nombre: updateRoleDto.nombre,
                    NOT: { Id: id },
                },
            });

            if (existingRole) {
                throw new ConflictException(
                    `Ya existe otro rol con el nombre "${updateRoleDto.nombre}"`,
                );
            }
        }

        return this.prisma.roles.update({
            where: { Id: id },
            data: {
                Nombre: updateRoleDto.nombre,
            },
        });
    }

    async remove(id: string) {
        // Verificar que el rol existe
        await this.findOne(id);

        // Verificar si el rol está siendo usado
        const usersWithRole = await this.prisma.usuariosRoles.count({
            where: { IdRol: id },
        });

        if (usersWithRole > 0) {
            throw new BadRequestException(
                `No se puede eliminar el rol porque está asignado a ${usersWithRole} usuario(s)`,
            );
        }

        return this.prisma.roles.delete({
            where: { Id: id },
        });
    }

    async getPermissions(roleId: string) {
        // Verificar que el rol existe
        await this.findOne(roleId);

        const rolePermissions = await this.prisma.rolesPermisos.findMany({
            where: { IdRol: roleId },
            include: {
                Permisos: true,
            },
        });

        return rolePermissions.map((rp) => rp.Permisos);
    }

    async assignPermission(roleId: string, permisoId: string) {
        // Verificar que el rol existe
        await this.findOne(roleId);

        // Verificar que el permiso existe
        const permiso = await this.prisma.permisos.findUnique({
            where: { Id: permisoId },
        });

        if (!permiso) {
            throw new NotFoundException(`Permiso con ID ${permisoId} no encontrado`);
        }

        // Verificar si ya existe la asignación
        const existing = await this.prisma.rolesPermisos.findUnique({
            where: {
                IdRol_IdPermiso: {
                    IdRol: roleId,
                    IdPermiso: permisoId,
                },
            },
        });

        if (existing) {
            throw new ConflictException(
                'El permiso ya está asignado a este rol',
            );
        }

        const result = await this.prisma.rolesPermisos.create({
            data: {
                IdRol: roleId,
                IdPermiso: permisoId,
            },
            include: {
                Permisos: true,
            },
        });

        // 🔒 SEGURIDAD: Invalidar cache de usuarios con este rol
        await this.invalidateCacheForUsersWithRole(roleId);

        return result;
    }

    async removePermission(roleId: string, permisoId: string) {
        // Verificar que el rol existe
        await this.findOne(roleId);

        // Verificar que la asignación existe
        const existing = await this.prisma.rolesPermisos.findUnique({
            where: {
                IdRol_IdPermiso: {
                    IdRol: roleId,
                    IdPermiso: permisoId,
                },
            },
        });

        if (!existing) {
            throw new NotFoundException(
                'El permiso no está asignado a este rol',
            );
        }

        const result = await this.prisma.rolesPermisos.delete({
            where: {
                IdRol_IdPermiso: {
                    IdRol: roleId,
                    IdPermiso: permisoId,
                },
            },
        });

        // 🔒 SEGURIDAD: Invalidar cache de usuarios con este rol
        await this.invalidateCacheForUsersWithRole(roleId);

        return result;
    }
}
