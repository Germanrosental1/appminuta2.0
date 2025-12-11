import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthEventType } from './dto/log-auth-event.dto';

@Injectable()
export class AuthLoggerService {
    constructor(private readonly prisma: PrismaService) { }

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
            await this.prisma.auth_logs.create({
                data: {
                    user_id: userId,
                    email,
                    event_type: eventType,
                    timestamp: new Date(),
                    details: details ? structuredClone(details) : null,
                    user_agent: userAgent,
                },
            });
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
            const events = await this.prisma.auth_logs.findMany({
                where: {
                    user_id: userId,
                },
                orderBy: {
                    timestamp: 'desc',
                },
                take: limit,
                select: {
                    id: true,
                    event_type: true,
                    timestamp: true,
                    details: true,
                    user_agent: true,
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

            const recentLogins = await this.prisma.auth_logs.findMany({
                where: {
                    user_id: userId,
                    event_type: AuthEventType.LOGIN_SUCCESS,
                    timestamp: {
                        gte: oneHourAgo,
                    },
                },
                orderBy: {
                    timestamp: 'desc',
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
