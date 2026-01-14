import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { UpdateUnidadCompleteDto } from './dto/update-unidad-complete.dto';
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

        return this.prisma.$transaction(async (tx) => {
            // 1. Resolver IDs de catálogos si vienen nombres (para soportar input de texto del frontend)
            let estadoId: string | null = null;
            if (createUnidadDto.estadocomercial) {
                const estado = await tx.estadocomercial.findFirst({ where: { nombreestado: { equals: createUnidadDto.estadocomercial, mode: 'insensitive' } } });
                if (estado) estadoId = estado.id;
            }

            let comercialId: string | null = null;
            if (createUnidadDto.comercial) {
                const comercial = await tx.comerciales.findFirst({ where: { nombre: { equals: createUnidadDto.comercial, mode: 'insensitive' } } });
                if (comercial) comercialId = comercial.id;
            }

            // Resolver Tipo Unidad (Find or Create)
            let tipoId = createUnidadDto.tipounidad_id;
            if (tipoId && !tipoId.includes('-')) {
                const tipo = await tx.tiposunidad.findFirst({ where: { nombre: { equals: tipoId, mode: 'insensitive' } } });
                if (tipo) {
                    tipoId = tipo.id;
                } else {
                    // Crear si no existe
                    const newTipo = await tx.tiposunidad.create({ data: { nombre: tipoId } });
                    tipoId = newTipo.id;
                }
            }

            // Resolver Edificio (Find or Create)
            let edificioId = createUnidadDto.edificio_id;
            if (edificioId && !edificioId.includes('-')) {
                // Intentar buscar por nombre
                // Si tenemos proyecto_id, filtramos por proyecto también (idealmente)
                // Pero Buildings en esquema actual es :: id, proyecto_id, nombreedificio
                const whereClause: any = { nombreedificio: { equals: edificioId, mode: 'insensitive' } };
                if (createUnidadDto.proyecto_id) {
                    whereClause.proyecto_id = createUnidadDto.proyecto_id;
                }

                const edificio = await tx.edificios.findFirst({ where: whereClause });

                if (edificio) {
                    edificioId = edificio.id;
                } else if (createUnidadDto.proyecto_id) {
                    // Solo podemos crear si tenemos el proyecto_id
                    const newEdificio = await tx.edificios.create({
                        data: {
                            nombreedificio: edificioId,
                            proyecto_id: createUnidadDto.proyecto_id
                        }
                    });
                    edificioId = newEdificio.id;
                } else {
                    // Si no hay proyecto_id, no podemos crear, dejamos que falle o null?
                    // Dejamos el string original, fallará ID inválido, correcto.
                }
            }

            // Resolver Etapa (Find or Create)
            let etapaId = createUnidadDto.etapa_id;
            if (etapaId && !etapaId.includes('-')) {
                const etapa = await tx.etapas.findFirst({ where: { nombre: { equals: etapaId, mode: 'insensitive' } } });
                if (etapa) {
                    etapaId = etapa.id;
                } else {
                    // Crear si no existe
                    const newEtapa = await tx.etapas.create({ data: { nombre: etapaId } });
                    etapaId = newEtapa.id;
                }
            }

            // 2. Crear Unidad
            const newUnit = await tx.unidades.create({
                data: {
                    sectorid: createUnidadDto.sectorid,
                    tipounidad_id: tipoId,
                    edificio_id: edificioId,
                    etapa_id: etapaId,
                    piso: createUnidadDto.piso,
                    nrounidad: createUnidadDto.nrounidad,
                    dormitorios: createUnidadDto.dormitorios,
                    manzana: createUnidadDto.manzana,
                    destino: createUnidadDto.destino,
                    frente: createUnidadDto.frente,
                }
            });

            // 3. Crear Métricas
            await tx.unidadesmetricas.create({
                data: {
                    unidad_id: newUnit.id,
                    m2exclusivos: createUnidadDto.m2exclusivos || 0,
                    m2totales: createUnidadDto.m2totales || 0,
                    m2comunes: createUnidadDto.m2comunes || 0,
                    m2patioterraza: createUnidadDto.m2patioterraza || 0,
                    tamano: createUnidadDto.tamano || '0',
                    // default values needed
                    m2cubiertos: 0,
                    m2semicubiertos: 0,
                }
            });

            // 4. Crear Detalles Venta
            await tx.detallesventa.create({
                data: {
                    unidad_id: newUnit.id,
                    preciousd: createUnidadDto.preciousd || 0,
                    usdm2: createUnidadDto.usdm2 || 0,
                    clienteInteresado: createUnidadDto.clienteinteresado || null,
                    obs: createUnidadDto.obs,
                    fechareserva: createUnidadDto.fechareserva,
                    estado_id: estadoId,
                    comercial_id: comercialId
                }
            });

            // Devolver unidad completa
            return tx.unidades.findUnique({
                where: { id: newUnit.id },
                include: {
                    edificios: true,
                    etapas: true,
                    tiposunidad: true,
                }
            });
        });
    }

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

    async updateComplete(id: string, updateDto: UpdateUnidadCompleteDto) {
        const existing = await this.prisma.unidades.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException(`Unidad con ID '${id}' no encontrada`);

        try {
            return await this.prisma.$transaction(async (tx) => {
                // 🔒 SEGURIDAD: Logs de debug eliminados - exponen IDs internos

                // 2. Update Unidad Base
                const unidadData: any = {};
                if (updateDto.edificio_id !== undefined) unidadData.edificio_id = updateDto.edificio_id;
                if (updateDto.tipounidad_id !== undefined) unidadData.tipounidad_id = updateDto.tipounidad_id;
                if (updateDto.etapa_id !== undefined) unidadData.etapa_id = updateDto.etapa_id;
                if (updateDto.piso !== undefined) unidadData.piso = updateDto.piso;
                if (updateDto.nrounidad !== undefined) unidadData.nrounidad = updateDto.nrounidad;
                if (updateDto.dormitorios !== undefined) unidadData.dormitorios = updateDto.dormitorios;
                if (updateDto.manzana !== undefined) unidadData.manzana = updateDto.manzana;
                if (updateDto.destino !== undefined) unidadData.destino = updateDto.destino;
                if (updateDto.frente !== undefined) unidadData.frente = updateDto.frente;

                if (Object.keys(unidadData).length > 0) {
                    await tx.unidades.update({
                        where: { id },
                        data: unidadData
                    });
                }

                // 3. Upsert Metrics
                const metricsData: any = {};
                if (updateDto.m2exclusivos !== undefined) metricsData.m2exclusivos = updateDto.m2exclusivos;
                if (updateDto.m2patioterraza !== undefined) metricsData.m2patioterraza = updateDto.m2patioterraza;
                if (updateDto.tipopatio_id !== undefined) metricsData.tipopatio_id = updateDto.tipopatio_id;
                if (updateDto.m2comunes !== undefined) metricsData.m2comunes = updateDto.m2comunes;
                if (updateDto.m2calculo !== undefined) metricsData.m2calculo = updateDto.m2calculo;
                if (updateDto.m2totales !== undefined) metricsData.m2totales = updateDto.m2totales;
                if (updateDto.m2cubiertos !== undefined) metricsData.m2cubiertos = updateDto.m2cubiertos;
                if (updateDto.m2semicubiertos !== undefined) metricsData.m2semicubiertos = updateDto.m2semicubiertos;
                if (updateDto.tamano !== undefined) metricsData.tamano = updateDto.tamano;

                if (Object.keys(metricsData).length > 0) {
                    // Check existance first or use upsert
                    const existingMetrics = await tx.unidadesmetricas.findUnique({ where: { unidad_id: id } });
                    if (existingMetrics) {
                        await tx.unidadesmetricas.update({ where: { unidad_id: id }, data: metricsData });
                    } else {
                        await tx.unidadesmetricas.create({ data: { ...metricsData, unidad_id: id } });
                    }
                }

                // 4. Upsert Sales Details
                const salesData: any = {};

                // Resolver estado_id si viene como texto
                if (updateDto.estadocomercial) {
                    const estado = await tx.estadocomercial.findUnique({
                        where: { nombreestado: updateDto.estadocomercial }
                    });
                    if (estado) {
                        salesData.estado_id = estado.id;
                    } else {
                        console.warn(`Estado comercial '${updateDto.estadocomercial}' no encontrado`);
                    }
                }

                if (updateDto.estado_id !== undefined) salesData.estado_id = updateDto.estado_id;
                if (updateDto.comercial_id !== undefined) salesData.comercial_id = updateDto.comercial_id;
                if (updateDto.motivonodisp_id !== undefined) salesData.motivonodisp_id = updateDto.motivonodisp_id;
                if (updateDto.preciousd !== undefined) salesData.preciousd = updateDto.preciousd;
                if (updateDto.usdm2 !== undefined) salesData.usdm2 = updateDto.usdm2;

                if (updateDto.clienteinteresado !== undefined) {
                    if (updateDto.clienteinteresado && String(updateDto.clienteinteresado).trim() !== '') {
                        try {
                            salesData.clienteInteresado = updateDto.clienteinteresado;
                        } catch (e) {
                            console.warn(`Invalid BigInt for clienteinteresado: ${updateDto.clienteinteresado}`, e);
                            salesData.clienteInteresado = null;
                        }
                    } else {
                        salesData.clienteInteresado = null;
                    }
                }

                if (updateDto.clientetitularboleto !== undefined) salesData.clientetitularboleto = updateDto.clientetitularboleto;
                if (updateDto.obs !== undefined) salesData.obs = updateDto.obs;

                // Helper to parse dates
                const parseDate = (dateStr?: string) => {
                    if (!dateStr) return null;
                    const date = new Date(dateStr);
                    return isNaN(date.getTime()) ? null : date;
                };

                if (updateDto.fechareserva !== undefined) salesData.fechareserva = parseDate(updateDto.fechareserva);
                if (updateDto.fechafirmaboleto !== undefined) salesData.fechafirmaboleto = parseDate(updateDto.fechafirmaboleto);
                if (updateDto.fechaposesion !== undefined) salesData.fechaposesion = parseDate(updateDto.fechaposesion);

                if (updateDto.tipocochera_id !== undefined) salesData.tipocochera_id = updateDto.tipocochera_id;
                if (updateDto.unidadcomprador_id !== undefined) salesData.unidadcomprador_id = updateDto.unidadcomprador_id;

                if (Object.keys(salesData).length > 0) {
                    const existingSales = await tx.detallesventa.findUnique({ where: { unidad_id: id } });
                    if (existingSales) {
                        await tx.detallesventa.update({ where: { unidad_id: id }, data: salesData });
                    } else {
                        await tx.detallesventa.create({ data: { ...salesData, unidad_id: id } });
                    }
                }

                // Return complete updated unit
                return await tx.unidades.findUnique({
                    where: { id },
                    include: {
                        edificios: { include: { proyectos: true } },
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
            }, {
                timeout: 10000 // Increase timeout just in case
            });
        } catch (error) {
            console.error('Error in updateComplete transaction:', error);
            throw error; // Re-throw to let global filter handle it, but now we have logs
        }
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
