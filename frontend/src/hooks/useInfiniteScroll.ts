import { useState, useMemo, useCallback } from 'react';
import { useAllMinutas } from './useMinutas';
import type { MinutaDefinitiva } from '@/services/minutas';

interface InfiniteScrollResult {
    data: MinutaDefinitiva[];
    isLoading: boolean;
    error: Error | null;
    hasMore: boolean;
    loadMore: () => void;
    totalItems: number;
    loadedItems: number;
}

/**
 * Hook para infinite scroll de minutas
 * Implementa paginación del lado del cliente usando los datos ya cacheados
 */
export function useInfiniteScroll(pageSize: number = 20): InfiniteScrollResult {
    // Obtener todas las minutas (ya optimizado con React Query)
    // useAllMinutas returns paginated data, extract the data array
    const { data: paginatedData, isLoading, error } = useAllMinutas(1, 1000); // Get all with large limit

    // Extract the array from paginated response
    const allMinutas = useMemo(() => {
        return paginatedData?.data ?? [];
    }, [paginatedData]);

    // Estado de cuántas páginas mostrar
    const [visiblePages, setVisiblePages] = useState(1);

    // Calcular total de páginas
    const totalPages = useMemo(() => {
        return Math.ceil(allMinutas.length / pageSize);
    }, [allMinutas.length, pageSize]);

    // Datos visibles hasta la página actual
    const visibleData = useMemo(() => {
        const endIndex = visiblePages * pageSize;
        return allMinutas.slice(0, endIndex);
    }, [allMinutas, visiblePages, pageSize]);

    // Función para cargar más
    const loadMore = useCallback(() => {
        if (visiblePages < totalPages) {
            setVisiblePages(prev => prev + 1);
        }
    }, [visiblePages, totalPages]);

    // Resetear cuando cambian los datos
    useMemo(() => {
        setVisiblePages(1);
    }, [allMinutas.length]);

    return {
        data: visibleData,
        isLoading,
        error,
        hasMore: visiblePages < totalPages,
        loadMore,
        totalItems: allMinutas.length,
        loadedItems: visibleData.length,
    };
}

