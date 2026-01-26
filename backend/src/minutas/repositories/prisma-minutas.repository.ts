import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    IMinutasRepository,
    MinutaEntity,
    MinutaWithRelations
} from './minutas.repository.interface';
import { PaginatedResult } from '../../common/repositories/base.repository';
import { CreateMinutaDto } from '../dto/create-minuta.dto';
import { UpdateMinutaDto } from '../dto/update-minuta.dto';
import { FindAllMinutasQueryDto } from '../dto/find-all-minutas-query.dto';
import { sanitizeString, sanitizeObject } from '../../common/sanitize.helper';

/**
 * Prisma implementation of MinutasRepository
 * Handles all database operations for minutas
 */
@Injectable()
export class PrismaMinutasRepository implements IMinutasRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(filter?: Record<string, unknown>): Promise<MinutaEntity[]> {
        const result = await this.prisma.minutasDefinitivas.findMany({
            where: filter as any,
            orderBy: { FechaCreacion: 'desc' },
        });
        return result as unknown as MinutaEntity[];
    }

    async findById(id: string): Promise<MinutaEntity | null> {
        const result = await this.prisma.minutasDefinitivas.findUnique({
            where: { Id: id },
        });
        return result as unknown as MinutaEntity | null;
    }

    async findByIdWithRelations(id: string): Promise<MinutaWithRelations | null> {
        const result = await this.prisma.minutasDefinitivas.findUnique({
            where: { Id: id },
            include: {
                users: {
                    select: { email: true },
                },
                Proyectos: {
                    select: { Nombre: true },
                },
            },
        });
        return result as unknown as MinutaWithRelations | null;
    }

    async create(data: CreateMinutaDto & { usuario_id: string }): Promise<MinutaEntity> {
        const sanitizedData = {
            Comentario: data.comentarios
                ? sanitizeString(data.comentarios)
                : undefined,
            Dato: sanitizeObject(data.datos),
            DatoAdicional: data.datos_adicionales
                ? sanitizeObject(data.datos_adicionales)
                : undefined,
            DatoMapaVenta: data.datos_mapa_ventas
                ? sanitizeObject(data.datos_mapa_ventas)
                : undefined,
            Estado: data.estado,
            Proyecto: data.proyecto,
            UsuarioId: data.usuario_id,
            FechaCreacion: new Date(),
            UpdatedAt: new Date(),
        };

        const result = await this.prisma.minutasDefinitivas.create({
            data: sanitizedData as any,
        });
        return result as unknown as MinutaEntity;
    }

    async update(id: string, data: UpdateMinutaDto): Promise<MinutaEntity> {
        const sanitizedData: Record<string, unknown> = {
            UpdatedAt: new Date(),
        };

        if (data.comentarios !== undefined) {
            sanitizedData.Comentario = sanitizeString(data.comentarios);
        }
        if (data.datos !== undefined) {
            sanitizedData.Dato = sanitizeObject(data.datos);
        }
        if (data.datos_adicionales !== undefined) {
            sanitizedData.DatoAdicional = sanitizeObject(data.datos_adicionales);
        }
        if (data.datos_mapa_ventas !== undefined) {
            sanitizedData.DatoMapaVenta = sanitizeObject(data.datos_mapa_ventas);
        }
        if (data.estado !== undefined) {
            sanitizedData.Estado = data.estado;
        }

        const result = await this.prisma.minutasDefinitivas.update({
            where: { Id: id },
            data: sanitizedData as any,
        });
        return result as unknown as MinutaEntity;
    }

    async updateWithVersion(
        id: string,
        data: UpdateMinutaDto,
        expectedVersion: number
    ): Promise<{ count: number }> {
        // Use raw query for optimistic locking since Prisma types may not include version
        const result = await this.prisma.$executeRaw`
            UPDATE minutas_definitivas 
            SET 
                estado = COALESCE(${data.estado}, estado),
                comentarios = COALESCE(${data.comentarios ? sanitizeString(data.comentarios) : null}, comentarios),
                version = version + 1,
                updated_at = NOW()
            WHERE id = ${id}::uuid AND version = ${expectedVersion}
        `;
        return { count: result };
    }

    async delete(id: string): Promise<void> {
        await this.prisma.minutasDefinitivas.delete({
            where: { Id: id },
        });
    }

    async count(filter?: Record<string, unknown>): Promise<number> {
        return this.prisma.minutasDefinitivas.count({
            where: filter as any,
        });
    }

    async findAllPaginated(
        query: FindAllMinutasQueryDto,
        userId: string,
        userPermissions: string[],
        userProjectIds: string[]
    ): Promise<PaginatedResult<MinutaWithRelations>> {
        const where: Record<string, unknown> = {};
        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 100);
        const skip = (page - 1) * limit;

        // Sort configuration
        const allowedSortFields = ['FechaCreacion', 'UpdatedAt', 'Proyecto', 'Estado'];
        const sortBy = query.sortBy && allowedSortFields.includes(query.sortBy)
            ? query.sortBy
            : 'FechaCreacion';
        const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

        // Permission-based filtering
        const permissionWhere = this._buildPermissionsWhere(userPermissions, userProjectIds, query.proyecto);
        if (!permissionWhere) {
            return { data: [], total: 0, page, limit, totalPages: 0 };
        }
        Object.assign(where, permissionWhere);

        // Additional filters
        if (query.usuario_id) where.UsuarioId = query.usuario_id;
        if (query.estado) where.Estado = query.estado;

        // Date filters
        if (query.fechaDesde || query.fechaHasta) {
            where.FechaCreacion = this._buildDateWhere(query.fechaDesde, query.fechaHasta);
        }

        // Execute queries in parallel
        const [total, minutas] = await Promise.all([
            this.prisma.minutasDefinitivas.count({ where: where as any }),
            this.prisma.minutasDefinitivas.findMany({
                where: where as any,
                orderBy: { [sortBy]: sortOrder },
                take: limit,
                skip,
                include: {
                    users: {
                        select: { email: true },
                    },
                    Proyectos: {
                        select: { Nombre: true },
                    },
                },
            }),
        ]);

        return {
            data: minutas as unknown as MinutaWithRelations[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findByUsuario(usuarioId: string): Promise<MinutaEntity[]> {
        const result = await this.prisma.minutasDefinitivas.findMany({
            where: { UsuarioId: usuarioId },
            orderBy: { FechaCreacion: 'desc' },
        });
        return result as unknown as MinutaEntity[];
    }

    async findByProyecto(proyectoId: string): Promise<MinutaEntity[]> {
        const result = await this.prisma.minutasDefinitivas.findMany({
            where: { Proyecto: proyectoId },
            orderBy: { FechaCreacion: 'desc' },
        });
        return result as unknown as MinutaEntity[];
    }

    private _buildPermissionsWhere(
        userPermissions: string[],
        userProjectIds: string[],
        requestedProject?: string
    ): Record<string, unknown> | null {
        const canViewAll = userPermissions.includes('verTodasMinutas');

        if (canViewAll) {
            return requestedProject ? { Proyecto: requestedProject } : {};
        }

        if (userProjectIds.length === 0) {
            return null; // No access to any projects
        }

        if (requestedProject) {
            return userProjectIds.includes(requestedProject)
                ? { Proyecto: requestedProject }
                : null; // Access denied to requested project
        }

        return { Proyecto: { in: userProjectIds } };
    }

    private _buildDateWhere(fechaDesde?: string, fechaHasta?: string): Record<string, Date> {
        const fechaFilter: Record<string, Date> = {};

        if (fechaDesde) {
            const fecha = new Date(fechaDesde);
            if (Number.isNaN(fecha.getTime())) {
                throw new BadRequestException('fechaDesde inválida');
            }
            fechaFilter.gte = fecha;
        }

        if (fechaHasta) {
            const fecha = new Date(fechaHasta);
            if (Number.isNaN(fecha.getTime())) {
                throw new BadRequestException('fechaHasta inválida');
            }
            fechaFilter.lte = fecha;
        }

        return fechaFilter;
    }
}
