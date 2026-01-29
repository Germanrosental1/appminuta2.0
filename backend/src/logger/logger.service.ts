import { Injectable } from '@nestjs/common';
import { ILogger, LogParams } from '../common/interfaces/logger.interface';
import { PrismaService } from '../prisma/prisma.service';
import { maskEmail } from '../common/sanitize.helper';

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
                    UsuarioMail: maskEmail(params.usuarioemail || 'system'),
                },
            });
        } catch (error: unknown) {
            console.error('Error al guardar log en database:', error);
            // No re-throw para no interrumpir el flujo principal si el log falla
        }
    }
}
