import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    Request,
    ForbiddenException,
    Query,
} from '@nestjs/common';
import { AuthLoggerService } from './auth-logger.service';
import { LogAuthEventDto } from './dto/log-auth-event.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';

@Controller('auth')
export class AuthLoggerController {
    constructor(private readonly authLoggerService: AuthLoggerService) { }

    /**
     * POST /api/auth/log
     * Registra un evento de autenticación
     * Protegido con JWT - solo usuarios autenticados pueden registrar eventos
     */
    @Post('log')
    @UseGuards(SupabaseAuthGuard)
    async logAuthEvent(@Request() req, @Body() logDto: LogAuthEventDto) {
        const userId = req.user?.sub || req.user?.id;

        await this.authLoggerService.logAuthEvent(
            userId,
            logDto.eventType,
            logDto.email,
            logDto.details,
            logDto.userAgent || req.headers['user-agent'],
        );

        return { success: true };
    }

    /**
     * POST /api/auth/log-public
     * Registra eventos de autenticación sin JWT (para login failed, etc.)
     * Solo permite ciertos tipos de eventos
     */
    @Post('log-public')
    async logPublicAuthEvent(@Body() logDto: LogAuthEventDto) {
        // Solo permitir eventos que no requieren autenticación
        const allowedEvents = ['login_failed', 'auth_error'];
        if (!allowedEvents.includes(logDto.eventType)) {
            throw new ForbiddenException('Event type not allowed for public logging');
        }

        await this.authLoggerService.logAuthEvent(
            null,
            logDto.eventType,
            logDto.email,
            logDto.details,
            logDto.userAgent,
        );

        return { success: true };
    }

    /**
     * GET /api/auth/logs/:userId
     * Obtiene los eventos recientes de un usuario
     * Solo el propio usuario puede ver sus logs
     */
    @Get('logs/:userId')
    @UseGuards(SupabaseAuthGuard)
    async getRecentAuthEvents(
        @Request() req,
        @Param('userId') userId: string,
        @Query('limit') limit?: string,
    ) {
        const requestUserId = req.user?.sub || req.user?.id;

        // Verificar que el usuario solo pueda acceder a sus propios logs
        if (requestUserId !== userId) {
            throw new ForbiddenException('You can only access your own auth logs');
        }

        const events = await this.authLoggerService.getRecentAuthEvents(
            userId,
            limit ? Number.parseInt(limit, 10) : 5,
        );

        return { events };
    }

    /**
     * GET /api/auth/suspicious/:userId
     * Detecta actividad sospechosa para un usuario
     * Solo el propio usuario puede verificar su actividad
     */
    @Get('suspicious/:userId')
    @UseGuards(SupabaseAuthGuard)
    async detectSuspiciousActivity(
        @Request() req,
        @Param('userId') userId: string,
    ) {
        const requestUserId = req.user?.sub || req.user?.id;

        // Verificar que el usuario solo pueda verificar su propia actividad
        if (requestUserId !== userId) {
            throw new ForbiddenException(
                'You can only check your own suspicious activity',
            );
        }

        const isSuspicious =
            await this.authLoggerService.detectSuspiciousActivity(userId);

        return { isSuspicious };
    }
}
