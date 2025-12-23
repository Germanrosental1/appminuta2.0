import { useAuth } from './useAuth';

/**
 * Hook for permission-based access control
 * Consumes permissions from backend via AuthContext
 * All authorization logic is handled by the backend
 */
export const usePermissions = () => {
    const {
        permissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        roles
    } = useAuth();

    // Specific permission checks for common actions
    const canGenerateMinuta = hasPermission('generarMinuta');
    const canEditMinuta = hasPermission('editarMinuta');
    const canApproveRejectMinuta = hasPermission('aprobarRechazarMinuta');
    const canSignMinuta = hasPermission('firmarMinuta');

    // Combined checks
    const canModifyMinuta = hasAnyPermission('editarMinuta', 'aprobarRechazarMinuta');

    return {
        // Raw data from backend
        permissions,
        roles,

        // Generic permission checks
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,

        // Specific permission checks (for convenience)
        canGenerateMinuta,
        canEditMinuta,
        canApproveRejectMinuta,
        canSignMinuta,
        canModifyMinuta,
    };
};
