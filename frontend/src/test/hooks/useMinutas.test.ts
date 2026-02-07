import { renderHook, waitFor } from '@testing-library/react';
import { useMinutas } from '@/hooks/useMinutas';
import { createWrapper } from '../utils';
import { getMinutasDefinitivasByUsuario } from '@/services/minutas';
import { vi, describe, it, expect } from 'vitest';
import type { MinutaDefinitiva } from '@/services/minutas';

// Mock the service module
vi.mock('@/services/minutas', () => ({
    getMinutasDefinitivasByUsuario: vi.fn(),
}));

describe('useMinutas Hook', () => {
    it('should fetch and return minutas', async () => {
        const mockMinutas: Partial<MinutaDefinitiva>[] = [
            { Id: '1', Proyecto: 'Proyecto 1', Estado: 'pendiente' },
            { Id: '2', Proyecto: 'Proyecto 2', Estado: 'aprobada' },
        ];

        // Setup mock return
        vi.mocked(getMinutasDefinitivasByUsuario).mockResolvedValue(mockMinutas as MinutaDefinitiva[]);

        const { result } = renderHook(() => useMinutas('user123'), {
            wrapper: createWrapper(),
        });

        // Initial loading state
        expect(result.current.isLoading).toBe(true);

        // Wait for data
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(2);
        expect(result.current.data).toEqual(mockMinutas);
    });

    it('should not query if no userId is provided', () => {
        const { result } = renderHook(() => useMinutas(undefined), {
            wrapper: createWrapper(),
        });

        // Should stay paused/idle or just not fetch
        expect(result.current.isPending).toBe(true);
        // fetchStatus is 'idle' when disabled, check docs if needed, or check that data is undefined
        expect(result.current.data).toBeUndefined();
    });
});
