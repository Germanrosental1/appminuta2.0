import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { UpdateUnidadCompleteDto } from './dto/update-unidad-complete.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UnidadesHelper } from './unidades.helpers';
import { LoggerService } from '../logger/logger.service';

/** User info for logging */
export interface UserInfo {
    sub: string;
    email: string;
}

@Injectable()
export class UnidadesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: LoggerService
    ) { }

    async create(createUnidadDto: CreateUnidadDto, user?: UserInfo) {
        // Verificar que el sectorid no exista
        const existing = await this.prisma.unidades.findUnique({
            where: { sectorid: createUnidadDto.sectorid },
        });

        if (existing) {
            throw new ConflictException(
                `Ya existe una unidad con sectorid '${createUnidadDto.sectorid}'`
            );
        }

        const result = await this.prisma.$transaction(async (tx) => {
            // 1. Resolver IDs de catálogos
            const estadoId = await UnidadesHelper.resolveEstadoId(tx, createUnidadDto.estadocomercial);
            const comercialId = await UnidadesHelper.resolveComercialId(tx, createUnidadDto.comercial);
            const tipoId = await UnidadesHelper.resolveTipoUnidadId(tx, createUnidadDto.tipounidad_id);
            const edificioId = await UnidadesHelper.resolveEdificioId(tx, createUnidadDto.edificio_id, createUnidadDto.proyecto_id);
            const etapaId = await UnidadesHelper.resolveEtapaId(tx, createUnidadDto.etapa_id);

            // 2. Crear Unidad
            const newUnit = await UnidadesHelper.createUnidadEntity(tx, createUnidadDto, {
                tipoId,
                edificioId,
                etapaId,
            });

            // 3. Crear Métricas
            await UnidadesHelper.createMetrics(tx, newUnit.id, createUnidadDto);

            // 4. Crear Detalles Venta
            await UnidadesHelper.createSalesDetails(tx, newUnit.id, createUnidadDto, {
                estadoId,
                comercialId,
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

        // Log #13: Creación de unidad
        await this.logger.agregarLog({
            motivo: 'Creación de unidad',
            descripcion: `Unidad creada: ${createUnidadDto.sectorid}`,
            impacto: 'Alto',
            tablaafectada: 'unidades',
            usuarioID: user?.sub,
            usuarioemail: user?.email
        });

        return result;
    }

    async update(id: string, updateUnidadDto: UpdateUnidadDto, user?: UserInfo) {
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

        const result = await this.prisma.unidades.update({
            where: { id },
            data: updateUnidadDto,
            include: {
                edificios: true,
                etapas: true,
                tiposunidad: true,
            },
        });

        // Log #15: Edición de datos de unidad
        await this.logger.agregarLog({
            motivo: 'Edición de unidad',
            descripcion: `Unidad editada: ${existing.sectorid}. Campos: ${Object.keys(updateUnidadDto).join(', ')}`,
            impacto: 'Alto',
            tablaafectada: 'unidades',
            usuarioID: user?.sub,
            usuarioemail: user?.email
        });

        return result;
    }

    async updateComplete(id: string, updateDto: UpdateUnidadCompleteDto, user?: UserInfo) {
        const existing = await this.prisma.unidades.findUnique({
            where: { id },
            include: {
                detallesventa_detallesventa_unidad_idTounidades: {
                    include: { estadocomercial: true }
                }
            }
        });
        if (!existing) throw new NotFoundException(`Unidad con ID '${id}' no encontrada`);

        // Capturar valores anteriores para logs
        const oldSalesDetails = existing.detallesventa_detallesventa_unidad_idTounidades;
        const oldPrecio = oldSalesDetails?.preciousd;
        const oldUsdM2 = oldSalesDetails?.usdm2;
        const oldEstadoId = oldSalesDetails?.estado_id;
        const oldEstadoNombre = oldSalesDetails?.estadocomercial?.nombreestado;

        try {
            const result = await this.prisma.$transaction(async (tx) => {
                // 1. Update Unidad Base
                await UnidadesHelper.prepareUnidadUpdateData(tx, id, updateDto);

                // 2. Upsert Metrics
                await UnidadesHelper.handleMetricsUpdate(tx, id, updateDto);

                // 3. Upsert Sales Details
                await UnidadesHelper.handleSalesDetailsUpdate(tx, id, updateDto);

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

            // Log #11: Edición de precio individual
            const newPrecio = updateDto.preciousd;
            const newUsdM2 = updateDto.usdm2;
            if ((newPrecio !== undefined && Number(newPrecio) !== Number(oldPrecio)) ||
                (newUsdM2 !== undefined && Number(newUsdM2) !== Number(oldUsdM2))) {
                await this.logger.agregarLog({
                    motivo: 'Edición de precio de unidad',
                    descripcion: `Unidad ${existing.sectorid}: Precio USD ${oldPrecio ?? 'N/A'} → ${newPrecio ?? oldPrecio}, USD/m² ${oldUsdM2 ?? 'N/A'} → ${newUsdM2 ?? oldUsdM2}`,
                    impacto: 'Medio',
                    tablaafectada: 'detallesventa',
                    usuarioID: user?.sub,
                    usuarioemail: user?.email
                });
            }

            // Log #12: Cambio de estado comercial
            const newEstadoId = updateDto.estado_id;
            if (newEstadoId !== undefined && newEstadoId !== oldEstadoId) {
                // Obtener nombre del nuevo estado
                const newEstado = await this.prisma.estadocomercial.findUnique({ where: { id: newEstadoId } });
                await this.logger.agregarLog({
                    motivo: 'Cambio de estado comercial',
                    descripcion: `Unidad ${existing.sectorid}: Estado "${oldEstadoNombre ?? 'N/A'}" → "${newEstado?.nombreestado ?? 'N/A'}"`,
                    impacto: 'Medio',
                    tablaafectada: 'detallesventa',
                    usuarioID: user?.sub,
                    usuarioemail: user?.email
                });
            }

            // Log #15: Edición general de datos (si hay otros campos modificados)
            const otherFields = Object.keys(updateDto).filter(k =>
                !['preciousd', 'usdm2', 'estado_id'].includes(k)
            );
            if (otherFields.length > 0) {
                await this.logger.agregarLog({
                    motivo: 'Edición de unidad',
                    descripcion: `Unidad ${existing.sectorid}: Campos modificados: ${otherFields.join(', ')}`,
                    impacto: 'Alto',
                    tablaafectada: 'unidades',
                    usuarioID: user?.sub,
                    usuarioemail: user?.email
                });
            }

            return result;
        } catch (error) {
            console.error('Error in updateComplete transaction:', error);
            throw error;
        }
    }

    async remove(id: string, user?: UserInfo) {
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

        const result = await this.prisma.unidades.delete({
            where: { id },
        });

        // Log #14: Eliminación de unidad
        await this.logger.agregarLog({
            motivo: 'Eliminación de unidad',
            descripcion: `Unidad eliminada: ${existing.sectorid}`,
            impacto: 'Alto',
            tablaafectada: 'unidades',
            usuarioID: user?.sub,
            usuarioemail: user?.email
        });

        return result;
    }

    /**
     * Ajusta los precios de todas las unidades de los proyectos especificados
     * @param projectIds - IDs de los proyectos a ajustar
     * @param mode - Modo de ajuste (PERCENTAGE_TOTAL, PERCENTAGE_M2, FIXED_TOTAL, FIXED_M2)
     * @param percentage - Porcentaje (para modos PERCENTAGE_*)
     * @param fixedValue - Valor fijo (para modos FIXED_*)
     * @param user - Usuario que realiza la operación (para logging)
     */
    async adjustPricesByProjects(
        projectIds: string[],
        mode: string,
        percentage?: number,
        fixedValue?: number,
        user?: UserInfo
    ) {
        // Obtener todos los edificios de los proyectos
        const edificios = await this.prisma.edificios.findMany({
            where: { proyecto_id: { in: projectIds } },
            select: { id: true }
        });

        const edificioIds = edificios.map(e => e.id);

        // Obtener todas las unidades de esos edificios
        const unidades = await this.prisma.unidades.findMany({
            where: { edificio_id: { in: edificioIds } },
            select: { id: true }
        });

        const unidadIds = unidades.map(u => u.id);

        if (unidadIds.length === 0) {
            return {
                success: true,
                unidadesAjustadas: 0,
                message: 'No se encontraron unidades en los proyectos seleccionados'
            };
        }

        let result: number;

        switch (mode) {
            case 'PERCENTAGE_TOTAL': {
                // Aumentar precio total y m2 por el mismo porcentaje
                const multiplier = 1 + ((percentage || 0) / 100);
                result = await this.prisma.$executeRaw`
                    UPDATE detallesventa 
                    SET preciousd = ROUND(preciousd * ${multiplier}::numeric, 2),
                        usdm2 = CASE 
                            WHEN usdm2 IS NOT NULL THEN ROUND(usdm2 * ${multiplier}::numeric, 2)
                            ELSE NULL 
                        END
                    WHERE unidad_id = ANY(${unidadIds}::uuid[])
                    AND preciousd IS NOT NULL
                `;
                break;
            }

            case 'PERCENTAGE_M2': {
                // Aumentar solo USD/m2 por porcentaje, recalcular precio total
                const multiplier = 1 + ((percentage || 0) / 100);
                result = await this.prisma.$executeRaw`
                    UPDATE detallesventa dv
                    SET usdm2 = ROUND(dv.usdm2 * ${multiplier}::numeric, 2),
                        preciousd = ROUND(
                            dv.usdm2 * ${multiplier}::numeric * 
                            COALESCE(um.m2totales, um.m2cubiertos, 1), 
                            2
                        )
                    FROM unidadesmetricas um
                    WHERE dv.unidad_id = um.unidad_id
                    AND dv.unidad_id = ANY(${unidadIds}::uuid[])
                    AND dv.usdm2 IS NOT NULL
                `;
                break;
            }

            case 'FIXED_TOTAL': {
                // Establecer precio total fijo, recalcular USD/m2
                const fixed = fixedValue || 0;
                result = await this.prisma.$executeRaw`
                    UPDATE detallesventa dv
                    SET preciousd = ${fixed}::numeric,
                        usdm2 = CASE 
                            WHEN COALESCE(um.m2totales, um.m2cubiertos, 0) > 0 
                            THEN ROUND(${fixed}::numeric / COALESCE(um.m2totales, um.m2cubiertos), 2)
                            ELSE dv.usdm2
                        END
                    FROM unidadesmetricas um
                    WHERE dv.unidad_id = um.unidad_id
                    AND dv.unidad_id = ANY(${unidadIds}::uuid[])
                `;
                break;
            }

            case 'FIXED_M2': {
                // Establecer USD/m2 fijo, recalcular precio total
                const fixed = fixedValue || 0;
                result = await this.prisma.$executeRaw`
                    UPDATE detallesventa dv
                    SET usdm2 = ${fixed}::numeric,
                        preciousd = ROUND(
                            ${fixed}::numeric * COALESCE(um.m2totales, um.m2cubiertos, 1),
                            2
                        )
                    FROM unidadesmetricas um
                    WHERE dv.unidad_id = um.unidad_id
                    AND dv.unidad_id = ANY(${unidadIds}::uuid[])
                `;
                break;
            }

            default:
                throw new Error(`Modo de ajuste desconocido: ${mode}`);
        }

        // Log #10: Ajuste masivo de precios
        const modeDesc = mode.includes('PERCENTAGE')
            ? `${percentage}%`
            : `USD ${fixedValue}`;
        await this.logger.agregarLog({
            motivo: 'Ajuste masivo de precios',
            descripcion: `Modo: ${mode}, Ajuste: ${modeDesc}. ${result} unidades ajustadas en ${projectIds.length} proyecto(s)`,
            impacto: 'Medio',
            tablaafectada: 'detallesventa',
            usuarioID: user?.sub,
            usuarioemail: user?.email
        });

        return {
            success: true,
            unidadesAjustadas: result,
            modo: mode,
            porcentajeAplicado: percentage,
            valorFijo: fixedValue,
            proyectosAfectados: projectIds.length
        };
    }
}
