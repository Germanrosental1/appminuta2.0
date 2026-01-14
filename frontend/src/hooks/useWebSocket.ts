import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface MinutaEvent {
    minutaId: string;
    proyecto?: string;
    estado?: string;
    usuarioId?: string;
}

/**
 * Hook para conexión WebSocket con actualizaciones en tiempo real
 * Escucha eventos de minutas y refresca el cache automáticamente
 */
export function useWebSocket() {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const socketRef = useRef<Socket | null>(null);

    // Obtener token de sesión
    useEffect(() => {
        const getToken = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setAccessToken(session?.access_token || null);
        };
        getToken();

        // Escuchar cambios de auth para actualizar token
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setAccessToken(session?.access_token || null);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const connect = useCallback(() => {
        if (!accessToken || socketRef.current?.connected) return;

        const socket = io(`${SOCKET_URL}/minutas`, {
            auth: { token: accessToken },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            // Connected silently
        });

        socket.on('disconnect', (reason) => {
            // Disconnected silently
        });

        socket.on('connect_error', (error) => {
            // Connection error - silent
        });

        // Evento: Nueva minuta creada (para admins)
        socket.on('minuta:created', (payload: MinutaEvent) => {
            queryClient.invalidateQueries({ queryKey: ['minutas'] });
            toast({
                title: '📋 Nueva minuta',
                description: 'Un comercial ha creado una nueva minuta',
            });
        });

        // Evento: Estado de minuta cambió (para el usuario dueño)
        socket.on('minuta:stateChanged', (payload: MinutaEvent) => {
            queryClient.invalidateQueries({ queryKey: ['minutas'] });
            queryClient.invalidateQueries({ queryKey: ['minuta', payload.minutaId] });
            toast({
                title: '📋 Estado actualizado',
                description: `Tu minuta fue actualizada a: ${payload.estado}`,
            });
        });

        // Evento: Minuta actualizada
        socket.on('minuta:updated', (payload: MinutaEvent) => {
            queryClient.invalidateQueries({ queryKey: ['minutas'] });
            queryClient.invalidateQueries({ queryKey: ['minuta', payload.minutaId] });
        });

        socketRef.current = socket;
    }, [accessToken, queryClient, toast]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    }, []);

    // Conectar cuando hay token, desconectar al cerrar
    useEffect(() => {
        if (accessToken) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [accessToken, connect, disconnect]);

    return {
        isConnected: socketRef.current?.connected ?? false,
        connect,
        disconnect,
    };
}
