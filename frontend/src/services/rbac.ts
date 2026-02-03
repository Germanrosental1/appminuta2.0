import { apiGet, apiPost, apiDelete } from '../lib/api-wrapper-client';

export interface Role {
    Id: string;
    Nombre: string;
    CreatedAt: string;
}

export interface Permission {
    Id: string;
    Nombre: string;
    Descripcion: string | null;
    CreatedAt: string;
    UpdatedAt: string | null;
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
            return await apiGet<Role[]>('/usuarios/me/roles');
        } catch (error) {
            return [];
        }
    },

    /**
     * Check if current user has a specific role
     * Backend endpoint: GET /usuarios/me/check-role?role=...
     */
    checkRole: async (role: string): Promise<boolean> => {
        try {
            const result = await apiGet<{ hasRole: boolean }>(`/usuarios/me/check-role?role=${encodeURIComponent(role)}`);
            return result.hasRole;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get all permissions for a user (aggregated from all their roles)
     * Backend endpoint: GET /usuarios/:id/permisos
     */
    getUserPermissions: async (userId: string): Promise<Permission[]> => {
        try {
            return await apiGet<Permission[]>(`/usuarios/${userId}/permisos`);
        } catch (error) {
            return [];
        }
    },

    /**
     * Get all available roles (admin only)
     * Backend endpoint: GET /roles
     */
    getAllRoles: async (): Promise<Role[]> => {
        try {
            return await apiGet<Role[]>('/roles');
        } catch (error) {
            return [];
        }
    },

    /**
     * Get all available permissions (admin only)
     * Backend endpoint: GET /permisos
     */
    getAllPermissions: async (): Promise<Permission[]> => {
        try {
            return await apiGet<Permission[]>('/permisos');
        } catch (error) {
            return [];
        }
    },

    /**
     * Assign a role to a user (admin only)
     * Backend endpoint: POST /usuarios/:id/roles
     */
    assignRole: async (userId: string, roleId: string): Promise<void> => {
        await apiPost(`/usuarios/${userId}/roles`, { idrol: roleId });
    },

    /**
     * Remove a role from a user (admin only)
     * Backend endpoint: DELETE /usuarios/:id/roles/:roleId
     */
    removeRole: async (userId: string, roleId: string): Promise<void> => {
        await apiDelete(`/usuarios/${userId}/roles/${roleId}`);
    },
};
