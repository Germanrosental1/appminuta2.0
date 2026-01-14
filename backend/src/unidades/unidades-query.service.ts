import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FindAllUnidadesQueryDto } from './dto/find-all-unidades-query.dto';

@Injectable()
export class UnidadesQueryService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(query: FindAllUnidadesQueryDto) {
        const where: Record<string, any> = {};

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

        // Filtrar por estado - por defecto "Disponible" y "Pisada" (case insensitive)
        // Soporta múltiples estados separados por coma (ej: "disponible,pisada")
        const estadoFiltro = query.estado || 'disponible,pisada';
        const estados = estadoFiltro.split(',').map(e => e.trim());

        if (estados.length === 1) {
            // Filtro simple por un solo estado
            where.detallesventa_detallesventa_unidad_idTounidades = {
                is: {
                    estadocomercial: {
                        nombreestado: { equals: estados[0], mode: 'insensitive' },
                    },
                },
            };
        } else {
            // Filtro por múltiples estados usando OR
            where.detallesventa_detallesventa_unidad_idTounidades = {
                is: {
                    estadocomercial: {
                        nombreestado: { in: estados, mode: 'insensitive' },
                    },
                },
            };
        }

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
        if (!nombreProyecto) return [];

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
        if (!nombreProyecto) return [];

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
}
