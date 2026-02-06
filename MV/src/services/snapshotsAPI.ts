import { apiGet, apiPost } from '../lib/api-wrapper-client';

// Tipo base para snapshot individual
export interface Snapshot {
    id: string;
    fecha: string;
    tipo: 'DIARIO' | 'MENSUAL';
    datos: Record<string, unknown>;
    metadata: Record<string, unknown>;
}

// Tipo para resumen de snapshots usado en StockHistoryPage
export interface SnapshotSummary {
    FechaSnapshot: string;
    Proyecto: string;
    ProyectoId: string;
    Disponibles: number;
    Reservadas: number;
    Vendidas: number;
    NoDisponibles: number;
    Total: number;
}

// Datos de snapshot por proyecto para comparativo
export interface SnapshotProyectoData {
    disponibles: number;
    reservadas: number;
    vendidas: number;
    noDisponibles: number;
    total: number;
}

// Comparativo entre dos períodos
export interface SnapshotComparativo {
    proyecto: string;
    proyectoId: string;
    actual: SnapshotProyectoData;
    anterior: SnapshotProyectoData | null;
    diferencia: SnapshotProyectoData | null;
}

// Datos de evolución de stock
export interface EvolutionData {
    fecha: string;
    disponibles: number;
    reservadas: number;
    vendidas: number;
}

export const snapshotsAPI = {
    /**
     * Obtiene el snapshot para una fecha específica
     */
    /**
     * Obtiene el snapshot para una fecha específica
     */
    async getByDate(date: string, project_id?: string) {
        let url = `/snapshots?fecha=${date}`;
        // Note: Backend might not support project_id yet, but keeping it in query just in case it's added
        if (project_id) url += `&project_id=${project_id}`;
        return apiGet<Snapshot>(url);
    },

    /**
     * Obtiene snapshots en un rango de fechas
     * Retorna resumen agregado por proyecto/fecha
     */
    async getRange(start: string, end: string, project_id?: string) {
        let url = `/snapshots/range?desde=${start}&hasta=${end}`;
        if (project_id) url += `&project_id=${project_id}`;
        return apiGet<SnapshotSummary[]>(url);
    },

    /**
     * Obtiene evolución agregada del stock para gráficos
     * Optimizado para reducir payload
     */
    async getStockEvolution(start: string, end: string) {
        const url = `/snapshots/analytics/evolution?desde=${start}&hasta=${end}`;
        return apiGet<EvolutionData[]>(url);
    },

    /**
     * Genera un comparativo entre dos fechas para todos los proyectos
     */
    async getComparativo(baseDate: string, comparisonDate: string, project_id?: string) {
        let url = `/snapshots/comparativo?mesActual=${baseDate}&mesAnterior=${comparisonDate}`;
        if (project_id) url += `&project_id=${project_id}`;
        return apiGet<SnapshotComparativo[]>(url);
    },

    /**
     * Fuerza la generación de un snapshot para el día actual
     */
    async generate(tipo: 'DIARIO' | 'MENSUAL' = 'DIARIO') {
        return apiPost<Snapshot>(`/snapshots/generate`, { tipo });
    }
};
