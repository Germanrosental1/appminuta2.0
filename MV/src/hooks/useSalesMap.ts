import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '@/services/supabaseService';
import { toast } from 'sonner';

export interface SalesMapItem {
  Id: string;
  Numero: string;
  Estado: string;
  Tipo: string;
  Dormitorios: number;
  PrecioLista: number;
  PrecioVenta?: number;
  ClienteNombre?: string;
  ComercialNombre?: string;
  ProyectoId: string;
}

// Query keys
export const salesMapKeys = {
  all: ['salesMap'] as const,
  byProject: (projectId: string) => ['salesMap', 'project', projectId] as const,
  stats: (projectId: string) => ['salesMap', 'stats', projectId] as const,
};

/**
 * Hook para obtener el mapa de ventas de un proyecto
 */
export function useSalesMap(projectId: string) {
  return useQuery({
    queryKey: salesMapKeys.byProject(projectId),
    queryFn: async () => {
      if (!projectId) return [];

      // Obtener unidades con información de ventas
      const units = await supabaseService.getUnitsByProject(projectId);

      // Mapear a formato SalesMapItem
      const salesMapItems: SalesMapItem[] = units.map(unit => ({
        Id: unit.Id,
        Numero: unit.Numero,
        Estado: unit.Estado,
        Tipo: unit.Tipo,
        Dormitorios: unit.Dormitorios,
        PrecioLista: unit.PrecioLista,
        PrecioVenta: unit.PrecioVenta,
        ClienteNombre: unit.ClienteNombre,
        ComercialNombre: unit.ComercialNombre,
        ProyectoId: unit.ProyectoId,
      }));

      return salesMapItems;
    },
    enabled: !!projectId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para obtener estadísticas del mapa de ventas
 */
export function useSalesMapStats(projectId: string) {
  return useQuery({
    queryKey: salesMapKeys.stats(projectId),
    queryFn: async () => {
      const items = await supabaseService.getUnitsByProject(projectId);

      const stats = {
        total: items.length,
        disponibles: items.filter(u => u.Estado === 'Disponible').length,
        reservadas: items.filter(u => u.Estado === 'Reservado').length,
        vendidas: items.filter(u => u.Estado === 'Vendido').length,
        noDisponibles: items.filter(u => u.Estado === 'No disponible').length,
        valorTotal: items.reduce((sum, u) => sum + (u.PrecioLista || 0), 0),
        valorVendido: items
          .filter(u => u.Estado === 'Vendido')
          .reduce((sum, u) => sum + (u.PrecioVenta || u.PrecioLista || 0), 0),
      };

      return stats;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para actualizar el estado de una unidad en el mapa
 */
export function useUpdateUnitStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      unitId,
      estado,
      projectId
    }: {
      unitId: string;
      estado: string;
      projectId: string;
    }) => {
      const updated = await supabaseService.updateUnit(unitId, { Estado: estado });
      return { updated, projectId };
    },
    onMutate: async ({ unitId, estado, projectId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: salesMapKeys.byProject(projectId)
      });

      // Snapshot previous value
      const previous = queryClient.getQueryData(salesMapKeys.byProject(projectId));

      // Optimistically update
      queryClient.setQueryData(
        salesMapKeys.byProject(projectId),
        (old: SalesMapItem[] = []) =>
          old.map(item =>
            item.Id === unitId
              ? { ...item, Estado: estado }
              : item
          )
      );

      return { previous, projectId };
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          salesMapKeys.byProject(context.projectId),
          context.previous
        );
      }
      toast.error(`Error al actualizar estado: ${error.message}`);
    },
    onSuccess: ({ projectId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: salesMapKeys.stats(projectId)
      });
      toast.success('Estado actualizado exitosamente');
    },
  });
}

/**
 * Hook para filtros del mapa de ventas
 */
export function useFilteredSalesMap(
  projectId: string,
  filters: {
    tipo?: string;
    estado?: string;
    dormitorios?: number;
    precioMin?: number;
    precioMax?: number;
  }
) {
  const { data: salesMap = [], ...query } = useSalesMap(projectId);

  const filteredData = salesMap.filter(item => {
    if (filters.tipo && filters.tipo !== 'all' && item.Tipo !== filters.tipo) {
      return false;
    }
    if (filters.estado && filters.estado !== 'all' && item.Estado !== filters.estado) {
      return false;
    }
    if (filters.dormitorios && item.Dormitorios !== filters.dormitorios) {
      return false;
    }
    if (filters.precioMin && item.PrecioLista < filters.precioMin) {
      return false;
    }
    if (filters.precioMax && item.PrecioLista > filters.precioMax) {
      return false;
    }
    return true;
  });

  return {
    ...query,
    data: filteredData,
    totalFiltered: filteredData.length,
  };
}
