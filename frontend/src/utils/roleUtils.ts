import { rbacApi } from '@/services/rbac';

export async function verifyRole(
    requiredRole: string,
    hasRole: (role: string) => boolean,
    refreshRoles: () => Promise<void>
): Promise<boolean> {
    if (hasRole(requiredRole)) {
        return true;
    }

    // Lazy check via API
    const hasAccess = await rbacApi.checkRole(requiredRole);
    if (hasAccess) {
        await refreshRoles();
        return true;
    }
    return false;
}

export async function determineRedirect(): Promise<string> {
    const isComercial = await rbacApi.checkRole('comercial');
    if (isComercial) return "/comercial/dashboard";

    const isFirmante = await rbacApi.checkRole('firmante');
    if (isFirmante) return "/firmante/dashboard";

    const isViewer = await rbacApi.checkRole('viewer');
    if (isViewer) return "/viewer/dashboard";

    return "/admin/dashboard";
}

export function getHomePathForRoles(roles: Array<{ nombre?: string; Nombre?: string } | string>): string {
    const roleNames = new Set(roles.map(r => (typeof r === 'string' ? r : (r.nombre || r.Nombre || ''))));

    if (roleNames.has('administrador')) return '/admin/dashboard';
    if (roleNames.has('comercial')) return '/comercial/dashboard';
    if (roleNames.has('firmante')) return '/firmante/dashboard';
    if (roleNames.has('viewer')) return '/viewer/dashboard';

    return '/perfil-incompleto';
}
