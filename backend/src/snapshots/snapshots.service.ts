import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

        const results = [];

        for (const proyecto of proyectos) {
            // Get current state of all units for this project via the view
            const unidades = await this.getProjectUnits(proyecto.Nombre);
            if (unidades.length === 0) continue;

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

            results.push({
                proyecto: proyecto.Nombre,
                snapshotId: snapshot.Id,
                totalUnidades: stats.totalUnidades,
                disponibles: stats.disponibles,
                reservadas: stats.reservadas,
                vendidas: stats.vendidas,
            });
        }

        return {
            fecha: fecha.toISOString().split('T')[0],
            tipoSnapshot,
            proyectosProcessados: results.length,
            detalles: results,
        };
    }

    private async getProjectUnits(projectName: string) {
        return this.prisma.$queryRaw<any[]>`
            SELECT 
              "Id",
              "SectorId",
              "Proyecto",
              "Tipo",
              "Estado",
              "PrecioUsd",
              "UsdM2"
            FROM public.vista_buscador_propiedades
            WHERE "Proyecto" = ${projectName}
        `;
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
}
