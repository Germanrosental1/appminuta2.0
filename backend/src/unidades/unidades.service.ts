import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { UpdateUnidadCompleteDto } from './dto/update-unidad-complete.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UnidadesHelper } from './unidades.helpers';


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
        } catch (error) {
            console.error('Error in updateComplete transaction:', error);
            throw error;
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
