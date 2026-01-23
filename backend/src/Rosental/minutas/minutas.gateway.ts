import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

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
    private connectedClients = new Map<string, { userId: string; isAdmin: boolean }>();

    constructor(private readonly jwtService: JwtService) { }

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
            if (isAdmin) {
                client.join('admins');
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
     * Notifica a todos los admins
     */
    emitMinutaCreated(payload: MinutaEventPayload) {
        this.server.to('admins').emit('minuta:created', payload);
        this.logger.log(`Emitted minuta:created to admins - ${payload.minutaId}`);
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
}
