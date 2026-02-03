import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { snapshotsAPI } from '@/services/snapshotsAPI';
import { toast } from 'sonner';

// Query keys
export const snapshotsKeys = {
  all: ['snapshots'] as const,
  byDate: (date: string, projectId?: string) =>
    [...snapshotsKeys.all, 'date', date, projectId] as const,
  range: (start: string, end: string, projectId?: string) =>
    [...snapshotsKeys.all, 'range', start, end, projectId] as const,
  comparativo: (baseDate: string, comparisonDate: string, projectId: string) =>
    [...snapshotsKeys.all, 'comparativo', baseDate, comparisonDate, projectId] as const,
};

/**
 * Hook para obtener snapshot de una fecha específica
 */
export function useSnapshotByDate(date: string, projectId?: string) {
  return useQuery({
    queryKey: snapshotsKeys.byDate(date, projectId),
    queryFn: async () => {
      const snapshot = await snapshotsAPI.getByDate(date, projectId);
      return snapshot;
    },
    enabled: !!date,
    staleTime: 15 * 60 * 1000, // 15 minutos - datos históricos
    gcTime: 60 * 60 * 1000, // 1 hora
  });
}

/**
 * Hook para obtener snapshots en un rango de fechas
 */
export function useSnapshotsRange(start: string, end: string, projectId?: string) {
  return useQuery({
    queryKey: snapshotsKeys.range(start, end, projectId),
    queryFn: async () => {
      if (!start || !end) return [];

      const snapshots = await snapshotsAPI.getRange(start, end, projectId);
      return snapshots;
    },
    enabled: !!start && !!end,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
}

/**
 * Hook para obtener comparativo entre dos fechas
 */
export function useSnapshotComparativo(
  baseDate: string,
  comparisonDate: string,
  projectId: string
) {
  return useQuery({
    queryKey: snapshotsKeys.comparativo(baseDate, comparisonDate, projectId),
    queryFn: async () => {
      if (!baseDate || !comparisonDate || !projectId) return null;

      const comparativo = await snapshotsAPI.getComparativo(baseDate, comparisonDate, projectId);
      return comparativo;
    },
    enabled: !!baseDate && !!comparisonDate && !!projectId,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook para generar un nuevo snapshot
 */
export function useGenerateSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tipo: 'DIARIO' | 'MENSUAL') => {
      const snapshot = await snapshotsAPI.generate(tipo);
      return snapshot;
    },
    onSuccess: () => {
      // Invalidar todas las queries de snapshots para refrescar los datos
      queryClient.invalidateQueries({ queryKey: snapshotsKeys.all });

      toast.success('Snapshot generado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al generar snapshot: ${error.message}`);
    },
  });
}

/**
 * Hook para obtener snapshots con período seleccionable (helper)
 */
export function useSnapshotsWithPeriod(
  periodMonths: number = 6,
  projectId?: string
) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - periodMonths);

  const endStr = end.toISOString().split('T')[0];
  const startStr = start.toISOString().split('T')[0];

  return useSnapshotsRange(startStr, endStr, projectId);
}
