import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { UsuariosProyectosService } from '../../usuarios-proyectos/usuarios-proyectos.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
    constructor(
        private readonly usuariosProyectosService: UsuariosProyectosService,
        private readonly prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user?.id) {
            throw new ForbiddenException('Usuario no autenticado');
        }

        // Obtener el ID de la minuta del parámetro o body
        const minutaId = request.params.id || request.body.id;

        if (!minutaId) {
            // Si no hay ID de minuta, permitir (será validado por otros guards)
            return true;
        }

        // Obtener la minuta para saber a qué proyecto pertenece
        const minuta = await this.prisma.minutasDefinitivas.findUnique({
            where: { Id: minutaId },
        });

        if (!minuta) {
            throw new NotFoundException('Minuta no encontrada');
        }

        // Obtener el proyecto por nombre (ya que minuta tiene proyecto como string)
        const proyecto = await this.prisma.proyectos.findFirst({
            where: { Nombre: minuta.Proyecto },
        });

        if (!proyecto) {
            // Si no hay proyecto definido, permitir acceso
            // (para minutas sin proyecto asignado)
            return true;
        }

        // Verificar si el usuario tiene acceso al proyecto
        const hasAccess = await this.usuariosProyectosService.hasAccess(
            user.id,
            proyecto.Id,
        );

        if (!hasAccess) {
            throw new ForbiddenException(
                'No tienes acceso a este proyecto',
            );
        }

        return true;
    }
}
