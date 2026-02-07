import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthEventType } from './dto/log-auth-event.dto';
import { LoggerService } from '../logger/logger.service';
import { maskEmail } from '../common/sanitize.helper';

@Injectable()
export class AuthLoggerService {
    private readonly nestLogger = new Logger(AuthLoggerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: LoggerService
    ) { }

    /**
     * Registra eventos de autenticación en la base de datos
     * Esta función es segura porque se ejecuta en el servidor
     */
    async logAuthEvent(
        userId: string | null,
        eventType: AuthEventType,
        email?: string,
        details?: Record<string, any>,
        userAgent?: string,
        ipAddress?: string,
    ): Promise<void> {
        try {
            const contextDetails = {
                ...details,
                ip: ipAddress,
            };

            await this.prisma.authLogs.create({
                data: {
                    UserId: userId,
                    Email: maskEmail(email || 'unknown'),
                    EventType: eventType,
                    Timestamp: new Date(),
                    Detail: details ? structuredClone(contextDetails) : undefined,
                    UserAgent: userAgent,
                },
            });

            // Log de consola estructurado para monitoreo en tiempo real
            if (eventType === AuthEventType.LOGIN_FAILED) {
                this.nestLogger.warn(
                    `ALERTA DE SEGURIDAD: Fallo de inicio de sesión | Email: ${maskEmail(email || 'unknown')} | IP: ${ipAddress} | Motivo: ${details?.reason || 'Desconocido'}`,
                    'AuthSecurity'
                );
            }

            // AUDIT LOG para cambios de contraseña
            if (eventType === AuthEventType.PASSWORD_CHANGED) {
                await this.logger.agregarLog({
                    motivo: 'Cambio de Contraseña',
                    descripcion: 'El usuario ha cambiado su contraseña.',
                    impacto: 'Alto',
                    tablaafectada: 'users',
                    usuarioID: userId ?? undefined,
                    usuarioemail: email || 'unknown',
                });
            }
        } catch (error: unknown) {
            this.nestLogger.error(
                `Error al registrar evento de autenticación: ${error instanceof Error ? error.message : error}`,
                error instanceof Error ? error.stack : undefined,
                'AuthLoggerService'
            );
            // No lanzar error para no interrumpir el flujo de autenticación
        }
    }

    /**
     * Obtiene los últimos eventos de autenticación para un usuario específico
     */
    async getRecentAuthEvents(userId: string, limit: number = 5) {
        try {
            const events = await this.prisma.authLogs.findMany({
                where: {
                    UserId: userId,
                },
                orderBy: {
                    Timestamp: 'desc',
                },
                take: limit,
                select: {
                    Id: true,
                    EventType: true,
                    Timestamp: true,
                    Detail: true,
                    UserAgent: true,
                },
            });

            return events;
        } catch (error: unknown) {
            console.error('Error al obtener eventos de autenticación:', error instanceof Error ? error.message : error);
            return [];
        }
    }

    /**
     * Detecta posibles accesos sospechosos basados en patrones de inicio de sesión
     * Retorna true si se detecta actividad sospechosa
     */
    async detectSuspiciousActivity(userId: string): Promise<boolean> {
        try {
            // Obtener los últimos 10 eventos de inicio de sesión
            const oneHourAgo = new Date();
            oneHourAgo.setHours(oneHourAgo.getHours() - 1);

            const recentLogins = await this.prisma.authLogs.findMany({
                where: {
                    UserId: userId,
                    EventType: AuthEventType.LOGIN_SUCCESS,
                    Timestamp: {
                        gte: oneHourAgo,
                    },
                },
                orderBy: {
                    Timestamp: 'desc',
                },
            });

            // Si hay más de 5 inicios de sesión en la última hora, es sospechoso
            return recentLogins.length > 5;
        } catch (error: unknown) {
            console.error('Error al detectar actividad sospechosa:', error instanceof Error ? error.message : error);
            return false;
        }
    }
}
