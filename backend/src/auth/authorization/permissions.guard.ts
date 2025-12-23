import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from './authorization.service';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { ROLE_PERMISSIONS } from './roles.constants';

/**
 * Guard para validar permisos granulares
 * Verifica que el rol del usuario tenga los permisos requeridos
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly authService: AuthorizationService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Obtener permisos requeridos del decorator
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        // Si no hay permisos requeridos, permitir acceso
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id;

        if (!userId) {
            throw new ForbiddenException('Usuario no autenticado');
        }

        // Obtener proyecto
        const projectId =
            request.params.projectId ||
            request.query.proyecto ||
            request.body?.proyecto_id;

        if (!projectId) {
            throw new BadRequestException(
                'Se requiere ID de proyecto para validar permisos',
            );
        }

        // Obtener rol del usuario en el proyecto
        const userRole = await this.authService.getUserRoleInProject(
            userId,
            projectId,
        );

        if (!userRole) {
            throw new ForbiddenException('Usuario no tiene rol en este proyecto');
        }

        // Obtener permisos del rol
        const rolePermissions = ROLE_PERMISSIONS[userRole] || [];

        // Verificar que tenga TODOS los permisos requeridos
        const hasAllPermissions = requiredPermissions.every((permission) =>
            rolePermissions.includes(permission),
        );

        if (!hasAllPermissions) {
            throw new ForbiddenException(
                `Se requieren los siguientes permisos: ${requiredPermissions.join(', ')}`,
            );
        }

        return true;
    }
}
