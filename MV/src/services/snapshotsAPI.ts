export interface SnapshotSummary {
    Id: string;
    FechaSnapshot: string;
    TipoSnapshot: 'DIARIO' | 'MENSUAL';
    ProyectoId: string | null;
    TotalUnidades: number;
    Disponibles: number;
    Reservadas: number;
    Vendidas: number;
    NoDisponibles: number;
    ValorStockUSD: number | null;
    M2TotalesStock: number | null;
    Proyecto?: {
        Id: string;
        Nombre: string;
    };
}

export interface SnapshotComparativo {
    proyecto: string;
    actual: {
        disponibles: number;
        reservadas: number;
        vendidas: number;
        valorStock: number | null;
    };
    anterior: {
        disponibles: number;
        reservadas: number;
        vendidas: number;
        valorStock: number | null;
    } | null;
    diferencia: {
        disponibles: number;
        reservadas: number;
        vendidas: number;
    } | null;
}

export const snapshotsAPI = {
    /**
     * Get snapshot for a specific date
     */
    async getByDate(fecha: string): Promise<SnapshotSummary[]> {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/snapshots?fecha=${fecha}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
            },
        });
        if (!response.ok) throw new Error('Error fetching snapshot');
        return response.json();
    },

    /**
     * Get snapshots in a date range
     */
    async getRange(desde: string, hasta: string): Promise<SnapshotSummary[]> {
        const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/snapshots/range?desde=${desde}&hasta=${hasta}`,
            {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                },
            }
        );
        if (!response.ok) throw new Error('Error fetching snapshots range');
        return response.json();
    },

    /**
     * Get comparison between two dates
     */
    async getComparativo(mesActual: string, mesAnterior: string): Promise<SnapshotComparativo[]> {
        const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/snapshots/comparativo?mesActual=${mesActual}&mesAnterior=${mesAnterior}`,
            {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                },
            }
        );
        if (!response.ok) throw new Error('Error fetching comparativo');
        return response.json();
    },

    /**
     * Generate a manual snapshot
     */
    async generate(tipo: 'DIARIO' | 'MENSUAL' = 'DIARIO'): Promise<any> {
        const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/snapshots/generate?tipo=${tipo}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                },
            }
        );
        if (!response.ok) throw new Error('Error generating snapshot');
        return response.json();
    },
};
