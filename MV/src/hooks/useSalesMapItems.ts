import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesMapService } from '@/services/salesMapService';
import { SalesMapItem } from '@/types';
import { toast } from 'sonner';

// Query keys
export const salesMapItemsKeys = {
  all: ['salesMapItems'] as const,
  lists: () => [...salesMapItemsKeys.all, 'list'] as const,
  byProject: (project: string) => [...salesMapItemsKeys.all, 'project', project] as const,
  detail: (id: string) => [...salesMapItemsKeys.all, 'detail', id] as const,
};

/**
 * Hook para obtener todos los items del mapa de ventas
 */
export function useSalesMapItems() {
  return useQuery({
    queryKey: salesMapItemsKeys.all,
    queryFn: async () => {
      const items = await salesMapService.getAll();
      return items;
    },
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para obtener items del mapa de ventas por proyecto
 */
export function useSalesMapItemsByProject(project: string) {
  return useQuery({
    queryKey: salesMapItemsKeys.byProject(project),
    queryFn: async () => {
      if (!project) return [];
      const items = await salesMapService.getByProject(project);
      return items;
    },
    enabled: !!project,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Hook para obtener un item específico del mapa de ventas
 */
export function useSalesMapItem(id: string) {
  return useQuery({
    queryKey: salesMapItemsKeys.detail(id),
    queryFn: async () => {
      const item = await salesMapService.getById(id);
      return item;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para actualizar un item del mapa de ventas
 */
export function useUpdateSalesMapItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesMapItem> }) => {
      const updated = await salesMapService.update(id, data);
      return updated;
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: salesMapItemsKeys.all });
      queryClient.invalidateQueries({ queryKey: salesMapItemsKeys.detail(data.id) });
      if (data.proyecto) {
        queryClient.invalidateQueries({
          queryKey: salesMapItemsKeys.byProject(data.proyecto)
        });
      }

      toast.success('Item actualizado correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });
}

/**
 * Hook para crear un nuevo item del mapa de ventas
 */
export function useCreateSalesMapItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<SalesMapItem, 'id'>) => {
      const created = await salesMapService.create(data);
      return created;
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: salesMapItemsKeys.all });
      if (data.proyecto) {
        queryClient.invalidateQueries({
          queryKey: salesMapItemsKeys.byProject(data.proyecto)
        });
      }

      toast.success('Item creado correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear: ${error.message}`);
    },
  });
}

/**
 * Hook para eliminar un item del mapa de ventas
 */
export function useDeleteSalesMapItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await salesMapService.delete(id);
      return id;
    },
    onMutate: async (id) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({ queryKey: salesMapItemsKeys.all });

      // Snapshot del valor anterior
      const previousItems = queryClient.getQueryData(salesMapItemsKeys.all);

      // Optimistic update - remover del cache
      queryClient.setQueryData<SalesMapItem[]>(
        salesMapItemsKeys.all,
        (old = []) => old.filter(item => item.id !== id)
      );

      return { previousItems };
    },
    onError: (error: Error, _id, context) => {
      // Rollback en caso de error
      if (context?.previousItems) {
        queryClient.setQueryData(salesMapItemsKeys.all, context.previousItems);
      }
      toast.error(`Error al eliminar: ${error.message}`);
    },
    onSuccess: (_data, id) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: salesMapItemsKeys.all });
      queryClient.removeQueries({ queryKey: salesMapItemsKeys.detail(id) });

      toast.success('Item eliminado correctamente');
    },
  });
}

/**
 * Hook para extraer proyectos únicos de los items
 */
export function useSalesMapProjects() {
  const { data: items = [], isLoading, error } = useSalesMapItems();

  const projects = Array.from(
    new Set(items.map(item => item.proyecto).filter(Boolean) as string[])
  );

  return {
    data: projects,
    isLoading,
    error,
  };
}
