import { render, screen, waitFor } from '@testing-library/react';
import { ListaMinutasDefinitivasAdmin } from '@/components/minutas/ListaMinutasDefinitivasAdmin';
import { createWrapper } from '../utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as useMinutasHook from '@/hooks/useMinutas';
import { MemoryRouter } from 'react-router-dom';
import type { MinutaDefinitiva } from '@/services/minutas';

// Mock child components if complex (optional, but virtualization handles MinutaDefinitivaRow fine)
// We'll let it render to test integration

// Mock hooks
vi.mock('@/hooks/useMinutas', async () => {
    const actual = await vi.importActual('@/hooks/useMinutas');
    return {
        ...actual,
        useAllMinutas: vi.fn(),
        useUpdateMinutaEstado: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    };
});

// Mock react-virtual
vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: vi.fn(({ count }) => ({
        getVirtualItems: () => {
            const items = [];
            // Limit to a few items to avoid huge lists in tests if count is large
            const limit = Math.min(count, 10);
            for (let i = 0; i < limit; i++) {
                items.push({ index: i, start: i * 73, end: (i + 1) * 73, size: 73, key: i, lane: 0 });
            }
            return items;
        },
        getTotalSize: () => count * 73,
        scrollToIndex: vi.fn(),
    })),
}));

describe('ListaMinutasDefinitivasAdmin', () => {
    const QueryWrapper = createWrapper();

    const mockMinutas: MinutaDefinitiva[] = [
        {
            Id: '1',
            ProyectoNombre: 'Proyecto A',
            UnidadId: 'U101',
            CreadoPor: 'user1',
            users: { email: 'user1@example.com' },
            FechaCreacion: new Date('2024-01-01').toISOString(),
            Estado: 'pendiente',
            Dato: {} as any,
            // Add other required fields if strictly typed
            Numero: '1',
            Tipo: 'Definitiva',
            ProyectoId: 'proj1',
            ClienteRut: '123',
            ClienteNombre: 'Client',
            PrecioTotal: 100,
            CreatedAt: new Date().toISOString(),
            UpdatedAt: new Date().toISOString()
        },
        {
            Id: '2',
            ProyectoNombre: 'Proyecto B',
            UnidadId: 'U202',
            CreadoPor: 'user2',
            users: { email: 'user2@example.com' },
            FechaCreacion: new Date('2024-01-02').toISOString(),
            Estado: 'aprobada',
            Dato: {} as any,
            Numero: '2',
            Tipo: 'Definitiva',
            ProyectoId: 'proj2',
            ClienteRut: '456',
            ClienteNombre: 'Client 2',
            PrecioTotal: 200,
            CreatedAt: new Date().toISOString(),
            UpdatedAt: new Date().toISOString()
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially', () => {
        // Mock loading
        vi.mocked(useMinutasHook.useAllMinutas).mockReturnValue({
            isLoading: true,
            data: undefined,
            error: null,
        } as any);

        const { container } = render(
            <MemoryRouter>
                <QueryWrapper>
                    <ListaMinutasDefinitivasAdmin />
                </QueryWrapper>
            </MemoryRouter>
        );

        // Check for spinner class
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });

    it('renders list of minutas when data is loaded', async () => {
        // Mock success
        vi.mocked(useMinutasHook.useAllMinutas).mockReturnValue({
            isLoading: false,
            data: {
                data: mockMinutas,
                total: 2,
                totalPages: 1,
                page: 1,
                limit: 20
            },
            error: null,
        } as any);

        render(
            <MemoryRouter>
                <QueryWrapper>
                    <ListaMinutasDefinitivasAdmin />
                </QueryWrapper>
            </MemoryRouter>
        );

        // Look for project names
        await waitFor(() => {
            expect(screen.getByText('Proyecto A')).toBeInTheDocument();
            expect(screen.getByText('Proyecto B')).toBeInTheDocument();
        });
    });

    it('renders empty state when no data found', async () => {
        // Mock empty
        vi.mocked(useMinutasHook.useAllMinutas).mockReturnValue({
            isLoading: false,
            data: {
                data: [],
                total: 0,
                totalPages: 0,
                page: 1,
                limit: 20
            },
            error: null,
        } as any);

        render(
            <MemoryRouter>
                <QueryWrapper>
                    <ListaMinutasDefinitivasAdmin />
                </QueryWrapper>
            </MemoryRouter>
        );

        expect(screen.getByText('No se encontraron minutas')).toBeInTheDocument();
    });
});
