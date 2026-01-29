import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// IDs de estados comerciales (de la tabla estadocomercial)
const ESTADO_COMERCIAL = {
    DISPONIBLE: 'c76f6972-5423-46a9-a517-f2db960367b6',
    RESERVADA: 'be937edf-25bf-4d4f-8a58-0019e869706a',
    VENDIDA: '34261046-d33d-4b27-ae6c-10790f3ebc76',
    NO_DISPONIBLE: '927617d7-e49e-4fa8-915b-ad06c01568f0',
    ALQUILADA: 'f173260c-d4e1-438b-8c77-f49baa73118d',
} as const;

@Injectable()
export class UnitStateService {
    private readonly logger = new Logger(UnitStateService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Reservar unidades cuando se crea una minuta
     * Cambia el estado de las unidades a "Reservada" en detallesventa
     */
    async reservarUnidades(unidadIds: string[]): Promise<void> {
        if (!unidadIds || unidadIds.length === 0) {
            this.logger.warn('No hay unidades para reservar');
            return;
        }

        this.logger.log(`Reservando ${unidadIds.length} unidades: ${unidadIds.join(', ')}`);

        try {
            // Usar upsert para crear o actualizar registros en detallesventa
            await Promise.all(
                unidadIds.map(async (unidadId) => {
                    await this.prisma.detallesVenta.upsert({
                        where: { UnidadId: unidadId },
                        create: {
                            UnidadId: unidadId,
                            EstadoId: ESTADO_COMERCIAL.RESERVADA,
                            FechaReserva: new Date(),
                        },
                        update: {
                            EstadoId: ESTADO_COMERCIAL.RESERVADA,
                            FechaReserva: new Date(),
                        },
                    });
                })
            );

            this.logger.log(`✅ ${unidadIds.length} unidades reservadas correctamente`);
        } catch (error: unknown) {
            this.logger.error(`Error al reservar unidades: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }

    /**
     * Liberar unidades cuando se cancela una minuta
     * Cambia el estado de las unidades a "Disponible" en detallesventa
     */
    async liberarUnidades(unidadIds: string[]): Promise<void> {
        if (!unidadIds || unidadIds.length === 0) {
            this.logger.warn('No hay unidades para liberar');
            return;
        }

        this.logger.log(`Liberando ${unidadIds.length} unidades: ${unidadIds.join(', ')}`);

        try {
            await this.prisma.detallesVenta.updateMany({
                where: {
                    UnidadId: { in: unidadIds },
                },
                data: {
                    EstadoId: ESTADO_COMERCIAL.DISPONIBLE,
                    FechaReserva: null,
                },
            });

            this.logger.log(`✅ ${unidadIds.length} unidades liberadas correctamente`);
        } catch (error: unknown) {
            this.logger.error(`Error al liberar unidades: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }

    /**
     * Marcar unidades como vendidas cuando se firma una minuta
     */
    async marcarVendidas(unidadIds: string[]): Promise<void> {
        if (!unidadIds || unidadIds.length === 0) {
            this.logger.warn('No hay unidades para marcar como vendidas');
            return;
        }

        this.logger.log(`Marcando ${unidadIds.length} unidades como vendidas`);

        try {
            await this.prisma.detallesVenta.updateMany({
                where: {
                    UnidadId: { in: unidadIds },
                },
                data: {
                    EstadoId: ESTADO_COMERCIAL.VENDIDA,
                },
            });

            this.logger.log(`✅ ${unidadIds.length} unidades marcadas como vendidas`);
        } catch (error: unknown) {
            this.logger.error(`Error al marcar unidades como vendidas: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }
}
