import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '@/services/supabaseService';
import { backendAPI } from '@/services/backendAPI';
import { toast } from 'sonner';

export interface Project {
  Id: string;
  Nombre: string;
  Direccion?: string;
  InmobiliariaId: string;
}

export interface PriceAdjustment {
  tipo: 'percentage' | 'fixed';
  valor: number;
  aplicarA: 'all' | 'disponibles' | 'selected';
  unidadesSeleccionadas?: string[];
}

export interface PriceUpdateResult {
  success: boolean;
  unidadesActualizadas: number;
  errores?: string[];
}

// Query keys
export const priceAdjustmentKeys = {
  all: ['priceAdjustment'] as const,
  projects: ['priceAdjustment', 'projects'] as const,
  projectUnits: (projectId: string) => ['priceAdjustment', 'projectUnits', projectId] as const,
  preview: (projectId: string, adjustment: PriceAdjustment) =>
    ['priceAdjustment', 'preview', projectId, adjustment] as const,
};

/**
 * Hook para obtener proyectos disponibles para ajuste de precios
 */
export function usePriceProjects() {
  return useQuery({
    queryKey: priceAdjustmentKeys.projects,
    queryFn: async () => {
      const projects = await backendAPI.getProjects();
      return projects;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook para obtener unidades de un proyecto para ajuste de precios
 */
export function usePriceProjectUnits(projectId: string) {
  return useQuery({
    queryKey: priceAdjustmentKeys.projectUnits(projectId),
    queryFn: async () => {
      if (!projectId) return [];

      const units = await supabaseService.getUnitsByProject(projectId);
      return units;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para previsualizar ajuste de precios
 */
export function usePriceAdjustmentPreview(
  projectId: string,
  adjustment: PriceAdjustment | null
) {
  return useQuery({
    queryKey: adjustment
      ? priceAdjustmentKeys.preview(projectId, adjustment)
      : ['priceAdjustment', 'preview', 'null'],
    queryFn: async () => {
      if (!projectId || !adjustment) return null;

      const units = await supabaseService.getUnitsByProject(projectId);

      // Filtrar unidades según aplicarA
      let unidadesAfectadas = units;
      if (adjustment.aplicarA === 'disponibles') {
        unidadesAfectadas = units.filter(u => u.Estado === 'Disponible');
      } else if (adjustment.aplicarA === 'selected' && adjustment.unidadesSeleccionadas) {
        unidadesAfectadas = units.filter(u =>
          adjustment.unidadesSeleccionadas!.includes(u.Id)
        );
      }

      // Calcular nuevos precios
      const preview = unidadesAfectadas.map(unit => {
        const precioActual = unit.PrecioLista || 0;
        let precioNuevo = precioActual;

        if (adjustment.tipo === 'percentage') {
          precioNuevo = precioActual * (1 + adjustment.valor / 100);
        } else {
          precioNuevo = precioActual + adjustment.valor;
        }

        return {
          Id: unit.Id,
          Numero: unit.Numero,
          PrecioActual: precioActual,
          PrecioNuevo: precioNuevo,
          Diferencia: precioNuevo - precioActual,
          PorcentajeCambio: ((precioNuevo - precioActual) / precioActual) * 100,
        };
      });

      const resumen = {
        totalUnidades: preview.length,
        promedioAumento: preview.reduce((sum, p) => sum + p.Diferencia, 0) / preview.length,
        totalAumento: preview.reduce((sum, p) => sum + p.Diferencia, 0),
        unidades: preview,
      };

      return resumen;
    },
    enabled: !!projectId && !!adjustment,
    staleTime: 0, // No cache - siempre recalcular
  });
}

/**
 * Hook para aplicar ajuste de precios
 */
export function useApplyPriceAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      adjustment,
    }: {
      projectId: string;
      adjustment: PriceAdjustment;
    }) => {
      const units = await supabaseService.getUnitsByProject(projectId);

      // Filtrar unidades según aplicarA
      let unidadesAfectadas = units;
      if (adjustment.aplicarA === 'disponibles') {
        unidadesAfectadas = units.filter(u => u.Estado === 'Disponible');
      } else if (adjustment.aplicarA === 'selected' && adjustment.unidadesSeleccionadas) {
        unidadesAfectadas = units.filter(u =>
          adjustment.unidadesSeleccionadas!.includes(u.Id)
        );
      }

      // Aplicar ajuste a cada unidad
      const updates = unidadesAfectadas.map(async (unit) => {
        const precioActual = unit.PrecioLista || 0;
        let precioNuevo = precioActual;

        if (adjustment.tipo === 'percentage') {
          precioNuevo = precioActual * (1 + adjustment.valor / 100);
        } else {
          precioNuevo = precioActual + adjustment.valor;
        }

        try {
          await supabaseService.updateUnit(unit.Id, {
            PrecioLista: Math.round(precioNuevo),
          });
          return { success: true, unitId: unit.Id };
        } catch (error) {
          return { success: false, unitId: unit.Id, error: (error as Error).message };
        }
      });

      const results = await Promise.all(updates);

      const resultado: PriceUpdateResult = {
        success: results.every(r => r.success),
        unidadesActualizadas: results.filter(r => r.success).length,
        errores: results
          .filter(r => !r.success)
          .map(r => `Unidad ${r.unitId}: ${r.error}`),
      };

      return { resultado, projectId };
    },
    onSuccess: ({ resultado, projectId }) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: priceAdjustmentKeys.projectUnits(projectId)
      });
      queryClient.invalidateQueries({
        queryKey: ['units', 'project', projectId]
      });
      queryClient.invalidateQueries({
        queryKey: ['salesMap', 'project', projectId]
      });

      if (resultado.success) {
        toast.success(
          `Precios actualizados exitosamente (${resultado.unidadesActualizadas} unidades)`
        );
      } else {
        toast.warning(
          `Actualización parcial: ${resultado.unidadesActualizadas} de ${
            resultado.unidadesActualizadas + (resultado.errores?.length || 0)
          } unidades`
        );
      }
    },
    onError: (error: Error) => {
      toast.error(`Error al aplicar ajuste de precios: ${error.message}`);
    },
  });
}

/**
 * Hook para bulk price update (múltiples proyectos)
 */
export function useBulkPriceUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectIds,
      adjustment,
    }: {
      projectIds: string[];
      adjustment: PriceAdjustment;
    }) => {
      const results = await Promise.all(
        projectIds.map(async (projectId) => {
          try {
            const units = await supabaseService.getUnitsByProject(projectId);

            let unidadesAfectadas = units;
            if (adjustment.aplicarA === 'disponibles') {
              unidadesAfectadas = units.filter(u => u.Estado === 'Disponible');
            }

            await Promise.all(
              unidadesAfectadas.map(unit => {
                const precioActual = unit.PrecioLista || 0;
                const precioNuevo =
                  adjustment.tipo === 'percentage'
                    ? precioActual * (1 + adjustment.valor / 100)
                    : precioActual + adjustment.valor;

                return supabaseService.updateUnit(unit.Id, {
                  PrecioLista: Math.round(precioNuevo),
                });
              })
            );

            return {
              projectId,
              success: true,
              unidadesActualizadas: unidadesAfectadas.length,
            };
          } catch (error) {
            return {
              projectId,
              success: false,
              error: (error as Error).message,
            };
          }
        })
      );

      return results;
    },
    onSuccess: (results) => {
      // Invalidar todas las queries de unidades
      results.forEach(result => {
        if (result.success) {
          queryClient.invalidateQueries({
            queryKey: priceAdjustmentKeys.projectUnits(result.projectId)
          });
        }
      });

      const successful = results.filter(r => r.success).length;
      const total = results.length;

      if (successful === total) {
        toast.success(`Actualización masiva exitosa: ${total} proyectos`);
      } else {
        toast.warning(`Actualización parcial: ${successful}/${total} proyectos`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Error en actualización masiva: ${error.message}`);
    },
  });
}
