import { Prisma } from '@prisma/client';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadCompleteDto } from './dto/update-unidad-complete.dto';

export class UnidadesHelper {

    // --- Create Helpers ---

    static async resolveEstadoId(tx: Prisma.TransactionClient, nombre?: string): Promise<string | null> {
        if (!nombre) return null;
        const estado = await tx.estadocomercial.findFirst({ where: { nombreestado: { equals: nombre, mode: 'insensitive' } } });
        return estado ? estado.id : null;
    }

    static async resolveComercialId(tx: Prisma.TransactionClient, nombre?: string): Promise<string | null> {
        if (!nombre) return null;
        const comercial = await tx.comerciales.findFirst({ where: { nombre: { equals: nombre, mode: 'insensitive' } } });
        return comercial ? comercial.id : null;
    }

    static async resolveTipoUnidadId(tx: Prisma.TransactionClient, tipoId?: string): Promise<string | null> {
        if (!tipoId || tipoId.includes('-')) return tipoId || null;

        const tipo = await tx.tiposunidad.findFirst({ where: { nombre: { equals: tipoId, mode: 'insensitive' } } });
        if (tipo) return tipo.id;

        const newTipo = await tx.tiposunidad.create({ data: { nombre: tipoId } });
        return newTipo.id;
    }

    static async resolveEdificioId(tx: Prisma.TransactionClient, edificioId?: string, proyectoId?: string): Promise<string | null> {
        if (!edificioId || edificioId.includes('-')) return edificioId || null;

        const whereClause: any = { nombreedificio: { equals: edificioId, mode: 'insensitive' } };
        if (proyectoId) {
            whereClause.proyecto_id = proyectoId;
        }

        const edificio = await tx.edificios.findFirst({ where: whereClause });
        if (edificio) return edificio.id;

        if (proyectoId) {
            const newEdificio = await tx.edificios.create({
                data: {
                    nombreedificio: edificioId,
                    proyecto_id: proyectoId
                }
            });
            return newEdificio.id;
        }

        return null;
    }

    static async resolveEtapaId(tx: Prisma.TransactionClient, etapaId?: string): Promise<string | null> {
        if (!etapaId || etapaId.includes('-')) return etapaId || null;

        const etapa = await tx.etapas.findFirst({ where: { nombre: { equals: etapaId, mode: 'insensitive' } } });
        if (etapa) return etapa.id;

        const newEtapa = await tx.etapas.create({ data: { nombre: etapaId } });
        return newEtapa.id;
    }

    static async createUnidadEntity(
        tx: Prisma.TransactionClient,
        dto: CreateUnidadDto,
        ids: { tipoId: string | null, edificioId: string | null, etapaId: string | null }
    ) {
        return tx.unidades.create({
            data: {
                sectorid: dto.sectorid,
                tipounidad_id: ids.tipoId,
                edificio_id: ids.edificioId,
                etapa_id: ids.etapaId,
                piso: dto.piso,
                nrounidad: dto.nrounidad,
                dormitorios: dto.dormitorios,
                manzana: dto.manzana,
                destino: dto.destino,
                frente: dto.frente,
            }
        });
    }

    static async createMetrics(tx: Prisma.TransactionClient, unidadId: string, dto: CreateUnidadDto) {
        await tx.unidadesmetricas.create({
            data: {
                unidad_id: unidadId,
                m2exclusivos: dto.m2exclusivos || 0,
                m2totales: dto.m2totales || 0,
                m2comunes: dto.m2comunes || 0,
                m2patioterraza: dto.m2patioterraza || 0,
                tamano: dto.tamano || '0',
                m2cubiertos: 0,
                m2semicubiertos: 0,
            }
        });
    }

    static async createSalesDetails(
        tx: Prisma.TransactionClient,
        unidadId: string,
        dto: CreateUnidadDto,
        ids: { estadoId: string | null, comercialId: string | null }
    ) {
        await tx.detallesventa.create({
            data: {
                unidad_id: unidadId,
                preciousd: dto.preciousd || 0,
                usdm2: dto.usdm2 || 0,
                clienteInteresado: dto.clienteinteresado || null,
                obs: dto.obs,
                fechareserva: dto.fechareserva,
                estado_id: ids.estadoId,
                comercial_id: ids.comercialId
            }
        });
    }

    // --- Update Helpers ---

    static async prepareUnidadUpdateData(tx: Prisma.TransactionClient, id: string, updateDto: UpdateUnidadCompleteDto) {
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
    }

    static async handleMetricsUpdate(tx: Prisma.TransactionClient, id: string, updateDto: UpdateUnidadCompleteDto) {
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
            const existingMetrics = await tx.unidadesmetricas.findUnique({ where: { unidad_id: id } });
            if (existingMetrics) {
                await tx.unidadesmetricas.update({ where: { unidad_id: id }, data: metricsData });
            } else {
                await tx.unidadesmetricas.create({ data: { ...metricsData, unidad_id: id } });
            }
        }
    }

    static async handleSalesDetailsUpdate(tx: Prisma.TransactionClient, id: string, updateDto: UpdateUnidadCompleteDto) {
        const salesData: any = {};

        // Resolver estado_id
        if (updateDto.estadocomercial) {
            const estadoId = await this.resolveEstadoId(tx, updateDto.estadocomercial);
            if (estadoId) {
                salesData.estado_id = estadoId;
            } else {
                console.warn(`Estado comercial '${updateDto.estadocomercial}' no encontrado`);
            }
        }

        this.mapSalesFields(updateDto, salesData);
        this.mapDateFields(updateDto, salesData);

        if (Object.keys(salesData).length > 0) {
            const existingSales = await tx.detallesventa.findUnique({ where: { unidad_id: id } });
            if (existingSales) {
                await tx.detallesventa.update({ where: { unidad_id: id }, data: salesData });
            } else {
                await tx.detallesventa.create({ data: { ...salesData, unidad_id: id } });
            }
        }
    }

    private static mapSalesFields(updateDto: UpdateUnidadCompleteDto, salesData: any) {
        if (updateDto.estado_id !== undefined) salesData.estado_id = updateDto.estado_id;
        if (updateDto.comercial_id !== undefined) salesData.comercial_id = updateDto.comercial_id;
        if (updateDto.motivonodisp_id !== undefined) salesData.motivonodisp_id = updateDto.motivonodisp_id;
        if (updateDto.preciousd !== undefined) salesData.preciousd = updateDto.preciousd;
        if (updateDto.usdm2 !== undefined) salesData.usdm2 = updateDto.usdm2;
        if (updateDto.clientetitularboleto !== undefined) salesData.clientetitularboleto = updateDto.clientetitularboleto;
        if (updateDto.obs !== undefined) salesData.obs = updateDto.obs;
        if (updateDto.tipocochera_id !== undefined) salesData.tipocochera_id = updateDto.tipocochera_id;
        if (updateDto.unidadcomprador_id !== undefined) salesData.unidadcomprador_id = updateDto.unidadcomprador_id;

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
        if (updateDto.fechareserva !== undefined) salesData.fechareserva = this.parseDate(updateDto.fechareserva);
        if (updateDto.fechafirmaboleto !== undefined) salesData.fechafirmaboleto = this.parseDate(updateDto.fechafirmaboleto);
        if (updateDto.fechaposesion !== undefined) salesData.fechaposesion = this.parseDate(updateDto.fechaposesion);
    }

    private static parseDate(dateStr?: string): Date | null {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return Number.isNaN(date.getTime()) ? null : date;
    }
}
