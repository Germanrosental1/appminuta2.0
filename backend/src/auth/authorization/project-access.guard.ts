import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';

/**
 * Guard para validar acceso a proyectos
 * Verifica que el usuario tenga acceso (rol asignado O es owner de la organización)
 */
@Injectable()
export class ProjectAccessGuard implements CanActivate {
    constructor(private readonly authService: AuthorizationService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id;

        if (!userId) {
            throw new ForbiddenException('Usuario no autenticado');
        }

        // Intentar obtener proyecto de params o query
        const projectId =
            request.params.projectId ||
            request.query.proyecto ||
            request.body?.proyecto_id;

        // Si no hay proyecto, permitir (el endpoint puede no requerir proyecto)
        if (!projectId) {
            return true;
        }

        const canAccess = await this.authService.canAccessProject(
            userId,
            projectId,
        );

        if (!canAccess) {
            throw new ForbiddenException(
                'No tienes acceso a este proyecto',
            );
        }

        return true;
    }
}
