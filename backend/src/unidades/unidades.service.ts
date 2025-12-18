import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { FindAllUnidadesQueryDto } from './dto/find-all-unidades-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UnidadesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createUnidadDto: CreateUnidadDto) {
        // Verificar que el sectorid no exista
        const existing = await this.prisma.unidades.findUnique({
            where: { sectorid: createUnidadDto.sectorid },
        });

        if (existing) {
            throw new ConflictException(
                `Ya existe una unidad con sectorid '${createUnidadDto.sectorid}'`
            );
        }

        return this.prisma.unidades.create({
            data: {
                sectorid: createUnidadDto.sectorid,
                tipounidad_id: createUnidadDto.tipounidad_id,
                edificio_id: createUnidadDto.edificio_id,
                etapa_id: createUnidadDto.etapa_id,
                piso: createUnidadDto.piso,
                nrounidad: createUnidadDto.nrounidad,
                dormitorios: createUnidadDto.dormitorios,
                manzana: createUnidadDto.manzana,
                destino: createUnidadDto.destino,
                frente: createUnidadDto.frente,
            },
            include: {
                edificios: true,
                etapas: true,
                tiposunidad: true,
            },
        });
    }

    async findAll(query: FindAllUnidadesQueryDto) {
        const where: Prisma.unidadesWhereInput = {};

        //  Cache proyecto_id para evitar query extra en cada request
        if (query.proyecto) {
            const proyecto = await this.prisma.proyectos.findFirst({
                where: { nombre: { equals: query.proyecto, mode: 'insensitive' } },
                select: { id: true }, // Solo necesitamos el ID
            });
            if (proyecto) {
                where.edificios = {
                    proyecto_id: proyecto.id,
                };
            } else {
                return [];
            }
        }

        // Filtrar por estado - por defecto solo "Disponible" (case insensitive)
        // Usar 'is' para relación nullable 1-to-1
        const estadoFiltro = query.estado || 'disponible';
        where.detallesventa_detallesventa_unidad_idTounidades = {
            is: {
                estadocomercial: {
                    nombreestado: { equals: estadoFiltro, mode: 'insensitive' },
                },
            },
        };

        if (query.etapa && query.etapa !== 'Ninguna') {
            where.etapas = {
                nombre: query.etapa,
            };
        }

        if (query.tipo) {
            where.tiposunidad = {
                nombre: query.tipo,
            };
        }

        if (query.sectorid) {
            where.sectorid = query.sectorid;
        }

        if (query.nrounidad) {
            where.nrounidad = query.nrounidad;
        }

        // Usar select en lugar de include para reducir ~60% datos transferidos
        const unidades = await this.prisma.unidades.findMany({
            where,
            select: {
                id: true,
                sectorid: true,
                piso: true,
                nrounidad: true,
                dormitorios: true,
                manzana: true,
                destino: true,
                frente: true,
                edificios: {
                    select: {
                        id: true,
                        nombreedificio: true,
                        proyectos: {
                            select: {
                                id: true,
                                nombre: true,
                            },
                        },
                    },
                },
                etapas: {
                    select: {
                        id: true,
                        nombre: true,
                    },
                },
                tiposunidad: {
                    select: {
                        id: true,
                        nombre: true,
                    },
                },
                detallesventa_detallesventa_unidad_idTounidades: {
                    select: {
                        preciousd: true,
                        usdm2: true,
                        estadocomercial: {
                            select: {
                                id: true,
                                nombreestado: true,
                            },
                        },
                    },
                },
                unidadesmetricas: {
                    select: {
                        m2exclusivos: true,
                        m2totales: true,
                        m2cubiertos: true,
                    },
                },
            },
            orderBy: [{ sectorid: 'asc' }, { nrounidad: 'asc' }],
        });

        // Eliminar duplicados por sectorid (clave única)
        const uniqueUnidades = unidades.filter(
            (unidad, index, self) =>
                index === self.findIndex((u) => u.sectorid === unidad.sectorid)
        );

        return uniqueUnidades;
    }

    async findOne(id: string) {
        // id ahora es UUID
        return this.prisma.unidades.findUnique({
            where: { id },
            include: {
                edificios: {
                    include: {
                        proyectos: true,
                    },
                },
                etapas: true,
                tiposunidad: true,
                detallesventa_detallesventa_unidad_idTounidades: {
                    include: {
                        estadocomercial: true,
                        comerciales: true,
                    },
                },
                unidadesmetricas: true,
            },
        });
    }

    // ⚡ OPTIMIZACIÓN: Batch query para múltiples unidades (elimina N+1)
    async findByIds(ids: string[]) {
        if (!ids.length) return [];

        return this.prisma.unidades.findMany({
            where: { id: { in: ids } },
            include: {
                edificios: {
                    include: {
                        proyectos: true,
                    },
                },
                etapas: true,
                tiposunidad: true,
                detallesventa_detallesventa_unidad_idTounidades: {
                    include: {
                        estadocomercial: true,
                        comerciales: true,
                    },
                },
                unidadesmetricas: true,
            },
        });
    }

    async getNaturalezas(): Promise<string[]> {
        // Naturaleza viene de proyectos -> naturalezas
        const result = await this.prisma.naturalezas.findMany({
            select: { nombre: true },
            orderBy: { nombre: 'asc' },
        });
        return result.map((r) => r.nombre).filter(Boolean);
    }

    /**
     * Get all available unit types across all projects
     */
    async getTiposDisponibles(): Promise<string[]> {
        // Usar tabla tiposunidad
        const result = await this.prisma.tiposunidad.findMany({
            select: { nombre: true },
            orderBy: { nombre: 'asc' },
        });
        return result.map((r) => r.nombre).filter(Boolean);
    }

    /**
     * Get projects that have units of a specific type
     */
    async getProyectosPorTipo(tipo: string): Promise<string[]> {
        // Query via unidades -> tiposunidad -> proyectostiposunidad -> proyectos
        const result = await this.prisma.proyectos.findMany({
            where: {
                proyectostiposunidad: {
                    some: {
                        tiposunidad: {
                            nombre: tipo,
                        },
                    },
                },
            },
            select: { nombre: true },
            orderBy: { nombre: 'asc' },
        });
        return result.map((r) => r.nombre);
    }

    async getEtapas(nombreProyecto: string): Promise<string[]> {
        const proyecto = await this.prisma.proyectos.findFirst({
            where: { nombre: { equals: nombreProyecto, mode: 'insensitive' } },
            select: { id: true },
        });

        if (!proyecto) {
            return [];
        }

        // Query unidades -> edificios -> proyectos + etapas
        const result = await this.prisma.unidades.findMany({
            where: {
                edificios: {
                    proyecto_id: proyecto.id,
                },
                etapa_id: { not: null },
            },
            select: {
                etapas: {
                    select: { nombre: true },
                },
            },
            distinct: ['etapa_id'],
            orderBy: {
                etapas: {
                    nombre: 'asc',
                },
            },
        });

        return result.map((r) => r.etapas?.nombre).filter(Boolean);
    }

    async getTipos(nombreProyecto: string, etapa?: string): Promise<string[]> {
        const proyecto = await this.prisma.proyectos.findFirst({
            where: { nombre: { equals: nombreProyecto, mode: 'insensitive' } },
        });

        if (!proyecto) return [];

        const where: any = {
            edificios: {
                proyecto_id: proyecto.id,
            },
        };

        if (etapa && etapa !== 'Ninguna') {
            where.etapas = {
                nombre: etapa,
            };
        }

        // Query unidades -> tiposunidad
        const result = await this.prisma.unidades.findMany({
            where,
            select: {
                tiposunidad: {
                    select: { nombre: true },
                },
            },
            distinct: ['tipounidad_id'],
            orderBy: {
                tiposunidad: {
                    nombre: 'asc',
                },
            },
        });

        return result.map((r) => r.tiposunidad.nombre).filter(Boolean);
    }

    async getSectores(
        nombreProyecto: string,
        etapa?: string,
        tipo?: string,
    ): Promise<string[]> {
        try {
            const proyecto = await this.prisma.proyectos.findFirst({
                where: { nombre: { equals: nombreProyecto, mode: 'insensitive' } },
                select: { id: true },
            });

            if (!proyecto) {
                return [];
            }

            const where: any = {
                edificios: {
                    proyecto_id: proyecto.id,
                },
            };

            if (etapa && etapa !== 'Ninguna') {
                where.etapas = {
                    nombre: etapa,
                };
            }

            if (tipo) {
                where.tiposunidad = {
                    nombre: tipo,
                };
            }

            // Query unidades con filtros de relaciones
            const result = await this.prisma.unidades.findMany({
                where,
                select: { sectorid: true },
                distinct: ['sectorid'],
                orderBy: { sectorid: 'asc' },
            });

            return result
                .map((r) => r.sectorid)
                .filter((s) => s != null && s !== '');
        } catch (error) {
            console.error('[ERROR] getSectores failed:', error);
            return []; // Return empty instead of crashing
        }
    }

    async update(id: string, updateUnidadDto: UpdateUnidadDto) {
        // Verificar que la unidad existe
        const existing = await this.prisma.unidades.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`Unidad con ID '${id}' no encontrada`);
        }

        // Verificar unicidad de sectorid si se está cambiando
        if (updateUnidadDto.sectorid && updateUnidadDto.sectorid !== existing.sectorid) {
            const duplicate = await this.prisma.unidades.findUnique({
                where: { sectorid: updateUnidadDto.sectorid },
            });

            if (duplicate) {
                throw new ConflictException(
                    `Ya existe una unidad con sectorid '${updateUnidadDto.sectorid}'`
                );
            }
        }

        return this.prisma.unidades.update({
            where: { id },
            data: updateUnidadDto,
            include: {
                edificios: true,
                etapas: true,
                tiposunidad: true,
            },
        });
    }

    async remove(id: string) {
        // Verificar que la unidad existe
        const existing = await this.prisma.unidades.findUnique({
            where: { id },
            include: {
                detallesventa_detallesventa_unidad_idTounidades: true,
            },
        });

        if (!existing) {
            throw new NotFoundException(`Unidad con ID '${id}' no encontrada`);
        }

        // Si tiene detalles de venta relacionados, eliminarlos primero
        if (existing.detallesventa_detallesventa_unidad_idTounidades) {
            await this.prisma.detallesventa.delete({
                where: { unidad_id: id },
            });
        }

        // Eliminar métricas si existen
        await this.prisma.unidadesmetricas.deleteMany({
            where: { unidad_id: id },
        });

        return this.prisma.unidades.delete({
            where: { id },
        });
    }
}
