import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class LoggingThrottlerGuard extends ThrottlerGuard {
    @Inject(LoggerService)
    private readonly logger: LoggerService;

    protected async throwThrottlingException(context: ExecutionContext, throttlerLimitDetail: any): Promise<void> {
        const req = context.switchToHttp().getRequest();
        // Obtener IP (manejar proxy/array)
        const ip = req.ips?.length ? req.ips[0] : req.ip;

        // Loggear el intento
        // Use '00000000-0000-0000-0000-000000000000' for nil UUID as requested by "user id 0" (must be valid UUID format for DB)
        // Use '0' for tablaafectada
        // Use IP for usuarioemail
        try {
            await this.logger.agregarLog({
                motivo: 'Rate Limit Exceeded',
                descripcion: `Intento de acceso bloqueado por exceso de peticiones a ${req.method} ${req.url}`,
                impacto: 'Medio',
                tablaafectada: '0',
                usuarioID: '00000000-0000-0000-0000-000000000000',
                usuarioemail: ip || 'unknown_ip',
            });
        } catch (err) {
            console.error('Error logging throttling event:', err);
        }

        // Lanzar la excepción estándar
        await super.throwThrottlingException(context, throttlerLimitDetail);
    }
}
