import { apiGet, apiPatch, apiPost } from '../lib/api-wrapper-client';
import { GastosGenerales } from '../types/api-response.types';

/**
 * Service for making authenticated requests to the NestJS backend
 */
class BackendAPI {
    // ... imports above

    // ... (skipping unchanged parts)


    /**
     * Update a complete unit (all fields across normalized tables)
     */
    async updateUnitComplete(id: string, unitData: Record<string, unknown>) {
        return apiPatch<unknown>(`/unidades/${id}/complete`, unitData);
    }

    /**
     * Get units by sector ID
     */
    async getUnitBySectorId(sectorId: string) {
        return apiGet<unknown>(`/unidades/by-sectorid/${sectorId}`);
    }

    /**
     * Get projects accessible by current user based on organization and role
     */
    async getMyProjects() {
        const projects = await apiGet<any[]>(`/proyectos/my-projects`);

        // Transform PascalCase keys from backend to camelCase for frontend
        return projects.map((p: { Id: string; Nombre: string; Descripcion?: string; Naturaleza?: string; Direccion?: string; Localidad?: string; Provincia?: string; Activo?: boolean; Iva?: number; IdOrg?: string; CreatedAt?: string; organizacion?: unknown }) => ({
            id: p.Id,
            nombre: p.Nombre,
            descripcion: p.Descripcion,
            naturaleza: p.Naturaleza,
            direccion: p.Direccion,
            localidad: p.Localidad,
            provincia: p.Provincia,
            activo: p.Activo,
            iva: p.Iva,
            idOrg: p.IdOrg,
            createdAt: p.CreatedAt,
            organizacion: p.organizacion, // Backend transforms Organizaciones -> organizacion
        }));
    }

    /**
     * Import units from Excel file
     */
    async importUnits(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        return apiPost<unknown>(`/unidades/import`, formData);
    }

    /**
     * Create a complete unit (all fields across normalized tables)
     */
    async createUnitComplete(unitData: Record<string, unknown>) {
        return apiPost<unknown>(`/unidades`, unitData);
    }

    async getUnitTypes(projectId?: string) {
        if (projectId) {
            return apiGet<unknown[]>(`/tipos-unidad/proyecto/${projectId}`);
        }
        return apiGet<unknown[]>(`/tipos-unidad`);
    }

    async getBuildings(projectId: string) {
        return apiGet<unknown[]>(`/edificios/proyecto/${projectId}`);
    }

    async getStages() {
        return apiGet<unknown[]>(`/etapas`);
    }

    async getCommercialStates() {
        return apiGet<unknown[]>(`/estado-comercial`);
    }

    async getCommercials() {
        return apiGet<unknown[]>(`/comerciales`);
    }

    /**
     * Get gastos generales for a project
     */
    /**
     * Get gastos generales for a project
     */
    async getGastosGenerales(projectId: string) {
        try {
            return await apiGet<GastosGenerales>(`/gastosgenerales/proyecto/${projectId}`);
        } catch (error: unknown) {
            if (error instanceof Error && error.message.includes('404')) return null;
            throw error;
        }
    }

    /**
     * Update gastos generales for a project
     */
    async updateGastosGenerales(projectId: string, gastosData: GastosGenerales) {
        return apiPatch<GastosGenerales>(`/gastosgenerales/proyecto/${projectId}`, gastosData);
    }

    /**
     * Adjust prices for all units in selected projects
     */
    async adjustPrices(
        projectIds: string[],
        mode: string,
        percentage?: number,
        fixedValue?: number
    ) {
        return apiPatch<any>(`/unidades/adjust-prices`, { projectIds, mode, percentage, fixedValue });
    }
}

export const backendAPI = new BackendAPI();
