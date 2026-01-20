import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthEventType } from './dto/log-auth-event.dto';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class AuthLoggerService {
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
    ): Promise<void> {
        try {
            await this.prisma.authLogs.create({
                data: {
                    UserId: userId,
                    Email: email,
                    EventType: eventType,
                    Timestamp: new Date(),
                    Detail: details ? structuredClone(details) : null,
                    UserAgent: userAgent,
                },
            });

            // 📝 AUDIT LOG para cambios de contraseña
            if (eventType === AuthEventType.PASSWORD_CHANGED) {
                await this.logger.agregarLog({
                    motivo: 'Cambio de Contraseña',
                    descripcion: 'El usuario ha cambiado su contraseña.',
                    impacto: 'Alto',
                    tablaafectada: 'users',
                    usuarioID: userId,
                    usuarioemail: email || 'unknown',
                });
            }
        } catch (error) {
            console.error('Error al registrar evento de autenticación:', error);
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
        } catch (error) {
            console.error('Error al obtener eventos de autenticación:', error);
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
        } catch (error) {
            console.error('Error al detectar actividad sospechosa:', error);
            return false;
        }
    }
}
