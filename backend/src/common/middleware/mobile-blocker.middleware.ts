import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class MobileBlockerMiddleware implements NestMiddleware {
    private readonly logger = new Logger(MobileBlockerMiddleware.name);

    // Regex para detectar user agents móviles comunes
    private readonly MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;

    // Rutas exentas del bloqueo (ej: endpoints que consumirá la App móvil nativa si existiera en un futuro)
    private readonly WHITELISTED_PATHS = [
        '/health', // Healthcheck siempre permitido
        '/api/mobile', // Futuras rutas exclusivas de mobile
    ];

    use(req: Request, res: Response, next: NextFunction) {
        const userAgent = req.headers['user-agent'] || '';
        const path = req.originalUrl;

        // Si la ruta está en whitelist, permitir
        if (this.WHITELISTED_PATHS.some(whitelisted => path.startsWith(whitelisted))) {
            return next();
        }

        // Si el user agent matchea con dispositivos móviles
        if (this.MOBILE_UA_REGEX.test(userAgent)) {
            // Check adicional: Permitir Tablets? 
            // El requerimiento dice "Web App es solo desktop". iPad a veces manda "Macintosh" en modo desktop.
            // Por ahora bloqueamos tod lo que diga mobile.

            this.logger.warn(`Mobile access blocked from IP ${req.ip}. UA: ${userAgent}`);

            throw new ForbiddenException({
                statusCode: 403,
                message: 'Access Denied: This application is only available on Desktop devices.',
                error: 'Mobile Device Detected'
            });
        }

        next();
    }
}
