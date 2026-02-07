import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Datos considerados "frescos" por 5 minutos
            staleTime: 5 * 60 * 1000,
            // Mantener en caché por 10 minutos después de no usarse
            gcTime: 10 * 60 * 1000,
            // Reintentar solo 1 vez en caso de error
            retry: 1,
            // No refetch automático al enfocar ventana (evita requests innecesarios)
            refetchOnWindowFocus: false,
            // Sí refetch al reconectar (importante para datos críticos)
            refetchOnReconnect: true,
        },
        mutations: {
            // Reintentar mutaciones fallidas 1 vez
            retry: 1,
        },
    },
});
