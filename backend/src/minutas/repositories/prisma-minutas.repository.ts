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
        const result = await this.prisma.minutas_definitivas.findMany({
            where: filter as any,
            orderBy: { fecha_creacion: 'desc' },
        });
        return result as unknown as MinutaEntity[];
    }

    async findById(id: string): Promise<MinutaEntity | null> {
        const result = await this.prisma.minutas_definitivas.findUnique({
            where: { id },
        });
        return result as unknown as MinutaEntity | null;
    }

    async findByIdWithRelations(id: string): Promise<MinutaWithRelations | null> {
        const result = await this.prisma.minutas_definitivas.findUnique({
            where: { id },
            include: {
                users: {
                    select: { email: true },
                },
                proyectos: {
                    select: { nombre: true },
                },
            },
        });
        return result as unknown as MinutaWithRelations | null;
    }

    async create(data: CreateMinutaDto & { usuario_id: string }): Promise<MinutaEntity> {
        const sanitizedData = {
            comentarios: data.comentarios
                ? sanitizeString(data.comentarios)
                : undefined,
            datos: sanitizeObject(data.datos),
            datos_adicionales: data.datos_adicionales
                ? sanitizeObject(data.datos_adicionales)
                : undefined,
            datos_mapa_ventas: data.datos_mapa_ventas
                ? sanitizeObject(data.datos_mapa_ventas)
                : undefined,
            estado: data.estado,
            proyecto: data.proyecto,
            usuario_id: data.usuario_id,
            fecha_creacion: new Date(),
            updated_at: new Date(),
        };

        const result = await this.prisma.minutas_definitivas.create({
            data: sanitizedData as any,
        });
        return result as unknown as MinutaEntity;
    }

    async update(id: string, data: UpdateMinutaDto): Promise<MinutaEntity> {
        const sanitizedData: Record<string, unknown> = {
            updated_at: new Date(),
        };

        if (data.comentarios !== undefined) {
            sanitizedData.comentarios = sanitizeString(data.comentarios);
        }
        if (data.datos !== undefined) {
            sanitizedData.datos = sanitizeObject(data.datos);
        }
        if (data.datos_adicionales !== undefined) {
            sanitizedData.datos_adicionales = sanitizeObject(data.datos_adicionales);
        }
        if (data.datos_mapa_ventas !== undefined) {
            sanitizedData.datos_mapa_ventas = sanitizeObject(data.datos_mapa_ventas);
        }
        if (data.estado !== undefined) {
            sanitizedData.estado = data.estado;
        }

        const result = await this.prisma.minutas_definitivas.update({
            where: { id },
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
        await this.prisma.minutas_definitivas.delete({
            where: { id },
        });
    }

    async count(filter?: Record<string, unknown>): Promise<number> {
        return this.prisma.minutas_definitivas.count({
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
        const allowedSortFields = ['fecha_creacion', 'updated_at', 'proyecto', 'estado'];
        const sortBy = query.sortBy && allowedSortFields.includes(query.sortBy)
            ? query.sortBy
            : 'fecha_creacion';
        const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

        // Permission-based filtering
        const canViewAll = userPermissions.includes('verTodasMinutas');

        if (canViewAll) {
            if (query.proyecto) {
                where.proyecto = query.proyecto;
            }
        } else {
            if (userProjectIds.length === 0) {
                return { data: [], total: 0, page, limit, totalPages: 0 };
            }

            if (query.proyecto) {
                if (userProjectIds.includes(query.proyecto)) {
                    where.proyecto = query.proyecto;
                } else {
                    return { data: [], total: 0, page, limit, totalPages: 0 };
                }
            } else {
                where.proyecto = { in: userProjectIds };
            }
        }

        // Additional filters
        if (query.usuario_id) where.usuario_id = query.usuario_id;
        if (query.estado) where.estado = query.estado;

        // Date filters
        if (query.fechaDesde || query.fechaHasta) {
            const fechaFilter: Record<string, Date> = {};

            if (query.fechaDesde) {
                const fecha = new Date(query.fechaDesde);
                if (Number.isNaN(fecha.getTime())) {
                    throw new BadRequestException('fechaDesde inválida');
                }
                fechaFilter.gte = fecha;
            }

            if (query.fechaHasta) {
                const fecha = new Date(query.fechaHasta);
                if (Number.isNaN(fecha.getTime())) {
                    throw new BadRequestException('fechaHasta inválida');
                }
                fechaFilter.lte = fecha;
            }

            where.fecha_creacion = fechaFilter;
        }

        // Execute queries in parallel
        const [total, minutas] = await Promise.all([
            this.prisma.minutas_definitivas.count({ where: where as any }),
            this.prisma.minutas_definitivas.findMany({
                where: where as any,
                orderBy: { [sortBy]: sortOrder },
                take: limit,
                skip,
                include: {
                    users: {
                        select: { email: true },
                    },
                    proyectos: {
                        select: { nombre: true },
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
        const result = await this.prisma.minutas_definitivas.findMany({
            where: { usuario_id: usuarioId },
            orderBy: { fecha_creacion: 'desc' },
        });
        return result as unknown as MinutaEntity[];
    }

    async findByProyecto(proyectoId: string): Promise<MinutaEntity[]> {
        const result = await this.prisma.minutas_definitivas.findMany({
            where: { proyecto: proyectoId },
            orderBy: { fecha_creacion: 'desc' },
        });
        return result as unknown as MinutaEntity[];
    }
}
