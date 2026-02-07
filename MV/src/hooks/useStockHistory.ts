import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '@/services/supabaseService';
import { toast } from 'sonner';

export interface SnapshotSummary {
  Id: string;
  FechaSnapshot: string;
  ProyectoId: string;
  TotalUnidades: number;
  Disponibles: number;
  Reservadas: number;
  Vendidas: number;
  NoDisponibles: number;
}

export interface SnapshotComparativo {
  Estado: string;
  Actual: number;
  Anterior: number;
  Diferencia: number;
  PorcentajeCambio: number;
}

// Query keys
export const stockHistoryKeys = {
  all: ['stockHistory'] as const,
  snapshots: (projectId: string) => ['stockHistory', 'snapshots', projectId] as const,
  snapshot: (snapshotId: string) => ['stockHistory', 'snapshot', snapshotId] as const,
  comparative: (projectId: string, snapshotIds: string[]) =>
    ['stockHistory', 'comparative', projectId, ...snapshotIds] as const,
};

/**
 * Hook para obtener todos los snapshots de un proyecto
 */
export function useSnapshots(projectId: string) {
  return useQuery({
    queryKey: stockHistoryKeys.snapshots(projectId),
    queryFn: async () => {
      if (!projectId) return [];

      const snapshots = await supabaseService.getSnapshotsByProject(projectId);
      return snapshots;
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutos - datos históricos cambian poco
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
}

/**
 * Hook para obtener un snapshot específico
 */
export function useSnapshot(snapshotId: string) {
  return useQuery({
    queryKey: stockHistoryKeys.snapshot(snapshotId),
    queryFn: async () => {
      const snapshot = await supabaseService.getSnapshotById(snapshotId);
      return snapshot;
    },
    enabled: !!snapshotId,
    staleTime: 15 * 60 * 1000, // 15 minutos
  });
}

/**
 * Hook para comparar dos snapshots
 */
export function useSnapshotComparison(
  projectId: string,
  snapshot1Id: string,
  snapshot2Id: string
) {
  return useQuery({
    queryKey: stockHistoryKeys.comparative(projectId, [snapshot1Id, snapshot2Id]),
    queryFn: async () => {
      if (!snapshot1Id || !snapshot2Id) return [];

      // Obtener ambos snapshots
      const [snapshot1, snapshot2] = await Promise.all([
        supabaseService.getSnapshotById(snapshot1Id),
        supabaseService.getSnapshotById(snapshot2Id),
      ]);

      // Calcular comparativo
      const estados = ['Disponible', 'Reservado', 'Vendido', 'No disponible'];
      const comparativo: SnapshotComparativo[] = estados.map(estado => {
        const actual = snapshot1[estado] || 0;
        const anterior = snapshot2[estado] || 0;
        const diferencia = actual - anterior;
        const porcentajeCambio =
          anterior > 0 ? ((diferencia / anterior) * 100) : 0;

        return {
          Estado: estado,
          Actual: actual,
          Anterior: anterior,
          Diferencia: diferencia,
          PorcentajeCambio: porcentajeCambio,
        };
      });

      return comparativo;
    },
    enabled: !!snapshot1Id && !!snapshot2Id,
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Hook para crear un nuevo snapshot
 */
export function useCreateSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      // Obtener unidades actuales del proyecto
      const units = await supabaseService.getUnitsByProject(projectId);

      // Calcular estadísticas
      const snapshot: Partial<SnapshotSummary> = {
        ProyectoId: projectId,
        FechaSnapshot: new Date().toISOString(),
        TotalUnidades: units.length,
        Disponibles: units.filter(u => u.Estado === 'Disponible').length,
        Reservadas: units.filter(u => u.Estado === 'Reservado').length,
        Vendidas: units.filter(u => u.Estado === 'Vendido').length,
        NoDisponibles: units.filter(u => u.Estado === 'No disponible').length,
      };

      // Guardar snapshot
      const created = await supabaseService.createSnapshot(snapshot);
      return created;
    },
    onSuccess: (data) => {
      // Invalidar queries de snapshots
      queryClient.invalidateQueries({
        queryKey: stockHistoryKeys.snapshots(data.ProyectoId)
      });
      queryClient.invalidateQueries({ queryKey: stockHistoryKeys.all });

      toast.success('Snapshot creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear snapshot: ${error.message}`);
    },
  });
}

/**
 * Hook para eliminar un snapshot
 */
export function useDeleteSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (snapshotId: string) => {
      await supabaseService.deleteSnapshot(snapshotId);
      return snapshotId;
    },
    onSuccess: () => {
      // Invalidar todas las queries de snapshots
      queryClient.invalidateQueries({ queryKey: stockHistoryKeys.all });

      toast.success('Snapshot eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar snapshot: ${error.message}`);
    },
  });
}

/**
 * Hook para análisis de tendencias (últimos N snapshots)
 */
export function useStockTrends(projectId: string, limit: number = 10) {
  return useQuery({
    queryKey: [...stockHistoryKeys.snapshots(projectId), 'trends', limit],
    queryFn: async () => {
      const snapshots = await supabaseService.getSnapshotsByProject(projectId);

      // Ordenar por fecha descendente y tomar los últimos N
      const recent = snapshots
        .sort((a, b) =>
          new Date(b.FechaSnapshot).getTime() - new Date(a.FechaSnapshot).getTime()
        )
        .slice(0, limit);

      // Calcular tendencias
      const trends = {
        snapshots: recent,
        avgDisponibles: recent.reduce((sum, s) => sum + s.Disponibles, 0) / recent.length,
        avgVendidas: recent.reduce((sum, s) => sum + s.Vendidas, 0) / recent.length,
        tendenciaVentas: recent.length > 1
          ? recent[0].Vendidas - recent[recent.length - 1].Vendidas
          : 0,
      };

      return trends;
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  });
}
