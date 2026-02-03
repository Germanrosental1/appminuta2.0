import { apiGet, apiPost } from '../lib/api-wrapper-client';

export interface Snapshot {
    id: string;
    fecha: string;
    tipo: 'DIARIO' | 'MENSUAL';
    datos: any;
    metadata: any;
}

export interface SnapshotComparativo {
    actual: Snapshot;
    anterior: Snapshot;
    diferencias: any;
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
     */
    async getRange(start: string, end: string, project_id?: string) {
        let url = `/snapshots/range?start=${start}&end=${end}`;
        if (project_id) url += `&project_id=${project_id}`;
        return apiGet<Snapshot[]>(url);
    },

    /**
     * Genera un comparativo entre dos fechas
     */
    async getComparativo(baseDate: string, comparisonDate: string, project_id: string) {
        const url = `/snapshots/comparativo?base=${baseDate}&comparison=${comparisonDate}&project_id=${project_id}`;
        return apiGet<SnapshotComparativo>(url);
    },

    /**
     * Fuerza la generación de un snapshot para el día actual
     */
    async generate(project_id: string) {
        return apiPost<Snapshot>(`/snapshots/generate`, { project_id });
    }
};
