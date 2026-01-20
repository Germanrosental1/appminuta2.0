/**
 * Constantes de roles del sistema
 */
export const ROLES = {
    SUPER_ADMIN: 'superadminmv',
    ADMIN: 'adminmv',
    VIEWER_INMOBILIARIA: 'viewerinmobiliariamv',
    VIEWER: 'viewermv',
} as const;

/**
 * Permisos que puede tener un rol
 */
export const PERMISSIONS = {
    VIEW_UNITS: 'view_units',
    CREATE_UNIT: 'create_unit',
    EDIT_UNIT: 'edit_unit',
    DELETE_UNIT: 'delete_unit',
    MANAGE_USERS: 'manage_users',
    EXPORT_DATA: 'export_data',
    VIEW_REPORTS: 'view_reports',
} as const;

/**
 * Matriz de permisos por rol
 * 
 * superadminmv: Puede modificar TODOS los campos de las unidades
 * adminmv: Solo puede modificar el ESTADO de las unidades
 * viewerinmobiliariamv: Solo lectura de campos básicos (sin datos comerciales)
 * viewermv: Solo lectura de todos los campos
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
    [ROLES.SUPER_ADMIN]: [
        PERMISSIONS.VIEW_UNITS,
        PERMISSIONS.CREATE_UNIT,
        PERMISSIONS.EDIT_UNIT,      // Puede editar TODOS los campos
        PERMISSIONS.DELETE_UNIT,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.EXPORT_DATA,
        PERMISSIONS.VIEW_REPORTS,
    ],
    [ROLES.ADMIN]: [
        PERMISSIONS.VIEW_UNITS,
        // Solo puede cambiar estado, NO puede editar otros campos
        PERMISSIONS.VIEW_REPORTS,
    ],
    [ROLES.VIEWER_INMOBILIARIA]: [
        // Solo ve campos básicos (sin comercial, cliente, observaciones)
        // El filtrado se hace en el controller
        PERMISSIONS.VIEW_REPORTS,
    ],
    [ROLES.VIEWER]: [
        PERMISSIONS.VIEW_UNITS,     // Ve todos los campos pero no puede modificar
        PERMISSIONS.VIEW_REPORTS,
    ],
};

/**
 * Verifica si un rol tiene un permiso específico
 */
export function roleHasPermission(role: string, permission: string): boolean {
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    return rolePerms.includes(permission);
}
