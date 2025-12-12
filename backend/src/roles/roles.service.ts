import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createRoleDto: CreateRoleDto) {
        // Verificar si el rol ya existe
        const existingRole = await this.prisma.roles.findFirst({
            where: { nombre: createRoleDto.nombre },
        });

        if (existingRole) {
            throw new ConflictException(
                `Ya existe un rol con el nombre "${createRoleDto.nombre}"`,
            );
        }

        return this.prisma.roles.create({
            data: createRoleDto,
        });
    }

    async findAll() {
        return this.prisma.roles.findMany({
            orderBy: { nombre: 'asc' },
        });
    }

    async findOne(id: string) {
        const role = await this.prisma.roles.findUnique({
            where: { id },
            include: {
                roles_permisos: {
                    include: {
                        permisos: true,
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
                    nombre: updateRoleDto.nombre,
                    NOT: { id },
                },
            });

            if (existingRole) {
                throw new ConflictException(
                    `Ya existe otro rol con el nombre "${updateRoleDto.nombre}"`,
                );
            }
        }

        return this.prisma.roles.update({
            where: { id },
            data: updateRoleDto,
        });
    }

    async remove(id: string) {
        // Verificar que el rol existe
        await this.findOne(id);

        // Verificar si el rol está siendo usado
        const usersWithRole = await this.prisma.usuarios_roles.count({
            where: { idrol: id },
        });

        if (usersWithRole > 0) {
            throw new BadRequestException(
                `No se puede eliminar el rol porque está asignado a ${usersWithRole} usuario(s)`,
            );
        }

        return this.prisma.roles.delete({
            where: { id },
        });
    }

    async getPermissions(roleId: string) {
        // Verificar que el rol existe
        await this.findOne(roleId);

        const rolePermissions = await this.prisma.roles_permisos.findMany({
            where: { idrol: roleId },
            include: {
                permisos: true,
            },
        });

        return rolePermissions.map((rp) => rp.permisos);
    }

    async assignPermission(roleId: string, permisoId: string) {
        // Verificar que el rol existe
        await this.findOne(roleId);

        // Verificar que el permiso existe
        const permiso = await this.prisma.permisos.findUnique({
            where: { id: permisoId },
        });

        if (!permiso) {
            throw new NotFoundException(`Permiso con ID ${permisoId} no encontrado`);
        }

        // Verificar si ya existe la asignación
        const existing = await this.prisma.roles_permisos.findUnique({
            where: {
                idrol_idpermiso: {
                    idrol: roleId,
                    idpermiso: permisoId,
                },
            },
        });

        if (existing) {
            throw new ConflictException(
                'El permiso ya está asignado a este rol',
            );
        }

        return this.prisma.roles_permisos.create({
            data: {
                idrol: roleId,
                idpermiso: permisoId,
            },
            include: {
                permisos: true,
            },
        });
    }

    async removePermission(roleId: string, permisoId: string) {
        // Verificar que el rol existe
        await this.findOne(roleId);

        // Verificar que la asignación existe
        const existing = await this.prisma.roles_permisos.findUnique({
            where: {
                idrol_idpermiso: {
                    idrol: roleId,
                    idpermiso: permisoId,
                },
            },
        });

        if (!existing) {
            throw new NotFoundException(
                'El permiso no está asignado a este rol',
            );
        }

        return this.prisma.roles_permisos.delete({
            where: {
                idrol_idpermiso: {
                    idrol: roleId,
                    idpermiso: permisoId,
                },
            },
        });
    }
}
