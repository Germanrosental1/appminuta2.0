import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthorizationService } from '../auth/authorization/authorization.service'; // 🔒 Import AuthorizationService

interface MinutaEventPayload {
    minutaId: string;
    proyecto?: string;
    estado?: string;
    usuarioId?: string;
}

@Injectable()
@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:8080',
        credentials: true,
    },
    namespace: '/minutas',
})
export class MinutasGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(MinutasGateway.name);
    private readonly connectedClients = new Map<string, { userId: string; isAdmin: boolean }>();

    constructor(
        private readonly jwtService: JwtService,
        private readonly authService: AuthorizationService // 🔒 Injected
    ) { }

    afterInit() {
        this.logger.log('WebSocket Gateway initialized');
    }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                this.logger.warn(`Client ${client.id} connected without token`);
                client.disconnect();
                return;
            }

            // Verificar JWT
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET,
            });

            const userId = payload.sub;
            const userEmail = payload.email || 'unknown';
            const userRole = payload.role || payload.user_role || 'unknown';

            // 🔒 SEGURIDAD: Incluir todos los roles administrativos del sistema
            const adminRoles = ['admin', 'administrador', 'superadminmv', 'adminmv'];
            const isAdmin = adminRoles.includes(userRole.toLowerCase());

            // Guardar información del cliente
            this.connectedClients.set(client.id, { userId, isAdmin });

            // Unir a rooms específicas
            client.join(`user:${userId}`);

            // 🔒 SEGURIDAD MEJORADA: En lugar de un room global 'admins',
            // unir al admin a rooms específicos por proyecto donde tiene acceso.
            // Esto evita que un admin de un proyecto vea minutas de otro.
            if (isAdmin) {
                // Obtener proyectos del usuario (esto requeriría inyectar MinutasService o Auth Service,
                // por simplicidad y desacoplamiento, idealmente el token debería traer los projectIds o 
                // hacemos una consulta rápida al servicio de auth aquí si es crítico).
                // 
                // Para esta remediación inmediata, asumimos que el cliente envía los proyectos a los que quiere suscribirse
                // o mejor, consultamos sus permisos. 
                // Dado que no podemos inyectar fácilmente el servicio circular, usaremos el room global SOLO para SuperAdmins
                // y rooms por proyecto para admins regulares.

                if (userRole === 'superadminmv' || userRole === 'adminmv') {
                    client.join('admins'); // Superadmins ven todo
                }

                // Nota: Para una solución completa, el cliente debería emitir un evento 'joinProjectRoom'
                // autenticado para suscribirse a eventos de un proyecto específico.
            }

            this.logger.log(`Client connected - userId: ${userId}, email: ${userEmail}`);
        } catch (error) {
            this.logger.error(`Connection error: ${error.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        this.connectedClients.delete(client.id);
        this.logger.log(`Client ${client.id} disconnected`);
    }

    // ============================================
    // MÉTODOS PARA EMITIR EVENTOS DESDE EL SERVICIO
    // ============================================

    /**
     * Emitir cuando se crea una nueva minuta
     * Notifica a admins del proyecto específico
     */
    emitMinutaCreated(payload: MinutaEventPayload) {
        // Enviar a superadmins globales
        this.server.to('admins').emit('minuta:created', payload);

        // 🔒 SEGURIDAD: Enviar a admins del proyecto específico
        if (payload.proyecto) {
            this.server.to(`project-admins:${payload.proyecto}`).emit('minuta:created', payload);
            this.logger.log(`Emitted minuta:created to project-admins:${payload.proyecto} - ${payload.minutaId}`);
        }
    }

    /**
     * Emitir cuando cambia el estado de una minuta
     * Notifica al usuario dueño de la minuta
     */
    emitMinutaStateChanged(payload: MinutaEventPayload) {
        if (payload.usuarioId) {
            this.server.to(`user:${payload.usuarioId}`).emit('minuta:stateChanged', payload);
            this.logger.log(`Emitted minuta:stateChanged to user:${payload.usuarioId} - ${payload.minutaId}`);
        }
    }

    /**
     * Emitir cuando se actualiza una minuta
     * Notifica a admins y al usuario dueño
     */
    emitMinutaUpdated(payload: MinutaEventPayload) {
        this.server.to('admins').emit('minuta:updated', payload);

        // 🔒 SEGURIDAD: Enviar a admins del proyecto
        if (payload.proyecto) {
            this.server.to(`project-admins:${payload.proyecto}`).emit('minuta:updated', payload);
        }

        if (payload.usuarioId) {
            this.server.to(`user:${payload.usuarioId}`).emit('minuta:updated', payload);
        }
        this.logger.log(`Emitted minuta:updated - ${payload.minutaId}`);
    }

    /**
     * Obtener número de clientes conectados
     */
    getConnectedClientsCount(): number {
        return this.connectedClients.size;
    }

    /**
     * 🔒 Permite a un admin suscribirse a los eventos de un proyecto específico
     * Se debe llamar desde el cliente: socket.emit('joinProject', { projectId: '...' })
     */
    @SubscribeMessage('joinProject')
    async handleJoinProject(client: Socket, payload: { projectId: string }) {
        if (!payload.projectId) return;

        // Recuperar userId de la conexión
        const clientData = this.connectedClients.get(client.id);
        if (!clientData?.userId) {
            // No autenticado
            return;
        }

        const { userId, isAdmin } = clientData;

        try {
            // Verificar permisos usando AuthService

            // 1. Obtener rol en el proyecto
            const roleInProject = await this.authService.getUserRoleInProject(userId, payload.projectId);

            let hasAccess = false;

            if (roleInProject) {
                // 2. Si tiene rol, verificar si tiene permisos de "lectura general / admin"
                const permissions = await this.authService.getUserPermissions(userId, payload.projectId);

                if (permissions.includes('verTodasMinutas') ||
                    permissions.includes('editarMinuta') ||
                    permissions.includes('aprobarRechazarMinuta')) {
                    hasAccess = true;
                }
            }

            // 3. Si no tiene acceso por proyecto, verificar si es SuperAdmin global
            // (Asumiendo que isAdmin flag ya captura admin/superadmin roles globales correctamente en handleConnection)
            if (!hasAccess && isAdmin) {
                // Aquí podríamos hacer una validación más estricta si fuera necesario
                // Por ahora, asumimos que si es Admin Global, puede ver todo.
                // Sin embargo, para ser estrictos, deberíamos confirmar que tiene acceso a este proyecto/org.
                // Como fallback seguro:
                const canAccessProject = await this.authService.canAccessProject(userId, payload.projectId);
                if (canAccessProject) {
                    hasAccess = true;
                }
            }

            if (hasAccess) {
                client.join(`project-admins:${payload.projectId}`);
                this.logger.log(`Client ${client.id} (User ${userId}) joined project-admins:${payload.projectId}`);
            } else {
                this.logger.warn(`User ${userId} tried to join project-admins:${payload.projectId} without sufficient permissions`);
            }

        } catch (error) {
            this.logger.error(`Error validating joinProject for user ${userId}: ${error.message}`);
        }
    }
}
