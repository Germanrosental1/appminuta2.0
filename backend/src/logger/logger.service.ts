import { Injectable } from '@nestjs/common';
import { ILogger, LogParams } from '../common/interfaces/logger.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoggerService implements ILogger {
    constructor(private readonly prisma: PrismaService) { }

    async agregarLog(params: LogParams): Promise<void> {
        try {
            await this.prisma.changes_logs.create({
                data: {
                    motivo: params.motivo,
                    descripcion: params.descripcion,
                    impacto: params.impacto,
                    tablaaftectada: params.tablaafectada,
                    usuarioID: params.usuarioID || '00000000-0000-0000-0000-000000000000',
                    usuriomail: params.usuarioemail || 'system',
                },
            });
        } catch (error) {
            console.error('Error al guardar log en database:', error);
            // No re-throw para no interrumpir el flujo principal si el log falla
        }
    }
}
