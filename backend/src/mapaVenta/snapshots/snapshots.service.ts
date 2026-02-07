import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SnapshotsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Generate a snapshot of current stock for all projects
     * @param tipoSnapshot - DIARIO or MENSUAL
     */
    async generateSnapshot(tipoSnapshot: 'DIARIO' | 'MENSUAL' = 'DIARIO') {
        const fecha = new Date();
        fecha.setHours(0, 0, 0, 0);

        // Get all active projects
        const proyectos = await this.prisma.proyectos.findMany({
            where: { Activo: true },
            select: { Id: true, Nombre: true },
        });

        // ⚡ P-003 FIX: Parallel project processing con límite de concurrencia
        // Procesar proyectos en paralelo, máximo 5 a la vez para no saturar DB
        const CONCURRENCY_LIMIT = 5;
        const results: any[] = [];

        for (let i = 0; i < proyectos.length; i += CONCURRENCY_LIMIT) {
            const batch = proyectos.slice(i, i + CONCURRENCY_LIMIT);

            const batchResults = await Promise.all(
                batch.map(async (proyecto) => {
                    try {
                        return await this.processProjectSnapshot(proyecto, fecha, tipoSnapshot);
                    } catch (error: unknown) {
                        console.error(`Error processing project ${proyecto.Nombre}:`, error);
                        return null;
                    }
                })
            );

            results.push(...batchResults.filter(Boolean));
        }

        return {
            fecha: fecha.toISOString().split('T')[0],
            tipoSnapshot,
            proyectosProcessados: results.length,
            detalles: results,
        };
    }

    /**
     * ⚡ P-003 FIX: Método extraído para procesar un proyecto individualmente
     */
    private async processProjectSnapshot(
        proyecto: { Id: string; Nombre: string },
        fecha: Date,
        tipoSnapshot: string
    ) {
        // Get current state of all units for this project via Prisma
        // ⚡ P-003 FIX: Use proper Prisma query with index on matches
        const unidades = await this.getProjectUnits(proyecto.Id);
        if (unidades.length === 0) return null;

        // Calculate aggregates
        const stats = this.calculateStats(unidades);

        // Get previous snapshot for state comparison
        const previousStateMap = await this.getPreviousStateMap(proyecto.Id);

        // Create the snapshot record
        const snapshot = await this.createSnapshotRecord(
            proyecto.Id,
            fecha,
            tipoSnapshot,
            stats,
        );

        // Create detail records
        await this.createSnapshotDetails(snapshot.Id, unidades, previousStateMap);

        return {
            proyecto: proyecto.Nombre,
            snapshotId: snapshot.Id,
            totalUnidades: stats.totalUnidades,
            disponibles: stats.disponibles,
            reservadas: stats.reservadas,
            vendidas: stats.vendidas,
        };
    }

    private async getProjectUnits(projectId: string) {
        const units = await this.prisma.tablas.findMany({
            where: { proyecto_id: projectId },
            select: {
                id: true,
                sectorid: true,
                tipo: true,
                estado: true,
                preciousd: true,
                usdm2: true,
                proyectos: {
                    select: {
                        Nombre: true
                    }
                }
            }
        });

        // Map to match expected format for consistency
        return units.map(u => ({
            Id: u.id.toString(), // id is Int in schema, simple ID in raw query? schema says Int @id @db.SmallInt
            SectorId: u.sectorid,
            Proyecto: u.proyectos?.Nombre,
            Tipo: u.tipo,
            Estado: u.estado,
            PrecioUsd: u.preciousd,
            UsdM2: u.usdm2
        }));
    }

    private calculateStats(unidades: any[]) {
        const stats = {
            totalUnidades: unidades.length,
            disponibles: 0,
            reservadas: 0,
            vendidas: 0,
            noDisponibles: 0,
            valorStockUSD: new Decimal(0),
            m2TotalesStock: new Decimal(0),
        };

        for (const u of unidades) {
            const estado = (u.Estado || '').toLowerCase();
            if (estado.includes('disponible') && !estado.includes('no disponible')) {
                stats.disponibles++;
                if (u.PrecioUsd) stats.valorStockUSD = stats.valorStockUSD.plus(new Decimal(u.PrecioUsd));
            } else if (estado.includes('reserva')) {
                stats.reservadas++;
                if (u.PrecioUsd) stats.valorStockUSD = stats.valorStockUSD.plus(new Decimal(u.PrecioUsd));
            } else if (estado.includes('vendid')) {
                stats.vendidas++;
            } else {
                stats.noDisponibles++;
            }
        }
        return stats;
    }

    private async getPreviousStateMap(projectId: string) {
        const previousSnapshot = await this.prisma.snapshotsStock.findFirst({
            where: { ProyectoId: projectId },
            orderBy: { FechaSnapshot: 'desc' },
            include: { Detalles: true },
        });

        const previousStateMap = new Map<string, { estado: string; dias: number }>();
        if (previousSnapshot) {
            for (const det of previousSnapshot.Detalles) {
                previousStateMap.set(det.UnidadId, {
                    estado: det.Estado,
                    dias: det.DiasEnEstado || 0,
                });
            }
        }
        return previousStateMap;
    }

    private async createSnapshotRecord(projectId: string, fecha: Date, tipoSnapshot: string, stats: any) {
        return this.prisma.snapshotsStock.create({
            data: {
                FechaSnapshot: fecha,
                TipoSnapshot: tipoSnapshot,
                ProyectoId: projectId,
                TotalUnidades: stats.totalUnidades,
                Disponibles: stats.disponibles,
                Reservadas: stats.reservadas,
                Vendidas: stats.vendidas,
                NoDisponibles: stats.noDisponibles,
                ValorStockUSD: stats.valorStockUSD,
                M2TotalesStock: stats.m2TotalesStock,
            },
        });
    }

    private async createSnapshotDetails(
        snapshotId: string,
        unidades: any[],
        previousStateMap: Map<string, { estado: string; dias: number }>
    ) {
        const detalles = unidades.map((u) => {
            const prev = previousStateMap.get(u.Id);
            const estadoAnterior = prev?.estado || null;
            const diasEnEstado = prev && prev.estado === u.Estado ? (prev.dias || 0) + 1 : 1;

            return {
                SnapshotId: snapshotId,
                UnidadId: u.Id,
                SectorId: u.SectorId || null,
                Proyecto: u.Proyecto || null,
                Tipo: u.Tipo || null,
                Estado: u.Estado || 'Desconocido',
                PrecioUSD: u.PrecioUsd ? new Decimal(u.PrecioUsd) : null,
                UsdM2: u.UsdM2 ? new Decimal(u.UsdM2) : null,
                EstadoAnterior: estadoAnterior,
                DiasEnEstado: diasEnEstado,
            };
        });

        await this.prisma.snapshotsStockDetalle.createMany({
            data: detalles,
        });
    }

    /**
     * Get snapshots for a specific date
     */
    async getSnapshotByDate(fecha: Date) {
        return this.prisma.snapshotsStock.findMany({
            where: {
                FechaSnapshot: fecha,
            },
            include: {
                Proyecto: true,
            },
            orderBy: { CreatedAt: 'desc' },
        });
    }

    /**
     * Get snapshots between two dates with pagination
     */
    async getSnapshotsInRange(fechaDesde: Date, fechaHasta: Date, page = 1, limit = 100) {
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.snapshotsStock.findMany({
                where: {
                    FechaSnapshot: {
                        gte: fechaDesde,
                        lte: fechaHasta,
                    },
                },
                include: {
                    Proyecto: {
                        select: {
                            Id: true,
                            Nombre: true,
                        },
                    },
                },
                orderBy: { FechaSnapshot: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.snapshotsStock.count({
                where: {
                    FechaSnapshot: {
                        gte: fechaDesde,
                        lte: fechaHasta,
                    },
                },
            }),
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get comparison between two months
     */
    async getComparativo(mesActual: Date, mesAnterior: Date) {
        const snapshotsActual = await this.getSnapshotByDate(mesActual);
        const snapshotsAnterior = await this.getSnapshotByDate(mesAnterior);

        const comparativo = snapshotsActual.map((actual) => {
            const anterior = snapshotsAnterior.find(
                (s) => s.ProyectoId === actual.ProyectoId,
            );

            return {
                proyecto: actual.Proyecto?.Nombre || 'Sin proyecto',
                actual: {
                    disponibles: actual.Disponibles,
                    reservadas: actual.Reservadas,
                    vendidas: actual.Vendidas,
                    valorStock: actual.ValorStockUSD,
                },
                anterior: anterior
                    ? {
                        disponibles: anterior.Disponibles,
                        reservadas: anterior.Reservadas,
                        vendidas: anterior.Vendidas,
                        valorStock: anterior.ValorStockUSD,
                    }
                    : null,
                diferencia: anterior
                    ? {
                        disponibles: actual.Disponibles - anterior.Disponibles,
                        reservadas: actual.Reservadas - anterior.Reservadas,
                        vendidas: actual.Vendidas - anterior.Vendidas,
                    }
                    : null,
            };
        });

        return comparativo;
    }

    async getStockEvolution(fechaDesde: Date, fechaHasta: Date) {
        // ⚡ P-003 FIX: Use database aggregation (groupBy) instead of fetching all records
        // This reduces payload from N*Projects to N (Days)
        const result = await this.prisma.snapshotsStock.groupBy({
            by: ['FechaSnapshot'],
            where: {
                FechaSnapshot: {
                    gte: fechaDesde,
                    lte: fechaHasta,
                },
            },
            _sum: {
                Disponibles: true,
                Reservadas: true,
                Vendidas: true,
            },
            orderBy: {
                FechaSnapshot: 'asc',
            },
        });

        return result.map(item => ({
            fecha: item.FechaSnapshot,
            disponibles: item._sum.Disponibles || 0,
            reservadas: item._sum.Reservadas || 0,
            vendidas: item._sum.Vendidas || 0,
        }));
    }
}
