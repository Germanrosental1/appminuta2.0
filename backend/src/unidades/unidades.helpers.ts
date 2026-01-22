import { Prisma } from '@prisma/client';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadCompleteDto } from './dto/update-unidad-complete.dto';

export class UnidadesHelper {

    // --- Create Helpers ---

    static async resolveEstadoId(tx: Prisma.TransactionClient, nombre?: string): Promise<string | null> {
        if (!nombre) return null;
        const estado = await tx.estadoComercial.findFirst({ where: { NombreEstado: { equals: nombre, mode: 'insensitive' } } });
        return estado ? estado.Id : null;
    }

    static async resolveComercialId(tx: Prisma.TransactionClient, nombre?: string): Promise<string | null> {
        if (!nombre) return null;
        const comercial = await tx.comerciales.findFirst({ where: { Nombre: { equals: nombre, mode: 'insensitive' } } });
        return comercial ? comercial.Id : null;
    }

    static async resolveTipoUnidadId(tx: Prisma.TransactionClient, tipoId?: string): Promise<string | null> {
        if (!tipoId || tipoId.includes('-')) return tipoId || null;

        const tipo = await tx.tiposUnidad.findFirst({ where: { Nombre: { equals: tipoId, mode: 'insensitive' } } });
        if (tipo) return tipo.Id;

        const newTipo = await tx.tiposUnidad.create({ data: { Nombre: tipoId } });
        return newTipo.Id;
    }

    static async resolveEdificioId(tx: Prisma.TransactionClient, edificioId?: string, proyectoId?: string): Promise<string | null> {
        if (!edificioId || edificioId.includes('-')) return edificioId || null;

        const whereClause: any = { NombreEdificio: { equals: edificioId, mode: 'insensitive' } };
        if (proyectoId) {
            whereClause.ProyectoId = proyectoId;
        }

        const edificio = await tx.edificios.findFirst({ where: whereClause });
        if (edificio) return edificio.Id;

        if (proyectoId) {
            const newEdificio = await tx.edificios.create({
                data: {
                    NombreEdificio: edificioId,
                    ProyectoId: proyectoId
                }
            });
            return newEdificio.Id;
        }

        return null;
    }

    static async resolveEtapaId(tx: Prisma.TransactionClient, etapaId?: string): Promise<string | null> {
        if (!etapaId || etapaId.includes('-')) return etapaId || null;

        const etapa = await tx.etapas.findFirst({ where: { Nombre: { equals: etapaId, mode: 'insensitive' } } });
        if (etapa) return etapa.Id;

        const newEtapa = await tx.etapas.create({ data: { Nombre: etapaId } });
        return newEtapa.Id;
    }

    static async createUnidadEntity(
        tx: Prisma.TransactionClient,
        dto: CreateUnidadDto,
        ids: { tipoId: string | null, edificioId: string | null, etapaId: string | null }
    ) {
        return tx.unidades.create({
            data: {
                SectorId: dto.sectorid,
                TipoUnidadId: ids.tipoId,
                EdificioId: ids.edificioId,
                EtapaId: ids.etapaId,
                Piso: dto.piso,
                NroUnidad: dto.nrounidad,
                Dormitorio: dto.dormitorios,
                Manzana: dto.manzana,
                Destino: dto.destino,
                Frente: dto.frente,
            }
        });
    }

    static async createMetrics(tx: Prisma.TransactionClient, unidadId: string, dto: CreateUnidadDto) {
        await tx.unidadesMetricas.create({
            data: {
                UnidadId: unidadId,
                M2Exclusivo: dto.m2exclusivos || 0,
                M2Total: dto.m2totales || 0,
                M2Comun: dto.m2comunes || 0,
                M2PatioTerraza: dto.m2patioterraza || 0,
                Tamano: dto.tamano || '0',
                M2Cubierto: 0,
                M2Semicubierto: 0,
            }
        });
    }

    static async createSalesDetails(
        tx: Prisma.TransactionClient,
        unidadId: string,
        dto: CreateUnidadDto,
        ids: { estadoId: string | null, comercialId: string | null }
    ) {
        await tx.detallesVenta.create({
            data: {
                UnidadId: unidadId,
                PrecioUsd: dto.preciousd || 0,
                UsdM2: dto.usdm2 || 0,
                ClienteInteresado: dto.clienteinteresado || null,
                Obs: dto.obs,
                FechaReserva: dto.fechareserva,
                EstadoId: ids.estadoId,
                ComercialId: ids.comercialId
            }
        });
    }

    // --- Update Helpers ---

    static async prepareUnidadUpdateData(tx: Prisma.TransactionClient, id: string, updateDto: UpdateUnidadCompleteDto) {
        const unidadData: any = {};
        if (updateDto.edificio_id !== undefined) unidadData.EdificioId = updateDto.edificio_id;
        if (updateDto.tipounidad_id !== undefined) unidadData.TipoUnidadId = updateDto.tipounidad_id;
        if (updateDto.etapa_id !== undefined) unidadData.EtapaId = updateDto.etapa_id;
        if (updateDto.piso !== undefined) unidadData.Piso = updateDto.piso;
        if (updateDto.nrounidad !== undefined) unidadData.NroUnidad = updateDto.nrounidad;
        if (updateDto.dormitorios !== undefined) unidadData.Dormitorio = updateDto.dormitorios;
        if (updateDto.manzana !== undefined) unidadData.Manzana = updateDto.manzana;
        if (updateDto.destino !== undefined) unidadData.Destino = updateDto.destino;
        if (updateDto.frente !== undefined) unidadData.Frente = updateDto.frente;

        if (Object.keys(unidadData).length > 0) {
            await tx.unidades.update({
                where: { Id: id },
                data: unidadData
            });
        }
    }

    static async handleMetricsUpdate(tx: Prisma.TransactionClient, id: string, updateDto: UpdateUnidadCompleteDto) {
        const metricsData: any = {};
        if (updateDto.m2exclusivos !== undefined) metricsData.M2Exclusivo = updateDto.m2exclusivos;
        if (updateDto.m2patioterraza !== undefined) metricsData.M2PatioTerraza = updateDto.m2patioterraza;
        if (updateDto.tipopatio_id !== undefined) metricsData.TipoPatioId = updateDto.tipopatio_id;
        if (updateDto.m2comunes !== undefined) metricsData.M2Comun = updateDto.m2comunes;
        if (updateDto.m2calculo !== undefined) metricsData.M2Calculo = updateDto.m2calculo;
        if (updateDto.m2totales !== undefined) metricsData.M2Total = updateDto.m2totales;
        if (updateDto.m2cubiertos !== undefined) metricsData.M2Cubierto = updateDto.m2cubiertos;
        if (updateDto.m2semicubiertos !== undefined) metricsData.M2Semicubierto = updateDto.m2semicubiertos;
        if (updateDto.tamano !== undefined) metricsData.Tamano = updateDto.tamano;

        if (Object.keys(metricsData).length > 0) {
            const existingMetrics = await tx.unidadesMetricas.findUnique({ where: { UnidadId: id } });
            if (existingMetrics) {
                await tx.unidadesMetricas.update({ where: { UnidadId: id }, data: metricsData });
            } else {
                await tx.unidadesMetricas.create({ data: { ...metricsData, UnidadId: id } });
            }
        }
    }

    static async handleSalesDetailsUpdate(tx: Prisma.TransactionClient, id: string, updateDto: UpdateUnidadCompleteDto) {
        const salesData: any = {};

        // Resolver estado_id
        if (updateDto.estadocomercial) {
            const estadoId = await this.resolveEstadoId(tx, updateDto.estadocomercial);
            if (estadoId) {
                salesData.EstadoId = estadoId;
            } else {
                console.warn(`Estado comercial '${updateDto.estadocomercial}' no encontrado`);
            }
        }

        this.mapSalesFields(updateDto, salesData);
        this.mapDateFields(updateDto, salesData);

        if (Object.keys(salesData).length > 0) {
            const existingSales = await tx.detallesVenta.findUnique({ where: { UnidadId: id } });
            if (existingSales) {
                await tx.detallesVenta.update({ where: { UnidadId: id }, data: salesData });
            } else {
                await tx.detallesVenta.create({ data: { ...salesData, UnidadId: id } });
            }
        }
    }

    private static mapSalesFields(updateDto: UpdateUnidadCompleteDto, salesData: any) {
        if (updateDto.estado_id !== undefined) salesData.EstadoId = updateDto.estado_id;
        if (updateDto.comercial_id !== undefined) salesData.ComercialId = updateDto.comercial_id;
        if (updateDto.motivonodisp_id !== undefined) salesData.MotivoNoDispId = updateDto.motivonodisp_id;
        if (updateDto.preciousd !== undefined) salesData.PrecioUsd = updateDto.preciousd;
        if (updateDto.usdm2 !== undefined) salesData.UsdM2 = updateDto.usdm2;
        if (updateDto.clientetitularboleto !== undefined) salesData.ClienteTitularBoleto = updateDto.clientetitularboleto;
        if (updateDto.obs !== undefined) salesData.Obs = updateDto.obs;
        if (updateDto.tipocochera_id !== undefined) salesData.TipoCocheraId = updateDto.tipocochera_id;
        if (updateDto.unidadcomprador_id !== undefined) salesData.UnidadCompradorId = updateDto.unidadcomprador_id;

        if (updateDto.clienteinteresado !== undefined) {
            this.mapClienteInteresado(updateDto.clienteinteresado, salesData);
        }
    }

    private static mapClienteInteresado(clienteInteresado: any, salesData: any) {
        if (clienteInteresado && String(clienteInteresado).trim() !== '') {
            try {
                salesData.clienteInteresado = clienteInteresado;
            } catch (e) {
                console.warn(`Invalid BigInt for clienteinteresado: ${clienteInteresado}`, e);
                salesData.clienteInteresado = null;
            }
        } else {
            salesData.clienteInteresado = null;
        }
    }

    private static mapDateFields(updateDto: UpdateUnidadCompleteDto, salesData: any) {
        if (updateDto.fechareserva !== undefined) salesData.FechaReserva = this.parseDate(updateDto.fechareserva);
        if (updateDto.fechafirmaboleto !== undefined) salesData.FechaFirmaBoleto = this.parseDate(updateDto.fechafirmaboleto);
        if (updateDto.fechaposesion !== undefined) salesData.FechaPosesion = this.parseDate(updateDto.fechaposesion);
    }

    private static parseDate(dateStr?: string): Date | null {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return Number.isNaN(date.getTime()) ? null : date;
    }
}
