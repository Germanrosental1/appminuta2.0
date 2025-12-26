import { supabase } from '@/lib/supabase';

/**
 * Service for making authenticated requests to the NestJS backend
 */
class BackendAPI {
    private baseURL: string;

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
            return projects;
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
}

export const backendAPI = new BackendAPI();
