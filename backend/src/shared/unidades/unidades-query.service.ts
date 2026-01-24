import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FindAllUnidadesQueryDto } from './dto/find-all-unidades-query.dto';

@Injectable()
export class UnidadesQueryService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(query: FindAllUnidadesQueryDto) {
        const where: Record<string, any> = {};

        //  Cache proyecto_id para evitar query extra en cada request
        if (query.proyecto) {
            const proyecto = await this.prisma.proyectos.findFirst({
                where: { Nombre: { equals: query.proyecto, mode: 'insensitive' } },
                select: { Id: true }, // Solo necesitamos el ID
            });
            if (proyecto) {
                where.Edificios = {
                    ProyectoId: proyecto.Id,
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
            where.DetallesVenta_DetallesVenta_UnidadIdToUnidades = {
                is: {
                    EstadoComercial: {
                        NombreEstado: { equals: estados[0], mode: 'insensitive' },
                    },
                },
            };
        } else {
            // Filtro por múltiples estados usando OR
            where.DetallesVenta_DetallesVenta_UnidadIdToUnidades = {
                is: {
                    EstadoComercial: {
                        NombreEstado: { in: estados, mode: 'insensitive' },
                    },
                },
            };
        }

        if (query.etapa && query.etapa !== 'Ninguna') {
            if (query.etapa === 'Sin Etapa') {
                where.EtapaId = null;
            } else {
                where.Etapas = {
                    Nombre: query.etapa,
                };
            }
        }

        if (query.tipo) {
            where.TiposUnidad = {
                Nombre: query.tipo,
            };
        }

        if (query.sectorid) {
            where.SectorId = query.sectorid;
        }

        if (query.nrounidad) {
            where.NroUnidad = query.nrounidad;
        }

        // Usar select en lugar de include para reducir ~60% datos transferidos
        const unidades = await this.prisma.unidades.findMany({
            where,
            select: {
                Id: true,
                SectorId: true,
                Piso: true,
                NroUnidad: true,
                Dormitorio: true,
                Manzana: true,
                Destino: true,
                Frente: true,
                Edificios: {
                    select: {
                        Id: true,
                        NombreEdificio: true,
                        Proyectos: {
                            select: {
                                Id: true,
                                Nombre: true,
                            },
                        },
                    },
                },
                Etapas: {
                    select: {
                        Id: true,
                        Nombre: true,
                    },
                },
                TiposUnidad: {
                    select: {
                        Id: true,
                        Nombre: true,
                    },
                },
                DetallesVenta_DetallesVenta_UnidadIdToUnidades: {
                    select: {
                        PrecioUsd: true,
                        UsdM2: true,
                        EstadoComercial: {
                            select: {
                                Id: true,
                                NombreEstado: true,
                            },
                        },
                    },
                },
                UnidadesMetricas: {
                    select: {
                        M2Exclusivo: true,
                        M2Total: true,
                        M2Cubierto: true,
                    },
                },
            },
            orderBy: [{ SectorId: 'asc' }, { NroUnidad: 'asc' }],
        });

        // Eliminar duplicados por SectorId (clave única)
        const uniqueUnidades = unidades.filter(
            (unidad, index, self) =>
                index === self.findIndex((u) => u.SectorId === unidad.SectorId)
        );

        return uniqueUnidades;
    }

    async findOne(id: string) {
        // id ahora es UUID
        return this.prisma.unidades.findUnique({
            where: { Id: id },
            include: {
                Edificios: {
                    include: {
                        Proyectos: true,
                    },
                },
                Etapas: true,
                TiposUnidad: true,
                DetallesVenta_DetallesVenta_UnidadIdToUnidades: {
                    include: {
                        EstadoComercial: true,
                        Comerciales: true,
                    },
                },
                UnidadesMetricas: true,
            },
        });
    }

    // ⚡ OPTIMIZACIÓN: Batch query para múltiples unidades (elimina N+1)
    async findByIds(ids: string[]) {
        if (!ids.length) return [];

        return this.prisma.unidades.findMany({
            where: { Id: { in: ids } },
            include: {
                Edificios: {
                    include: {
                        Proyectos: true,
                    },
                },
                Etapas: true,
                TiposUnidad: true,
                DetallesVenta_DetallesVenta_UnidadIdToUnidades: {
                    include: {
                        EstadoComercial: true,
                        Comerciales: true,
                    },
                },
                UnidadesMetricas: true,
            },
        });
    }

    async getNaturalezas(): Promise<string[]> {
        // Naturaleza viene de proyectos -> naturalezas
        const result = await this.prisma.naturalezas.findMany({
            select: { Nombre: true },
            orderBy: { Nombre: 'asc' },
        });
        return result.map((r) => r.Nombre).filter(Boolean);
    }

    /**
     * Get all available unit types across all projects
     */
    async getTiposDisponibles(): Promise<string[]> {
        // Usar tabla TiposUnidad
        const result = await this.prisma.tiposUnidad.findMany({
            select: { Nombre: true },
            orderBy: { Nombre: 'asc' },
        });
        return result.map((r) => r.Nombre).filter(Boolean);
    }

    /**
     * Get projects that have units of a specific type
     */
    async getProyectosPorTipo(tipo: string): Promise<string[]> {
        // Query via unidades -> tiposunidad -> proyectostiposunidad -> proyectos
        const result = await this.prisma.proyectos.findMany({
            where: {
                ProyectosTiposUnidad: {
                    some: {
                        TiposUnidad: {
                            Nombre: tipo,
                        },
                    },
                },
            },
            select: { Nombre: true },
            orderBy: { Nombre: 'asc' },
        });
        return result.map((r) => r.Nombre);
    }

    async getEtapas(nombreProyecto: string): Promise<string[]> {
        if (!nombreProyecto) return [];

        const proyecto = await this.prisma.proyectos.findFirst({
            where: { Nombre: { equals: nombreProyecto, mode: 'insensitive' } },
            select: { Id: true },
        });

        if (!proyecto) {
            return [];
        }

        // Query unidades -> edificios -> proyectos + etapas
        // Removed filter EtapaId: { not: null } to include units without stages
        const result = await this.prisma.unidades.findMany({
            where: {
                Edificios: {
                    ProyectoId: proyecto.Id,
                },
            },
            select: {
                EtapaId: true,
                Etapas: {
                    select: { Nombre: true },
                },
            },
            distinct: ['EtapaId'],
            orderBy: {
                Etapas: {
                    Nombre: 'asc',
                },
            },
        });

        // Map null EtapaId to 'Sin Etapa'
        const etapas = result.map((r) => r.Etapas?.Nombre || 'Sin Etapa').filter(Boolean);

        // Remove duplicates (in case 'Sin Etapa' appears multiple times due to distinct logic quirks or if it matches a real name)
        return [...new Set(etapas)];
    }

    async getTipos(nombreProyecto: string, etapa?: string): Promise<string[]> {
        if (!nombreProyecto) return [];

        const proyecto = await this.prisma.proyectos.findFirst({
            where: { Nombre: { equals: nombreProyecto, mode: 'insensitive' } },
        });

        if (!proyecto) return [];

        const where: any = {
            Edificios: {
                ProyectoId: proyecto.Id,
            },
        };

        if (etapa && etapa !== 'Ninguna') {
            if (etapa === 'Sin Etapa') {
                where.EtapaId = null;
            } else {
                where.Etapas = {
                    Nombre: etapa,
                };
            }
        }

        // Query unidades -> TiposUnidad
        const result = await this.prisma.unidades.findMany({
            where,
            select: {
                TiposUnidad: {
                    select: { Nombre: true },
                },
            },
            distinct: ['TipoUnidadId'],
            orderBy: {
                TiposUnidad: {
                    Nombre: 'asc',
                },
            },
        });

        console.log(`[DEBUG] QueryService getTipos found ${result.length} distinct types`);
        result.forEach(r => console.log(`[DEBUG] Found type: ${r.TiposUnidad?.Nombre}`));

        return result.map((r) => r.TiposUnidad.Nombre).filter(Boolean);
    }

    async getSectores(
        nombreProyecto: string,
        etapa?: string,
        tipo?: string,
    ): Promise<string[]> {
        try {
            const proyecto = await this.prisma.proyectos.findFirst({
                where: { Nombre: { equals: nombreProyecto, mode: 'insensitive' } },
                select: { Id: true },
            });

            if (!proyecto) {
                return [];
            }

            const where: any = {
                Edificios: {
                    ProyectoId: proyecto.Id,
                },
            };

            if (etapa && etapa !== 'Ninguna') {
                if (etapa === 'Sin Etapa') {
                    where.EtapaId = null;
                } else {
                    where.Etapas = {
                        Nombre: etapa,
                    };
                }
            }

            if (tipo) {
                where.TiposUnidad = {
                    Nombre: tipo,
                };
            }

            // Query unidades con filtros de relaciones
            const result = await this.prisma.unidades.findMany({
                where,
                select: { SectorId: true },
                distinct: ['SectorId'],
                orderBy: { SectorId: 'asc' },
            });

            return result
                .map((r) => r.SectorId)
                .filter((s) => s != null && s !== '');
        } catch (error) {
            console.error('[ERROR] getSectores failed:', error);
            return []; // Return empty instead of crashing
        }
    }
}
