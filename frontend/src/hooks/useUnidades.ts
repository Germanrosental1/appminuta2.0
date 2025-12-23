import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
    getUnidadesPorEstado,
    getUnidadesPorProyecto,
    getUnidadById,
    getProyectosDisponibles,
    getTiposDisponibles,
    getProyectosPorTipo,
    getEtapasPorProyecto,
    getTiposPorProyecto,
    getSectoresProyecto,
    type UnidadResumen,
    type UnidadMapaVentas,
} from '@/services/unidades';

// ⚡ OPTIMIZACIÓN: Hook para prefetch de datos relacionados a un proyecto
export function usePrefetchProjectData() {
    const queryClient = useQueryClient();

    return {
        prefetchProjectData: async (proyecto: string, tipo?: string) => {
            if (!proyecto) return;

            // Prefetch etapas
            queryClient.prefetchQuery({
                queryKey: ['proyectos', proyecto, 'etapas'],
                queryFn: () => getEtapasPorProyecto(proyecto),
                staleTime: 2 * 60 * 60 * 1000,
            });

            // Prefetch tipos
            queryClient.prefetchQuery({
                queryKey: ['proyectos', proyecto, 'etapas', undefined, 'tipos'],
                queryFn: () => getTiposPorProyecto(proyecto),
                staleTime: 60 * 60 * 1000,
            });

            // Prefetch sectores si hay tipo
            if (tipo) {
                queryClient.prefetchQuery({
                    queryKey: ['proyectos', proyecto, 'etapas', undefined, 'tipos', tipo, 'sectores'],
                    queryFn: () => getSectoresProyecto(proyecto, undefined, tipo),
                    staleTime: 60 * 60 * 1000,
                });
            }
        },
    };
}


/**
 * Hook para obtener unidades por estado
 * Caché: 5 minutos
 */
export function useUnidadesPorEstado(
    estado: string = 'disponible',
    options?: Omit<UseQueryOptions<UnidadResumen[]>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: ['unidades', 'estado', estado],
        queryFn: () => getUnidadesPorEstado(estado),
        ...options,
    });
}

/**
 * Hook para obtener unidades por proyecto
 * Caché: 5 minutos
 */
export function useUnidadesPorProyecto(
    proyecto: string,
    options?: Omit<UseQueryOptions<UnidadResumen[]>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: ['unidades', 'proyecto', proyecto],
        queryFn: () => getUnidadesPorProyecto(proyecto),
        enabled: !!proyecto,
        ...options,
    });
}

/**
 * Hook para obtener una unidad específica por ID
 * Caché: 10 minutos (datos estáticos)
 */
export function useUnidad(
    id: number | null,
    options?: Omit<UseQueryOptions<UnidadMapaVentas | null>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: ['unidades', 'detalle', id],
        queryFn: () => getUnidadById(id),
        enabled: !!id,
        staleTime: 10 * 60 * 1000, // 10 minutos
        ...options,
    });
}

/**
 * Hook para obtener proyectos disponibles
 * Caché: 30 minutos (cambian muy poco)
 */
export function useProyectos(
    options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: ['proyectos', 'disponibles'],
        queryFn: getProyectosDisponibles,
        staleTime: 30 * 60 * 1000, // 30 minutos
        ...options,
    });
}

/**
 * Hook para obtener todos los tipos de unidad disponibles
 * Caché: 1 hora (tipos cambian muy poco)
 */
export function useTiposDisponibles(
    options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: ['unidades', 'tipos-disponibles'],
        queryFn: async () => {
            const result = await getTiposDisponibles();
            return result;
        },
        staleTime: 24 * 60 * 60 * 1000, // ⚡ 24 horas (tipos cambian muy poco)
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 días en caché
        ...options,
    });
}

/**
 * Hook para obtener proyectos que tienen un tipo específico de unidad
 * Caché: 30 minutos
 */
export function useProyectosPorTipo(
    tipo: string,
    options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: ['proyectos', 'por-tipo', tipo],
        queryFn: async () => {
            if (!tipo) return [];
            const result = await getProyectosPorTipo(tipo);
            return result;
        },
        enabled: !!tipo,
        staleTime: 2 * 60 * 60 * 1000, // ⚡ 2 horas (proyectos cambian poco)
        gcTime: 24 * 60 * 60 * 1000, // 24 horas en caché
        ...options,
    });
}

/**
 * Hook para obtener etapas de un proyecto
 * Caché: 1 hora
 */
export function useEtapas(
    proyecto: string,
    options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: ['proyectos', proyecto, 'etapas'],
        queryFn: async () => {
            const result = await getEtapasPorProyecto(proyecto);
            return result;
        },
        enabled: !!proyecto,
        staleTime: 2 * 60 * 60 * 1000, // ⚡ 2 horas (etapas cambian poco)
        gcTime: 24 * 60 * 60 * 1000, // 24 horas en caché
        ...options,
    });
}

/**
 * Hook para obtener tipos de un proyecto y etapa
 * Caché: 1 hora
 */
export function useTipos(
    proyecto: string,
    etapa?: string,
    options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: ['proyectos', proyecto, 'etapas', etapa, 'tipos'],
        queryFn: () => getTiposPorProyecto(proyecto, etapa),
        enabled: !!proyecto,
        staleTime: 60 * 60 * 1000, // 1 hora
        ...options,
    });
}

/**
 * Hook para obtener sectores de un proyecto, etapa y tipo
 * Caché: 1 hora
 */
export function useSectores(
    proyecto: string,
    etapa?: string,
    tipo?: string,
    options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: ['proyectos', proyecto, 'etapas', etapa, 'tipos', tipo, 'sectores'],
        queryFn: () => getSectoresProyecto(proyecto, etapa, tipo),
        enabled: !!proyecto,
        staleTime: 60 * 60 * 1000, // 1 hora
        ...options,
    });
}
