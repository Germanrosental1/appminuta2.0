import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { UpdatePermisoDto } from './dto/update-permiso.dto';

@Injectable()
export class PermisosService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createPermisoDto: CreatePermisoDto) {
        // Verificar si el permiso ya existe
        const existingPermiso = await this.prisma.permisos.findFirst({
            where: { Nombre: createPermisoDto.nombre },
        });

        if (existingPermiso) {
            throw new ConflictException(
                `Ya existe un permiso con el nombre "${createPermisoDto.nombre}"`,
            );
        }

        return this.prisma.permisos.create({
            data: {
                Nombre: createPermisoDto.nombre,
                Descripcion: createPermisoDto.descripcion,
            },
        });
    }

    async findAll() {
        return this.prisma.permisos.findMany({
            orderBy: { Nombre: 'asc' },
        });
    }

    async findOne(id: string) {
        const permiso = await this.prisma.permisos.findUnique({
            where: { Id: id },
        });

        if (!permiso) {
            throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
        }

        return permiso;
    }

    async update(id: string, updatePermisoDto: UpdatePermisoDto) {
        // Verificar que el permiso existe
        await this.findOne(id);

        // Si se está actualizando el nombre, verificar que no exista otro permiso con ese nombre
        if (updatePermisoDto.nombre) {
            const existingPermiso = await this.prisma.permisos.findFirst({
                where: {
                    Nombre: updatePermisoDto.nombre,
                    NOT: { Id: id },
                },
            });

            if (existingPermiso) {
                throw new ConflictException(
                    `Ya existe otro permiso con el nombre "${updatePermisoDto.nombre}"`,
                );
            }
        }

        return this.prisma.permisos.update({
            where: { Id: id },
            data: {
                Nombre: updatePermisoDto.nombre,
                Descripcion: updatePermisoDto.descripcion,
            },
        });
    }

    async remove(id: string) {
        // Verificar que el permiso existe
        await this.findOne(id);

        // Verificar si el permiso está siendo usado
        const rolesWithPermission = await this.prisma.rolesPermisos.count({
            where: { IdPermiso: id },
        });

        if (rolesWithPermission > 0) {
            throw new BadRequestException(
                `No se puede eliminar el permiso porque está asignado a ${rolesWithPermission} rol(es)`,
            );
        }

        return this.prisma.permisos.delete({
            where: { Id: id },
        });
    }
}
