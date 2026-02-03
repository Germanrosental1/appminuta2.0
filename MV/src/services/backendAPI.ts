import { apiGet, apiPatch, apiPost } from '../lib/api-wrapper-client';

/**
 * Service for making authenticated requests to the NestJS backend
 */
class BackendAPI {
    /**
     * Update a complete unit (all fields across normalized tables)
     */
    async updateUnitComplete(id: string, unitData: any) {
        return apiPatch<any>(`/unidades/${id}/complete`, unitData);
    }

    /**
     * Get units by sector ID
     */
    async getUnitBySectorId(sectorId: string) {
        return apiGet<any>(`/unidades/by-sectorid/${sectorId}`);
    }

    /**
     * Get projects accessible by current user based on organization and role
     */
    async getMyProjects() {
        const projects = await apiGet<any[]>(`/proyectos/my-projects`);

        // Transform PascalCase keys from backend to camelCase for frontend
        return projects.map((p: any) => ({
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
        return apiPost<any>(`/unidades/import`, formData);
    }

    /**
     * Create a complete unit (all fields across normalized tables)
     */
    async createUnitComplete(unitData: any) {
        return apiPost<any>(`/unidades`, unitData);
    }

    async getUnitTypes(projectId?: string) {
        if (projectId) {
            return apiGet<any[]>(`/tipos-unidad/proyecto/${projectId}`);
        }
        return apiGet<any[]>(`/tipos-unidad`);
    }

    async getBuildings(projectId: string) {
        return apiGet<any[]>(`/edificios/proyecto/${projectId}`);
    }

    async getStages() {
        return apiGet<any[]>(`/etapas`);
    }

    async getCommercialStates() {
        return apiGet<any[]>(`/estado-comercial`);
    }

    async getCommercials() {
        return apiGet<any[]>(`/comerciales`);
    }

    /**
     * Get gastos generales for a project
     */
    async getGastosGenerales(projectId: string) {
        try {
            return await apiGet<any>(`/gastosgenerales/proyecto/${projectId}`);
        } catch (error: any) {
            if (error.message.includes('404')) return null;
            throw error;
        }
    }

    /**
     * Update gastos generales for a project
     */
    async updateGastosGenerales(projectId: string, gastosData: any) {
        return apiPatch<any>(`/gastosgenerales/proyecto/${projectId}`, gastosData);
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
