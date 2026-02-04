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
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AuthLoggerService } from './auth-logger.service';
import { LogAuthEventDto } from './dto/log-auth-event.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { ApiResponseWrapper } from '../common/decorators/api-response-wrapper.decorator';
import { SuccessResponseDto } from '../common/dto/success-response.dto';
import { CatalogResponseDto } from '../common/dto/catalog-response.dto';

@ApiTags('Auth & Audit')
@Controller('auth')
export class AuthLoggerController {
    constructor(private readonly authLoggerService: AuthLoggerService) { }

    @Post('log')
    @ApiOperation({
        summary: 'Registrar evento de auditoría (Privado)',
        description: 'Registra un evento de seguridad o auditoría para el usuario autenticado.',
    })
    @ApiBearerAuth('bearer')
    @ApiResponseWrapper(SuccessResponseDto)
    @ApiUnauthorizedResponse({ description: 'No autorizado' })
    @UseGuards(SupabaseAuthGuard)
    async logAuthEvent(@Request() req: any, @Body() logDto: LogAuthEventDto) {
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

    @Post('log-public')
    @ApiOperation({
        summary: 'Registrar evento de auditoría (Público)',
        description: 'Permite registrar eventos anónimos como fallos de login o errores de sistema.',
    })
    @ApiResponseWrapper(SuccessResponseDto)
    @ApiForbiddenResponse({ description: 'Prohibido - Tipo de evento no permitido para registro público' })
    async logPublicAuthEvent(@Body() logDto: LogAuthEventDto) {
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

    @Get('logs/:userId')
    @ApiOperation({
        summary: 'Obtener historial de eventos',
        description: 'Retorna los eventos recientes de auditoría del usuario. Solo permitido para el propio usuario.',
    })
    @ApiBearerAuth('bearer')
    @ApiResponseWrapper(CatalogResponseDto, true)
    @ApiForbiddenResponse({ description: 'Prohibido - No puede acceder a logs de otros usuarios' })
    @UseGuards(SupabaseAuthGuard)
    async getRecentAuthEvents(
        @Request() req: any,
        @Param('userId') userId: string,
        @Query('limit') limit?: string,
    ) {
        const requestUserId = req.user?.sub || req.user?.id;

        if (requestUserId !== userId) {
            throw new ForbiddenException('You can only access your own auth logs');
        }

        const events = await this.authLoggerService.getRecentAuthEvents(
            userId,
            limit ? Number.parseInt(limit, 10) : 5,
        );

        return { events };
    }

    @Get('suspicious/:userId')
    @ApiOperation({
        summary: 'Detectar actividad sospechosa',
        description: 'Analiza si el usuario ha tenido actividad sospechosa (ej. muchos fallos de login) recientemente.',
    })
    @ApiBearerAuth('bearer')
    @ApiResponseWrapper(SuccessResponseDto)
    @UseGuards(SupabaseAuthGuard)
    async detectSuspiciousActivity(
        @Request() req: any,
        @Param('userId') userId: string,
    ) {
        const requestUserId = req.user?.sub || req.user?.id;

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
