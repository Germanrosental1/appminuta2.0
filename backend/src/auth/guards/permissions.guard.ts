import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UsuariosRolesService } from '../../usuarios-roles/usuarios-roles.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly usuariosRolesService: UsuariosRolesService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Obtener permisos requeridos del decorador
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        // Si no hay permisos requeridos, permitir acceso
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        // Obtener usuario del request
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user?.id) {
            throw new ForbiddenException('Usuario no autenticado');
        }

        // Obtener permisos del usuario
        const userPermissions = await this.usuariosRolesService.getUserPermissions(
            user.id,
        );

        // 🔒 SEGURIDAD: Logs de debug eliminados para evitar exposición de user IDs y permisos

        // Verificar si el usuario tiene al menos uno de los permisos requeridos
        const hasPermission = requiredPermissions.some((permission) =>
            userPermissions.some((p) => p.nombre === permission),
        );

        if (!hasPermission) {
            throw new ForbiddenException(
                `No tienes permiso para realizar esta acción. Permisos requeridos: ${requiredPermissions.join(', ')}`,
            );
        }

        return true;
    }
}
