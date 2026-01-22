import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
    getMinutasDefinitivasByUsuario,
    getMinutaDefinitivaById,
    actualizarEstadoMinutaDefinitiva,
    guardarMinutaDefinitiva,
    deleteMinuta,
    type MinutaDefinitiva,
} from '@/services/minutas';

// ============================================
// QUERIES - Obtener datos
// ============================================

/**
 * Hook para obtener lista de minutas definitivas por usuario
 * Caché: 5 minutos
 */
export function useMinutas(
    usuarioId: string | undefined,
    filters?: Record<string, any>,
    options?: Omit<UseQueryOptions<MinutaDefinitiva[]>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: ['minutas', 'definitivas', usuarioId, filters],
        queryFn: () => getMinutasDefinitivasByUsuario(usuarioId, filters),
        enabled: !!usuarioId,
        ...options,
    });
}

/**
 * Hook para obtener una minuta específica por ID
 * Caché: 2 minutos (datos más dinámicos)
 */
export function useMinuta(
    minutaId: string | null,
    options?: Omit<UseQueryOptions<MinutaDefinitiva>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: ['minutas', 'definitiva', minutaId],
        queryFn: () => getMinutaDefinitivaById(minutaId),
        enabled: !!minutaId,
        staleTime: 2 * 60 * 1000, // 2 minutos
        ...options,
    });
}

/**
 * Hook para obtener todas las minutas (admin) con paginación
 */
export function useAllMinutas(
    page: number = 1,
    limit: number = 20,
    filters?: Record<string, any>,
    options?: Omit<UseQueryOptions<{
        data: MinutaDefinitiva[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: ['minutas', 'all', page, limit, filters],
        queryFn: async () => {
            const { getMinutasWithFilters } = await import('@/services/minutas');
            return getMinutasWithFilters({
                page,
                limit,
                ...filters,
            });
        },
        staleTime: 2 * 60 * 1000, // 2 minutos
        ...options,
    });
}

// ============================================
// MUTATIONS - Modificar datos
// ============================================

/**
 * Hook para actualizar el estado de una minuta
 * ⚡ OPTIMISTIC UI: Actualiza inmediatamente el caché, revierte si hay error
 */
export function useUpdateMinutaEstado() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            estado,
            comentarios
        }: {
            id: string;
            estado: any;
            comentarios?: string;
        }) => actualizarEstadoMinutaDefinitiva(id, estado, comentarios),

        // ⚡ OPTIMISTIC UI: Actualizar caché antes de que termine la mutación
        onMutate: async (variables) => {
            // Cancelar queries en curso para evitar sobreescribir nuestra actualización optimista
            await queryClient.cancelQueries({ queryKey: ['minutas'] });

            // Guardar el estado anterior para poder revertir
            const previousAllMinutas = queryClient.getQueriesData({ queryKey: ['minutas', 'all'] });
            const previousMinuta = queryClient.getQueryData(['minutas', 'definitiva', variables.id]);

            // Actualizar optimistamente el caché de la lista
            queryClient.setQueriesData(
                { queryKey: ['minutas', 'all'] },
                (old: any) => {
                    if (!old?.data) return old;
                    return {
                        ...old,
                        data: old.data.map((m: any) =>
                            m.Id === variables.id ? { ...m, Estado: variables.estado, Comentario: variables.comentarios } : m
                        ),
                    };
                }
            );

            // Actualizar optimistamente el caché de la minuta individual
            queryClient.setQueryData(
                ['minutas', 'definitiva', variables.id],
                (old: any) => old ? { ...old, Estado: variables.estado, Comentario: variables.comentarios } : old
            );

            // Retornar contexto con datos anteriores para rollback
            return { previousAllMinutas, previousMinuta };
        },

        // ⚡ OPTIMISTIC UI: Revertir en caso de error
        onError: (_err, variables, context) => {
            // Restaurar datos anteriores
            if (context?.previousAllMinutas) {
                context.previousAllMinutas.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            if (context?.previousMinuta) {
                queryClient.setQueryData(
                    ['minutas', 'definitiva', variables.id],
                    context.previousMinuta
                );
            }
        },

        // Siempre refetch después de completar (éxito o error) para sincronizar con servidor
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['minutas', 'definitivas'] });
            queryClient.invalidateQueries({ queryKey: ['minutas', 'all'] });
        },
    });
}

/**
 * Hook para guardar una nueva minuta definitiva
 */
export function useSaveMinuta() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (minuta: Omit<MinutaDefinitiva, 'Id' | 'FechaCreacion' | 'CreatedAt' | 'UpdatedAt'>) =>
            guardarMinutaDefinitiva(minuta),

        onSuccess: () => {
            // Invalidar todas las listas de minutas
            queryClient.invalidateQueries({ queryKey: ['minutas'] });
        },
    });
}

/**
 * Hook para eliminar una minuta
 */
export function useDeleteMinuta() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteMinuta(id),

        onSuccess: (_, id) => {
            // Invalidar listas
            queryClient.invalidateQueries({ queryKey: ['minutas', 'definitivas'] });
            queryClient.invalidateQueries({ queryKey: ['minutas', 'all'] });
            // Remover minuta específica del caché
            queryClient.removeQueries({ queryKey: ['minutas', 'definitiva', id] });
        },
    });
}
