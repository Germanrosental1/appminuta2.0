import { supabase } from '@/lib/supabase';

/**
 * Service for making authenticated requests to the NestJS backend
 */
class BackendAPI {
    private readonly baseURL: string;

    constructor() {
        this.baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    }

    /**
     * Get auth token from Supabase session
     */
    private async getAuthToken(): Promise<string | null> {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
    }

    /**
     * Update a complete unit (all fields across normalized tables)
     */
    async updateUnitComplete(id: string, unitData: any) {
        try {
            const token = await this.getAuthToken();
            if (!token) {
                throw new Error('No authentication token available');
            }

            const response = await fetch(`${this.baseURL}/unidades/${id}/complete`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(unitData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating unit:', error);
            throw error;
        }
    }

    /**
     * Get units by sector ID
     */
    async getUnitBySectorId(sectorId: string) {
        try {
            const token = await this.getAuthToken();
            if (!token) {
                throw new Error('No authentication token available');
            }

            const response = await fetch(`${this.baseURL}/unidades/by-sectorid/${sectorId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching unit:', error);
            throw error;
        }
    }

    /**
     * Get projects accessible by current user based on organization and role
     */
    async getMyProjects() {
        try {
            const token = await this.getAuthToken();
            if (!token) {
                throw new Error('No authentication token available');
            }

            const response = await fetch(`${this.baseURL}/proyectos/my-projects`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const projects = await response.json();

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
                organizacion: p.organizacion, // Already transformed by backend
            }));
        } catch (error) {
            console.error('Error fetching user projects:', error);
            throw error;
        }
    }
    /**
     * Import units from Excel file
     */
    async importUnits(file: File) {
        try {
            const token = await this.getAuthToken();
            if (!token) {
                throw new Error('No authentication token available');
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.baseURL}/unidades/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error importing units:', error);
            throw error;
        }
    }

    /**
     * Create a complete unit (all fields across normalized tables)
     */
    async createUnitComplete(unitData: any) {
        try {
            const token = await this.getAuthToken();
            if (!token) {
                throw new Error('No authentication token available');
            }

            const response = await fetch(`${this.baseURL}/unidades`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(unitData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating unit:', error);
            throw error;
        }
    }
    // --- Catalog Methods ---


    async getUnitTypes() {
        return this.fetchJson(`${this.baseURL}/tipos-unidad`);
    }

    async getBuildings(projectId: string) {
        const token = await this.getAuthToken();
        const response = await fetch(`${this.baseURL}/edificios?proyectoId=${projectId}`, { // Tentativo
            headers: { 'Authorization': `Bearer ${token}` }
        });
        // Fallback si falla el filtro, traer todos (no ideal pero funcional para demo)
        if (!response.ok) return [];
        return response.json();
    }

    // Mejor estrategia: Generic fetch helper
    private async fetchJson(url: string) {
        const token = await this.getAuthToken();
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Failed to fetch ${url}`);
        return res.json();
    }

    async getStages() {
        return this.fetchJson(`${this.baseURL}/etapas`);
    }

    async getCommercialStates() {
        return this.fetchJson(`${this.baseURL}/estado-comercial`);
    }

    async getCommercials() {
        return this.fetchJson(`${this.baseURL}/comerciales`);
    }

    /**
     * Get gastos generales for a project
     */
    async getGastosGenerales(projectId: string) {
        try {
            const token = await this.getAuthToken();
            if (!token) {
                throw new Error('No authentication token available');
            }

            const response = await fetch(`${this.baseURL}/gastosgenerales/proyecto/${projectId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.status === 404) {
                // No gastos found, return null
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching gastos generales:', error);
            throw error;
        }
    }

    /**
     * Update gastos generales for a project
     */
    async updateGastosGenerales(projectId: string, gastosData: any) {
        try {
            const token = await this.getAuthToken();
            if (!token) {
                throw new Error('No authentication token available');
            }

            const response = await fetch(`${this.baseURL}/gastosgenerales/proyecto/${projectId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(gastosData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating gastos generales:', error);
            throw error;
        }
    }

    /**
     * Adjust prices for all units in selected projects
     * @param projectIds - Array of project UUIDs
     * @param mode - Adjustment mode: PERCENTAGE_TOTAL, PERCENTAGE_M2, FIXED_TOTAL, FIXED_M2
     * @param percentage - Percentage to adjust (for PERCENTAGE_* modes)
     * @param fixedValue - Fixed value to set (for FIXED_* modes)
     */
    async adjustPrices(
        projectIds: string[],
        mode: string,
        percentage?: number,
        fixedValue?: number
    ) {
        try {
            const token = await this.getAuthToken();
            if (!token) {
                throw new Error('No authentication token available');
            }

            const response = await fetch(`${this.baseURL}/unidades/adjust-prices`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ projectIds, mode, percentage, fixedValue }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error adjusting prices:', error);
            throw error;
        }
    }
}

export const backendAPI = new BackendAPI();

