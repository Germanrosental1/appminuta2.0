import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from '../../auth/authorization/authorization.service';
import { ROLES_KEY } from '../../auth/authorization/roles.decorator';

/**
 * Guard para validar roles en proyectos
 * Verifica que el usuario tenga uno de los roles especificados en el decorator @Roles()
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly authService: AuthorizationService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Obtener roles requeridos del decorator
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        // Si no hay roles requeridos, permitir acceso
        if (!requiredRoles || requiredRoles.length === 0) {
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
            // 🔒 SEGURIDAD: Usar ForbiddenException para no revelar información sobre requisitos del endpoint
            throw new ForbiddenException(
                'Se requiere contexto de proyecto para esta operación',
            );
        }

        // Verificar si tiene alguno de los roles requeridos
        for (const role of requiredRoles) {
            const hasRole = await this.authService.hasRoleInProject(
                userId,
                projectId,
                role,
            );

            if (hasRole) {
                return true; // Tiene al menos un rol requerido
            }
        }

        throw new ForbiddenException(
            `Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`,
        );
    }
}
