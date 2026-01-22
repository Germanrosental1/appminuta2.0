import { Injectable } from '@nestjs/common';
import { ILogger, LogParams } from '../common/interfaces/logger.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoggerService implements ILogger {
    constructor(private readonly prisma: PrismaService) { }

    async agregarLog(params: LogParams): Promise<void> {
        try {
            await this.prisma.changesLogs.create({
                data: {
                    Motivo: params.motivo,
                    Descripcion: params.descripcion,
                    Impacto: params.impacto,
                    TablaAfectada: params.tablaafectada,
                    UsuarioId: params.usuarioID || '00000000-0000-0000-0000-000000000000',
                    UsuarioMail: params.usuarioemail || 'system',
                },
            });
        } catch (error) {
            console.error('Error al guardar log en database:', error);
            // No re-throw para no interrumpir el flujo principal si el log falla
        }
    }
}
