import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    useMinutas,
    useMinuta,
    useUpdateMinutaEstado,
    useSaveMinuta,
    useDeleteMinuta,
} from '@/hooks/useMinutas';
import { ReactNode } from 'react';
import * as minutasService from '@/services/minutas';

// Mock Minutas Service
vi.mock('@/services/minutas', () => ({
    getMinutasDefinitivasByUsuario: vi.fn(),
    getMinutaDefinitivaById: vi.fn(),
    actualizarEstadoMinutaDefinitiva: vi.fn(),
    guardarMinutaDefinitiva: vi.fn(),
    deleteMinuta: vi.fn(),
    getMinutasWithFilters: vi.fn(),
}));

const mockMinutas = [
    { Id: '1', Estado: 'pendiente', Proyecto: 'proyecto-1' },
    { Id: '2', Estado: 'aprobada', Proyecto: 'proyecto-1' },
];

describe('useMinutas', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        });
        vi.clearAllMocks();
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    describe('useMinutas Query', () => {
        it('should fetch minutas when userId is provided', async () => {
            const userId = 'user-123';
            vi.mocked(minutasService.getMinutasDefinitivasByUsuario).mockResolvedValue(mockMinutas as any);

            const { result } = renderHook(() => useMinutas(userId), { wrapper });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(result.current.data).toEqual(mockMinutas);
            expect(minutasService.getMinutasDefinitivasByUsuario).toHaveBeenCalledWith(userId, undefined);
        });

        it('should not fetch when userId is undefined', () => {
            renderHook(() => useMinutas(undefined), { wrapper });

            expect(minutasService.getMinutasDefinitivasByUsuario).not.toHaveBeenCalled();
        });

        it('should pass filters to API', async () => {
            const userId = 'user-123';
            const filters = { estado: 'aprobada', proyecto: 'proyecto-1' };
            vi.mocked(minutasService.getMinutasDefinitivasByUsuario).mockResolvedValue(mockMinutas as any);

            renderHook(() => useMinutas(userId, filters), { wrapper });

            await waitFor(() => {
                expect(minutasService.getMinutasDefinitivasByUsuario).toHaveBeenCalledWith(userId, filters);
            });
        });
    });

    describe('useMinuta Query', () => {
        it('should fetch single minuta when ID is provided', async () => {
            const minutaId = 'minuta-123';
            const mockMinuta = { Id: minutaId, Estado: 'pendiente' };
            vi.mocked(minutasService.getMinutaDefinitivaById).mockResolvedValue(mockMinuta as any);

            const { result } = renderHook(() => useMinuta(minutaId), { wrapper });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(result.current.data).toEqual(mockMinuta);
            expect(minutasService.getMinutaDefinitivaById).toHaveBeenCalledWith(minutaId);
        });

        it('should not fetch when minutaId is null', () => {
            renderHook(() => useMinuta(null), { wrapper });

            expect(minutasService.getMinutaDefinitivaById).not.toHaveBeenCalled();
        });
    });

    describe('useUpdateMinutaEstado Mutation', () => {
        it('should update minuta estado', async () => {
            const mockUpdated = { Id: '1', Estado: 'aprobada' };
            vi.mocked(minutasService.actualizarEstadoMinutaDefinitiva).mockResolvedValue(mockUpdated as any);

            const { result } = renderHook(() => useUpdateMinutaEstado(), { wrapper });

            result.current.mutate({
                id: '1',
                estado: 'aprobada',
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(minutasService.actualizarEstadoMinutaDefinitiva).toHaveBeenCalledWith('1', 'aprobada', undefined);
        });

        it('should handle comentarios in estado update', async () => {
            const mockUpdated = { Id: '1', Estado: 'cancelada' };
            vi.mocked(minutasService.actualizarEstadoMinutaDefinitiva).mockResolvedValue(mockUpdated as any);

            const { result } = renderHook(() => useUpdateMinutaEstado(), { wrapper });

            result.current.mutate({
                id: '1',
                estado: 'cancelada',
                comentarios: 'Proyecto cancelado',
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(minutasService.actualizarEstadoMinutaDefinitiva).toHaveBeenCalledWith(
                '1',
                'cancelada',
                'Proyecto cancelado'
            );
        });

        it('should invalidate queries on success', async () => {
            vi.mocked(minutasService.actualizarEstadoMinutaDefinitiva).mockResolvedValue({} as any);

            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

            const { result } = renderHook(() => useUpdateMinutaEstado(), { wrapper });

            result.current.mutate({ id: '1', estado: 'aprobada' });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(invalidateSpy).toHaveBeenCalled();
        });
    });

    describe('useSaveMinuta Mutation', () => {
        it('should save new minuta', async () => {
            const newMinuta = { Estado: 'pendiente', Proyecto: 'proyecto-1' };
            const mockSaved = { Id: 'new-id', ...newMinuta };
            vi.mocked(minutasService.guardarMinutaDefinitiva).mockResolvedValue(mockSaved as any);

            const { result } = renderHook(() => useSaveMinuta(), { wrapper });

            result.current.mutate(newMinuta as any);

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(minutasService.guardarMinutaDefinitiva).toHaveBeenCalledWith(newMinuta);
            expect(result.current.data).toEqual(mockSaved);
        });

        it('should invalidate queries on success', async () => {
            vi.mocked(minutasService.guardarMinutaDefinitiva).mockResolvedValue({} as any);

            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

            const { result } = renderHook(() => useSaveMinuta(), { wrapper });

            result.current.mutate({} as any);

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(invalidateSpy).toHaveBeenCalled();
        });
    });

    describe('useDeleteMinuta Mutation', () => {
        it('should delete minuta by ID', async () => {
            vi.mocked(minutasService.deleteMinuta).mockResolvedValue(undefined as any);

            const { result } = renderHook(() => useDeleteMinuta(), { wrapper });

            result.current.mutate('minuta-to-delete');

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(minutasService.deleteMinuta).toHaveBeenCalledWith('minuta-to-delete');
        });

        it('should remove minuta from cache on success', async () => {
            vi.mocked(minutasService.deleteMinuta).mockResolvedValue(undefined as any);

            const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');

            const { result } = renderHook(() => useDeleteMinuta(), { wrapper });

            result.current.mutate('minuta-123');

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(removeQueriesSpy).toHaveBeenCalledWith({
                queryKey: ['minutas', 'definitiva', 'minuta-123'],
            });
        });
    });
});
