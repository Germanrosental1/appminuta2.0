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

export const snapshotsAPI = {
    /**
     * Obtiene el snapshot para una fecha específica
     */
    async getByDate(date: string, project_id?: string) {
        let url = `/snapshots/date/${date}`;
        if (project_id) url += `?project_id=${project_id}`;
        return apiGet<Snapshot>(url);
    },

    /**
     * Obtiene snapshots en un rango de fechas
     * Retorna resumen agregado por proyecto/fecha
     */
    async getRange(start: string, end: string, project_id?: string) {
        let url = `/snapshots/range?start=${start}&end=${end}`;
        if (project_id) url += `&project_id=${project_id}`;
        return apiGet<SnapshotSummary[]>(url);
    },

    /**
     * Genera un comparativo entre dos fechas para todos los proyectos
     */
    async getComparativo(baseDate: string, comparisonDate: string, project_id?: string) {
        let url = `/snapshots/comparativo?base=${baseDate}&comparison=${comparisonDate}`;
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
