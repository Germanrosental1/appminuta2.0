import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAllMinutasProvisoriasForAdmin,
    getMinutaProvisoriaById,
    actualizarEstadoMinutaProvisoria,
    getDatosMapaVentasByUnidadId
} from '@/services/minutas';
import { useToast } from '@/components/ui/use-toast';

export const minutasKeys = {
    all: ['minutas-provisorias'] as const,
    detail: (id: string) => ['minutas-provisorias', id] as const,
    mapaVentas: (unidadId: string) => ['mapa-ventas', unidadId] as const,
};

export function useMinutasProvisoriasAdmin() {
    return useQuery({
        queryKey: minutasKeys.all,
        queryFn: getAllMinutasProvisoriasForAdmin,
    });
}

export function useMinutaProvisoria(id: string) {
    return useQuery({
        queryKey: minutasKeys.detail(id),
        queryFn: () => getMinutaProvisoriaById(id),
        enabled: !!id,
    });
}

export function useDatosMapaVentas(unidadId: string | undefined) {
    return useQuery({
        queryKey: minutasKeys.mapaVentas(unidadId || ''),
        queryFn: () => getDatosMapaVentasByUnidadId(unidadId || ''),
        enabled: !!unidadId,
        staleTime: 5 * 60 * 1000,
    });
}

export function useActualizarEstadoMinutaProvisoria() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({ id, estado, comentarios }: { id: string; estado: 'pendiente' | 'revisada' | 'aprobada' | 'rechazada'; comentarios?: string }) =>
            actualizarEstadoMinutaProvisoria(id, estado, comentarios),
        onSuccess: (updatedMinuta, variables) => {
            // Update specific minuta in cache
            queryClient.setQueryData(minutasKeys.detail(variables.id), updatedMinuta);

            // Update list cache (optimistic-like) or invalidate
            queryClient.invalidateQueries({ queryKey: minutasKeys.all });

            toast({
                title: "Estado actualizado",
                description: `La minuta ha sido marcada como ${variables.estado}`,
            });
        },
        onError: (error) => {
            console.error('Error updating minuta state:', error);
            toast({
                title: "Error",
                description: "No se pudo actualizar el estado de la minuta",
                variant: "destructive",
            });
        }
    });
}
