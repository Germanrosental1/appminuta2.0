import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { UpdateUnidadCompleteDto } from './dto/update-unidad-complete.dto';
import { FindAllUnidadesQueryDto } from './dto/find-all-unidades-query.dto';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class UnidadesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createUnidadDto: CreateUnidadDto) {
        // Verificar que el sectorid no exista
        const existing = await this.prisma.unidades.findUnique({
            where: { SectorId: createUnidadDto.sectorid },
        });

        if (existing) {
            throw new ConflictException(
                `Ya existe una unidad con sectorid '${createUnidadDto.sectorid}'`
            );
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Resolver IDs de catálogos y entidades
            const { estadoId, comercialId } = await this._resolveCatalogIds(tx, createUnidadDto);
            const { tipoId, edificioId, etapaId } = await this._resolveEntityIds(tx, createUnidadDto);

            // 2. Crear Unidad
            const newUnit = await this._createUnidadRecord(tx, createUnidadDto, tipoId, edificioId, etapaId);

            // 3. Crear Métricas
            await this._createMetricas(tx, newUnit.Id, createUnidadDto);

            // 4. Crear Detalles Venta
            await this._createDetallesVenta(tx, newUnit.Id, createUnidadDto, estadoId, comercialId);

            // Devolver unidad completa
            return tx.unidades.findUnique({
                where: { Id: newUnit.Id },
                include: {
                    Edificios: true,
                    Etapas: true,
                    TiposUnidad: true,
                }
            });
        });
    }

    private async _resolveCatalogIds(tx: any, dto: CreateUnidadDto) {
        let estadoId: string | null = null;
        if (dto.estadocomercial) {
            const estado = await tx.estadoComercial.findFirst({ where: { NombreEstado: { equals: dto.estadocomercial, mode: 'insensitive' } } });
            if (estado) estadoId = estado.Id;
        }

        let comercialId: string | null = null;
        if (dto.comercial) {
            const comercial = await tx.comerciales.findFirst({ where: { Nombre: { equals: dto.comercial, mode: 'insensitive' } } });
            if (comercial) comercialId = comercial.Id;
        }
        return { estadoId, comercialId };
    }

    private async _resolveEntityIds(tx: any, dto: CreateUnidadDto) {
        const tipoId = await this._resolveTipoUnidad(tx, dto.tipounidad_id);
        const edificioId = await this._resolveEdificio(tx, dto.edificio_id, dto.proyecto_id);
        const etapaId = await this._resolveEtapa(tx, dto.etapa_id);

        return { tipoId, edificioId, etapaId };
    }

    private async _resolveTipoUnidad(tx: any, tipoId?: string) {
        if (!tipoId || tipoId.includes('-')) return tipoId;

        const tipo = await tx.tiposUnidad.findFirst({ where: { Nombre: { equals: tipoId, mode: 'insensitive' } } });
        if (tipo) return tipo.Id;

        const newTipo = await tx.tiposUnidad.create({ data: { Nombre: tipoId } });
        return newTipo.Id;
    }

    private async _resolveEdificio(tx: any, edificioId?: string, proyectoId?: string) {
        if (!edificioId || edificioId.includes('-')) return edificioId;

        const whereClause: any = { NombreEdificio: { equals: edificioId, mode: 'insensitive' } };
        if (proyectoId) whereClause.ProyectoId = proyectoId;

        const edificio = await tx.edificios.findFirst({ where: whereClause });
        if (edificio) return edificio.Id;

        if (proyectoId) {
            const newEdificio = await tx.edificios.create({
                data: { NombreEdificio: edificioId, ProyectoId: proyectoId }
            });
            return newEdificio.Id;
        }

        return edificioId;
    }

    private async _resolveEtapa(tx: any, etapaId?: string) {
        if (!etapaId || etapaId.includes('-')) return etapaId;

        const etapa = await tx.etapas.findFirst({ where: { Nombre: { equals: etapaId, mode: 'insensitive' } } });
        if (etapa) return etapa.Id;

        const newEtapa = await tx.etapas.create({ data: { Nombre: etapaId } });
        return newEtapa.Id;
    }

    private async _createUnidadRecord(tx: any, dto: CreateUnidadDto, tipoId: string, edificioId: string, etapaId: string) {
        const data = this._mapDtoToUnidadData(dto, tipoId, edificioId, etapaId);
        return tx.unidades.create({ data });
    }

    private async _createMetricas(tx: any, unitId: string, dto: CreateUnidadDto) {
        const data = this._mapDtoToMetricsData(dto);
        await tx.unidadesMetricas.create({
            data: { ...data, UnidadId: unitId }
        });
    }

    private async _createDetallesVenta(tx: any, unitId: string, dto: CreateUnidadDto, estadoId: string | null, comercialId: string | null) {
        const data = this._mapDtoToSalesData(dto, estadoId, comercialId);
        await tx.detallesVenta.create({
            data: { ...data, UnidadId: unitId }
        });
    }

    // Shared Helper: Map DTO to Unidad Data
    private _mapDtoToUnidadData(dto: any, tipoId?: string, edificioId?: string, etapaId?: string) {
        const data: any = {};
        if (dto.sectorid !== undefined) data.SectorId = dto.sectorid;
        if (tipoId !== undefined) data.TipoUnidadId = tipoId;
        else if (dto.tipounidad_id !== undefined) data.TipoUnidadId = dto.tipounidad_id;

        if (edificioId !== undefined) data.EdificioId = edificioId;
        else if (dto.edificio_id !== undefined) data.EdificioId = dto.edificio_id;

        if (etapaId !== undefined) data.EtapaId = etapaId;
        else if (dto.etapa_id !== undefined) data.EtapaId = dto.etapa_id;

        if (dto.piso !== undefined) data.Piso = dto.piso;
        if (dto.nrounidad !== undefined) data.NroUnidad = dto.nrounidad;
        if (dto.dormitorios !== undefined) data.Dormitorio = dto.dormitorios;
        if (dto.manzana !== undefined) data.Manzana = dto.manzana;
        if (dto.destino !== undefined) data.Destino = dto.destino;
        if (dto.frente !== undefined) data.Frente = dto.frente;
        return data;
    }

    // Shared Helper: Map DTO to Metrics Data
    private _mapDtoToMetricsData(dto: any) {
        const data: any = {};
        if (dto.m2exclusivos !== undefined) data.M2Exclusivo = dto.m2exclusivos;
        if (dto.m2patioterraza !== undefined) data.M2PatioTerraza = dto.m2patioterraza;
        if (dto.tipopatio_id !== undefined) data.TipoPatioId = dto.tipopatio_id;
        if (dto.m2comunes !== undefined) data.M2Comun = dto.m2comunes;
        if (dto.m2calculo !== undefined) data.M2Calculo = dto.m2calculo;
        if (dto.m2totales !== undefined) data.M2Total = dto.m2totales;
        if (dto.m2cubiertos !== undefined) data.M2Cubierto = dto.m2cubiertos;
        else if (dto.m2cubiertos === undefined && dto.m2exclusivos !== undefined) data.M2Cubierto = 0; // Default for create

        if (dto.m2semicubiertos !== undefined) data.M2Semicubierto = dto.m2semicubiertos;
        else if (dto.m2semicubiertos === undefined && dto.m2exclusivos !== undefined) data.M2Semicubierto = 0; // Default for create

        if (dto.tamano !== undefined) data.Tamano = dto.tamano;
        else if (dto.tamano === undefined && dto.m2exclusivos !== undefined) data.Tamano = '0'; // Default for create

        return data;
    }

    // Shared Helper: Map DTO to Sales Data
    private _mapDtoToSalesData(dto: any, resolvedEstadoId: string | null = null, resolvedComercialId: string | null = null) {
        const data: any = {};

        // IDs
        data.EstadoId = resolvedEstadoId || dto.estado_id;
        data.ComercialId = resolvedComercialId || dto.comercial_id;

        if (dto.motivonodisp_id !== undefined) data.MotivoNoDispId = dto.motivonodisp_id;
        if (dto.preciousd !== undefined) data.PrecioUsd = dto.preciousd || 0;
        if (dto.usdm2 !== undefined) data.UsdM2 = dto.usdm2 || 0;

        // Cliente Interesado
        if (dto.clienteinteresado !== undefined) {
            data.ClienteInteresado = (dto.clienteinteresado && String(dto.clienteinteresado).trim() !== '') ? dto.clienteinteresado : null;
        }

        if (dto.clientetitularboleto !== undefined) data.Titular = dto.clientetitularboleto;
        if (dto.obs !== undefined) data.Obs = dto.obs;

        // Dates
        if (dto.fechareserva !== undefined) data.FechaReserva = this._parseDate(dto.fechareserva);
        if (dto.fechafirmaboleto !== undefined) data.FechaFirmaBoleto = this._parseDate(dto.fechafirmaboleto);
        if (dto.fechaposesion !== undefined) data.FechaPosesion = this._parseDate(dto.fechaposesion);

        if (dto.tipocochera_id !== undefined) data.TipoCocheraId = dto.tipocochera_id;
        if (dto.unidadcomprador_id !== undefined) data.UnidadCompradorId = dto.unidadcomprador_id;

        return data;
    }

    private _parseDate(dateStr?: string): Date | null {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    async updateComplete(id: string, updateDto: UpdateUnidadCompleteDto) {
        const existing = await this.prisma.unidades.findUnique({ where: { Id: id } });
        if (!existing) throw new NotFoundException(`Unidad con ID '${id}' no encontrada`);

        try {
            return await this.prisma.$transaction(async (tx) => {
                // 2. Update Unidad Base
                const unidadData = this._mapDtoToUnidadData(updateDto);
                if (Object.keys(unidadData).length > 0) {
                    await tx.unidades.update({ where: { Id: id }, data: unidadData });
                }

                // 3. Upsert Metrics
                const metricsData = this._mapDtoToMetricsData(updateDto);
                if (Object.keys(metricsData).length > 0) {
                    const existingMetrics = await tx.unidadesMetricas.findUnique({ where: { UnidadId: id } });
                    if (existingMetrics) {
                        await tx.unidadesMetricas.update({ where: { UnidadId: id }, data: metricsData });
                    } else {
                        await tx.unidadesMetricas.create({ data: { ...metricsData, UnidadId: id } });
                    }
                }

                // 4. Upsert Sales Details
                await this._updateSalesDetails(tx, id, updateDto);

                // Return complete updated unit
                return await tx.unidades.findUnique({
                    where: { Id: id },
                    include: {
                        Edificios: { include: { Proyectos: true } },
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
            }, {
                timeout: 10000
            });
        } catch (error: unknown) {
            console.error('Error in updateComplete transaction:', error);
            throw error;
        }
    }

    private async _updateSalesDetails(tx: any, id: string, updateDto: UpdateUnidadCompleteDto) {
        let salesData: any = {};

        let resolvedEstadoId: string | null = null;
        if (updateDto.estadocomercial) {
            const estado = await tx.estadoComercial.findUnique({
                where: { NombreEstado: updateDto.estadocomercial }
            });
            if (estado) resolvedEstadoId = estado.Id;
            else console.warn(`Estado comercial '${updateDto.estadocomercial}' no encontrado`);
        }

        salesData = this._mapDtoToSalesData(updateDto, resolvedEstadoId);

        if (Object.keys(salesData).length > 0) {
            const existingSales = await tx.detallesVenta.findUnique({ where: { UnidadId: id } });
            if (existingSales) {
                await tx.detallesVenta.update({ where: { UnidadId: id }, data: salesData });
            } else {
                await tx.detallesVenta.create({ data: { ...salesData, UnidadId: id } });
            }
        }
    }

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
                return { data: [], pagination: { page: 1, limit: query.limit || 100, total: 0, totalPages: 0 } };
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
            where.Etapas = {
                Nombre: query.etapa,
            };
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

        // ⚡ PERFORMANCE: Paginación
        const page = query.page || 1;
        const limit = query.limit || 100;
        const skip = (page - 1) * limit;

        // Ejecutar count y findMany en paralelo para mejor performance
        const [total, unidades] = await Promise.all([
            this.prisma.unidades.count({ where }),
            this.prisma.unidades.findMany({
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
                skip,
                take: limit,
            }),
        ]);

        // Eliminar duplicados por sectorid (clave única)
        const uniqueUnidades = unidades.filter(
            (unidad, index, self) =>
                index === self.findIndex((u) => u.SectorId === unidad.SectorId)
        );

        return {
            data: uniqueUnidades,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
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
        // Usar tabla tiposunidad
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
        const result = await this.prisma.unidades.findMany({
            where: {
                Edificios: {
                    ProyectoId: proyecto.Id,
                },
                EtapaId: { not: null },
            },
            select: {
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

        return result.map((r) => r.Etapas?.Nombre).filter(Boolean);
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
            where.Etapas = {
                Nombre: etapa,
            };
        }

        // Query unidades -> tiposunidad
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
                where.Etapas = {
                    Nombre: etapa,
                };
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
        } catch (error: unknown) {
            console.error('[ERROR] getSectores failed:', error);
            return []; // Return empty instead of crashing
        }
    }

    async update(id: string, updateUnidadDto: UpdateUnidadDto) {
        // Verificar que la unidad existe
        const existing = await this.prisma.unidades.findUnique({
            where: { Id: id },
        });

        if (!existing) {
            throw new NotFoundException(`Unidad con ID '${id}' no encontrada`);
        }

        // Verificar unicidad de sectorid si se está cambiando
        if (updateUnidadDto.sectorid && updateUnidadDto.sectorid !== existing.SectorId) {
            const duplicate = await this.prisma.unidades.findUnique({
                where: { SectorId: updateUnidadDto.sectorid },
            });

            if (duplicate) {
                throw new ConflictException(
                    `Ya existe una unidad con sectorid '${updateUnidadDto.sectorid}'`
                );
            }
        }

        // Map DTO fields to Prisma model fields
        const updateData: any = {};
        if (updateUnidadDto.sectorid !== undefined) updateData.SectorId = updateUnidadDto.sectorid;
        if (updateUnidadDto.tipounidad_id !== undefined) updateData.TipoUnidadId = updateUnidadDto.tipounidad_id;
        if (updateUnidadDto.edificio_id !== undefined) updateData.EdificioId = updateUnidadDto.edificio_id;
        if (updateUnidadDto.etapa_id !== undefined) updateData.EtapaId = updateUnidadDto.etapa_id;
        if (updateUnidadDto.piso !== undefined) updateData.Piso = updateUnidadDto.piso;
        if (updateUnidadDto.nrounidad !== undefined) updateData.NroUnidad = updateUnidadDto.nrounidad;
        if (updateUnidadDto.dormitorios !== undefined) updateData.Dormitorio = updateUnidadDto.dormitorios;
        if (updateUnidadDto.manzana !== undefined) updateData.Manzana = updateUnidadDto.manzana;
        if (updateUnidadDto.destino !== undefined) updateData.Destino = updateUnidadDto.destino;
        if (updateUnidadDto.frente !== undefined) updateData.Frente = updateUnidadDto.frente;

        return this.prisma.unidades.update({
            where: { Id: id },
            data: updateData,
            include: {
                Edificios: true,
                Etapas: true,
                TiposUnidad: true,
            },
        });
    }





    async remove(id: string) {
        // Verificar que la unidad existe
        const existing = await this.prisma.unidades.findUnique({
            where: { Id: id },
            include: {
                DetallesVenta_DetallesVenta_UnidadIdToUnidades: true,
            },
        });

        if (!existing) {
            throw new NotFoundException(`Unidad con ID '${id}' no encontrada`);
        }

        // Si tiene detalles de venta relacionados, eliminarlos primero
        if (existing.DetallesVenta_DetallesVenta_UnidadIdToUnidades) {
            await this.prisma.detallesVenta.delete({
                where: { UnidadId: id },
            });
        }

        // Eliminar métricas si existen
        await this.prisma.unidadesMetricas.deleteMany({
            where: { UnidadId: id },
        });

        return this.prisma.unidades.delete({
            where: { Id: id },
        });
    }

    /**
     * Adjust prices for all units in specified projects
     * Supports percentage-based and fixed value adjustments
     */
    async adjustPricesByProjects(
        projectIds: string[],
        mode: 'PERCENTAGE_TOTAL' | 'PERCENTAGE_M2' | 'FIXED_TOTAL' | 'FIXED_M2',
        percentage?: number,
        fixedValue?: number
    ) {
        const unidades = await this.prisma.unidades.findMany({
            where: {
                Edificios: {
                    ProyectoId: { in: projectIds }
                }
            },
            include: {
                DetallesVenta_DetallesVenta_UnidadIdToUnidades: true,
                UnidadesMetricas: true
            }
        });

        const updates = [];

        for (const unidad of unidades) {
            const detalles = unidad.DetallesVenta_DetallesVenta_UnidadIdToUnidades;
            const metricas = unidad.UnidadesMetricas;

            if (!detalles) continue;

            const { newPrecioUsd, newUsdM2 } = this._calculatePriceAdjustments(
                detalles.PrecioUsd ? Number(detalles.PrecioUsd) : 0,
                detalles.UsdM2 ? Number(detalles.UsdM2) : 0,
                metricas?.M2Total ? Number(metricas.M2Total) : 0,
                mode,
                percentage,
                fixedValue
            );

            updates.push(
                this.prisma.detallesVenta.update({
                    where: { UnidadId: unidad.Id },
                    data: {
                        PrecioUsd: newPrecioUsd,
                        UsdM2: newUsdM2
                    }
                })
            );
        }

        await this.prisma.$transaction(updates);

        return {
            updated: updates.length,
            message: `Successfully updated ${updates.length} units`
        };
    }

    private _calculatePriceAdjustments(
        currentPrecioUsd: number,
        currentUsdM2: number,
        m2Total: number,
        mode: string,
        percentage?: number,
        fixedValue?: number
    ) {
        switch (mode) {
            case 'PERCENTAGE_TOTAL':
                return this._applyPercentageTotal(currentPrecioUsd, currentUsdM2, percentage);
            case 'PERCENTAGE_M2':
                return this._applyPercentageM2(currentUsdM2, m2Total, percentage);
            case 'FIXED_TOTAL':
                return this._applyFixedTotal(fixedValue, m2Total);
            case 'FIXED_M2':
                return this._applyFixedM2(fixedValue, m2Total);
            default:
                return { newPrecioUsd: currentPrecioUsd, newUsdM2: currentUsdM2 };
        }
    }

    private _applyPercentageTotal(priceUsd: number, usdM2: number, pct?: number) {
        if (pct === undefined) return { newPrecioUsd: priceUsd, newUsdM2: usdM2 };
        const factor = 1 + pct / 100;
        return { newPrecioUsd: priceUsd * factor, newUsdM2: usdM2 * factor };
    }

    private _applyPercentageM2(usdM2: number, m2Total: number, pct?: number) {
        if (pct === undefined) return { newPrecioUsd: 0, newUsdM2: usdM2 }; // Price re-calculated from M2
        const newUsdM2 = usdM2 * (1 + pct / 100);
        const newPrecioUsd = m2Total > 0 ? newUsdM2 * m2Total : 0;
        return { newPrecioUsd, newUsdM2 };
    }

    private _applyFixedTotal(fixed?: number, m2Total?: number) {
        if (fixed === undefined) return { newPrecioUsd: 0, newUsdM2: 0 };
        const newPrecioUsd = fixed;
        const newUsdM2 = (m2Total && m2Total > 0) ? fixed / m2Total : 0;
        return { newPrecioUsd, newUsdM2 };
    }

    private _applyFixedM2(fixed?: number, m2Total?: number) {
        if (fixed === undefined) return { newPrecioUsd: 0, newUsdM2: 0 };
        const newUsdM2 = fixed;
        const newPrecioUsd = (m2Total && m2Total > 0) ? fixed * m2Total : 0;
        return { newPrecioUsd, newUsdM2 };
    }
}
