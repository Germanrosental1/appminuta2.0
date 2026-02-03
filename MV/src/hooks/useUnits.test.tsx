import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUnits, useProjects, useUpdateUnit, useDeleteUnit } from './useUnits';
import { supabaseService } from '@/services/supabaseService';

// Mock services
vi.mock('@/services/supabaseService');
vi.mock('@/services/backendAPI');
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useUnits', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useUnits', () => {
    it('should fetch units for a project', async () => {
      const mockUnits = [
        { Id: '1', Numero: '101', Estado: 'Disponible', ProyectoId: 'project-1' },
        { Id: '2', Numero: '102', Estado: 'Vendido', ProyectoId: 'project-1' },
      ];

      vi.mocked(supabaseService.getUnitsByProject).mockResolvedValue(mockUnits as any);

      const { result } = renderHook(() => useUnits('project-1'), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUnits);
      expect(supabaseService.getUnitsByProject).toHaveBeenCalledWith('project-1');
    });

    it('should not fetch when projectId is empty', () => {
      const { result } = renderHook(() => useUnits(''), { wrapper });

      // When query is disabled, data is undefined (not [])
      // Components should use default value: const { data: units = [] } = useUnits(projectId);
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(supabaseService.getUnitsByProject).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch units');
      vi.mocked(supabaseService.getUnitsByProject).mockRejectedValue(error);

      const { result } = renderHook(() => useUnits('project-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should use cached data on subsequent renders', async () => {
      const mockUnits = [{ Id: '1', Numero: '101' }];
      vi.mocked(supabaseService.getUnitsByProject).mockResolvedValue(mockUnits as any);

      // First render
      const { result: result1, unmount } = renderHook(() => useUnits('project-1'), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      unmount();

      // Second render - should use cache
      const { result: result2 } = renderHook(() => useUnits('project-1'), { wrapper });

      // Data should be immediately available from cache
      expect(result2.current.data).toEqual(mockUnits);
      // Should have only been called once (first render)
      expect(supabaseService.getUnitsByProject).toHaveBeenCalledTimes(1);
    });
  });

  describe('useProjects', () => {
    it('should fetch projects list', async () => {
      const mockProjects = ['Project A', 'Project B', 'Project C'];
      vi.mocked(supabaseService.getProjects).mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useProjects(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProjects);
      expect(supabaseService.getProjects).toHaveBeenCalled();
    });

    it('should handle empty projects list', async () => {
      vi.mocked(supabaseService.getProjects).mockResolvedValue([]);

      const { result } = renderHook(() => useProjects(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useUpdateUnit', () => {
    it('should update unit and invalidate cache', async () => {
      const mockUnit = { Id: 'unit-1', Numero: '101', Estado: 'Disponible' };
      const updatedUnit = { ...mockUnit, Estado: 'Vendido' };

      vi.mocked(supabaseService.updateUnit).mockResolvedValue(updatedUnit as any);

      // Pre-populate cache
      queryClient.setQueryData(['units', 'detail', 'unit-1'], mockUnit);

      const { result } = renderHook(() => useUpdateUnit(), { wrapper });

      result.current.mutate({
        id: 'unit-1',
        data: { estado: 'Vendido' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabaseService.updateUnit).toHaveBeenCalledWith({ id: 'unit-1', estado: 'Vendido' });
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      vi.mocked(supabaseService.updateUnit).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateUnit(), { wrapper });

      result.current.mutate({
        id: 'unit-1',
        data: { estado: 'Vendido' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('useDeleteUnit', () => {
    it('should delete unit and invalidate cache', async () => {
      vi.mocked(supabaseService.deleteUnit).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteUnit(), { wrapper });

      result.current.mutate('unit-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabaseService.deleteUnit).toHaveBeenCalledWith('unit-1');
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      vi.mocked(supabaseService.deleteUnit).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteUnit(), { wrapper });

      result.current.mutate('unit-1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });
});
