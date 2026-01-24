import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UsuariosProyectosService {
    constructor(private readonly prisma: PrismaService) { }

    async assignUserToProject(
        userId: string,
        projectId: string,
        roleId: string,
    ) {
        // ⚡ OPTIMIZACIÓN: Dejar que Prisma valide FKs automáticamente
        // Reducción: 4 queries → 1 query (75% mejora)
        try {
            return await this.prisma.usuariosProyectos.create({
                data: {
                    IdUsuario: userId,
                    IdProyecto: projectId,
                    IdRol: roleId,
                },
                select: {
                    // 🔒 SEGURIDAD: NO incluir IdUsuario en la respuesta
                    IdProyecto: true,
                    IdRol: true,
                    CreatedAt: true,
                    Proyectos: true,
                    Roles: true,
                },
            });
        } catch (error) {
            // P2002: Unique constraint violation (ya asignado)
            if (error.code === 'P2002') {
                throw new ConflictException(
                    'El usuario ya está asignado a este proyecto con este rol',
                );
            }
            // P2003: Foreign key constraint violation (usuario, proyecto o rol no existe)
            if (error.code === 'P2003') {
                throw new NotFoundException('Usuario, proyecto o rol no encontrado');
            }
            throw error;
        }
    }

    async removeUserFromProject(
        userId: string,
        projectId: string,
        roleId: string,
    ) {
        // Verificar que la asignación existe
        const existing = await this.prisma.usuariosProyectos.findUnique({
            where: {
                IdUsuario_IdProyecto_IdRol: {
                    IdUsuario: userId,
                    IdProyecto: projectId,
                    IdRol: roleId,
                },
            },
        });

        if (!existing) {
            throw new NotFoundException(
                'El usuario no está asignado a este proyecto con este rol',
            );
        }

        return this.prisma.usuariosProyectos.delete({
            where: {
                IdUsuario_IdProyecto_IdRol: {
                    IdUsuario: userId,
                    IdProyecto: projectId,
                    IdRol: roleId,
                },
            },
        });
    }

    async getUserProjects(userId: string) {
        // ⚡ OPTIMIZACIÓN: Eliminar query de validación previa
        const userProjects = await this.prisma.usuariosProyectos.findMany({
            where: { IdUsuario: userId },
            include: {
                Proyectos: true,
                Roles: true,
            },
        });

        if (userProjects.length === 0) {
            throw new NotFoundException(`Usuario sin proyectos o no encontrado`);
        }

        return userProjects.map((up) => ({
            proyecto: up.Proyectos,
            rol: up.Roles,
        }));
    }

    async getProjectUsers(projectId: string) {
        // Verificar que el proyecto existe
        const project = await this.prisma.proyectos.findUnique({
            where: { Id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Proyecto con ID ${projectId} no encontrado`);
        }

        const projectUsers = await this.prisma.usuariosProyectos.findMany({
            where: { IdProyecto: projectId },
            select: {
                // 🔒 SEGURIDAD: NO incluir IdUsuario en la respuesta
                Profiles: {
                    select: {
                        Email: true,
                        Nombre: true,
                        Apellido: true,
                        Activo: true,
                        // Id: EXCLUIDO por seguridad
                    },
                },
                Roles: true,
            },
        });

        return projectUsers.map((pu) => ({
            usuario: pu.Profiles,
            rol: pu.Roles,
        }));
    }

    async hasAccess(userId: string, projectId: string): Promise<boolean> {
        const access = await this.prisma.usuariosProyectos.findFirst({
            where: {
                IdUsuario: userId,
                IdProyecto: projectId,
            },
        });

        return !!access;
    }

    async getUserProjectRole(userId: string, projectId: string) {
        const assignment = await this.prisma.usuariosProyectos.findFirst({
            where: {
                IdUsuario: userId,
                IdProyecto: projectId,
            },
            include: {
                Roles: true,
            },
        });

        if (!assignment) {
            throw new NotFoundException(
                'El usuario no tiene acceso a este proyecto',
            );
        }

        return assignment.Roles;
    }
}
