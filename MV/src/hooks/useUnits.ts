import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '@/services/supabaseService';
import { Unit } from '@/types/supabase-types';
import { toast } from 'sonner';

// Query keys
export const unitsKeys = {
  all: ['units'] as const,
  byProject: (projectId: string) => ['units', 'project', projectId] as const,
  detail: (id: string) => ['units', 'detail', id] as const,
};

/**
 * Hook para obtener todas las unidades de un proyecto
 */
export function useUnits(projectId: string) {
  return useQuery({
    queryKey: unitsKeys.byProject(projectId),
    queryFn: async () => {
      if (!projectId) return [];
      const units = await supabaseService.getUnitsByProject(projectId);
      return units;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para obtener TODAS las unidades (sin filtro de proyecto)
 */
export function useAllUnits() {
  return useQuery({
    queryKey: unitsKeys.all,
    queryFn: async () => {
      const units = await supabaseService.getAllUnits();
      return units;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para obtener una unidad específica
 */
export function useUnit(unitId: string) {
  return useQuery({
    queryKey: unitsKeys.detail(unitId),
    queryFn: async () => {
      const unit = await supabaseService.getUnitById(unitId);
      return unit;
    },
    enabled: !!unitId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para crear una unidad
 */
export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (unitData: Omit<Unit, 'id'>) => {
      const newUnit = await supabaseService.createUnit(unitData);
      return newUnit;
    },
    onSuccess: (newUnit) => {
      // Invalidar queries relacionadas
      if (newUnit.proyecto) {
        queryClient.invalidateQueries({
          queryKey: unitsKeys.byProject(newUnit.proyecto)
        });
      }
      queryClient.invalidateQueries({ queryKey: unitsKeys.all });

      toast.success('Unidad creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear unidad: ${error.message}`);
    },
  });
}

/**
 * Hook para actualizar una unidad
 */
export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Unit> }) => {
      const updatedUnit = await supabaseService.updateUnit({ ...data, id } as Unit);
      return updatedUnit;
    },
    onMutate: async ({ id, data }) => {
      // Cancelar queries en vuelo
      await queryClient.cancelQueries({ queryKey: unitsKeys.detail(id) });

      // Snapshot del valor anterior
      const previousUnit = queryClient.getQueryData(unitsKeys.detail(id));

      // Optimistic update
      queryClient.setQueryData(unitsKeys.detail(id), (old: Unit | undefined) => ({
        ...old,
        ...data,
      }));

      return { previousUnit };
    },
    onError: (error: Error, variables, context) => {
      // Rollback en caso de error
      if (context?.previousUnit) {
        queryClient.setQueryData(
          unitsKeys.detail(variables.id),
          context.previousUnit
        );
      }
      toast.error(`Error al actualizar unidad: ${error.message}`);
    },
    onSuccess: (updatedUnit) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: unitsKeys.detail(updatedUnit.id)
      });
      if (updatedUnit.proyecto) {
        queryClient.invalidateQueries({
          queryKey: unitsKeys.byProject(updatedUnit.proyecto)
        });
      }

      toast.success('Unidad actualizada exitosamente');
    },
    onSettled: () => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: unitsKeys.all });
    },
  });
}

/**
 * Hook para eliminar una unidad
 */
export function useDeleteUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (unitId: string) => {
      await supabaseService.deleteUnit(unitId);
      return unitId;
    },
    onSuccess: (unitId) => {
      // Invalidar todas las queries de unidades
      queryClient.invalidateQueries({ queryKey: unitsKeys.all });

      toast.success('Unidad eliminada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar unidad: ${error.message}`);
    },
  });
}

/**
 * Hook para obtener proyectos disponibles
 */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const projects = await supabaseService.getProjects();
      return projects;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}
