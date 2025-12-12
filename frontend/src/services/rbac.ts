import { apiFetch } from '../lib/api-client';

export interface Role {
    id: string;
    nombre: string;
    created_at: string;
}

export interface Permission {
    id: string;
    nombre: string;
    descripcion: string | null;
    created_at: string;
    updated_at: string | null;
}

/**
 * RBAC API Service
 * Consumes backend endpoints for role-based access control
 * All authorization logic is handled by the backend
 */
export const rbacApi = {

    /**
     * Get roles for the current authenticated user
     * Backend endpoint: GET /usuarios/me/roles
     */
    getMyRoles: async (): Promise<Role[]> => {
        try {
            return await apiFetch<Role[]>('/usuarios/me/roles');
        } catch (error) {
            console.error('Error fetching my roles:', error);
            return [];
        }
    },

    /**
     * Check if current user has a specific role
     * Backend endpoint: GET /usuarios/me/check-role?role=...
     */
    checkRole: async (role: string): Promise<boolean> => {
        try {
            const result = await apiFetch<{ hasRole: boolean }>(`/usuarios/me/check-role?role=${encodeURIComponent(role)}`);
            return result.hasRole;
        } catch (error) {
            console.error(`Error checking role ${role}:`, error);
            return false;
        }
    },

    /**
     * Get all permissions for a user (aggregated from all their roles)
     * Backend endpoint: GET /usuarios/:id/permisos
     */
    getUserPermissions: async (userId: string): Promise<Permission[]> => {
        try {
            return await apiFetch<Permission[]>(`/usuarios/${userId}/permisos`);
        } catch (error) {
            console.error('Error fetching user permissions:', error);
            return [];
        }
    },

    /**
     * Get all available roles (admin only)
     * Backend endpoint: GET /roles
     */
    getAllRoles: async (): Promise<Role[]> => {
        try {
            return await apiFetch<Role[]>('/roles');
        } catch (error) {
            console.error('Error fetching all roles:', error);
            return [];
        }
    },

    /**
     * Get all available permissions (admin only)
     * Backend endpoint: GET /permisos
     */
    getAllPermissions: async (): Promise<Permission[]> => {
        try {
            return await apiFetch<Permission[]>('/permisos');
        } catch (error) {
            console.error('Error fetching all permissions:', error);
            return [];
        }
    },

    /**
     * Assign a role to a user (admin only)
     * Backend endpoint: POST /usuarios/:id/roles
     */
    assignRole: async (userId: string, roleId: string): Promise<void> => {
        await apiFetch(`/usuarios/${userId}/roles`, {
            method: 'POST',
            body: JSON.stringify({ idrol: roleId }),
        });
    },

    /**
     * Remove a role from a user (admin only)
     * Backend endpoint: DELETE /usuarios/:id/roles/:roleId
     */
    removeRole: async (userId: string, roleId: string): Promise<void> => {
        await apiFetch(`/usuarios/${userId}/roles/${roleId}`, {
            method: 'DELETE',
        });
    },
};
