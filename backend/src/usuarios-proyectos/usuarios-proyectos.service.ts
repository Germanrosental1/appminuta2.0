import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
            return await this.prisma.usuarios_proyectos.create({
                data: {
                    idusuario: userId,
                    idproyecto: projectId,
                    idrol: roleId,
                },
                select: {
                    // 🔒 SEGURIDAD: NO incluir idusuario en la respuesta
                    idproyecto: true,
                    idrol: true,
                    created_at: true,
                    proyectos: true,
                    roles: true,
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
        const existing = await this.prisma.usuarios_proyectos.findUnique({
            where: {
                idusuario_idproyecto_idrol: {
                    idusuario: userId,
                    idproyecto: projectId,
                    idrol: roleId,
                },
            },
        });

        if (!existing) {
            throw new NotFoundException(
                'El usuario no está asignado a este proyecto con este rol',
            );
        }

        return this.prisma.usuarios_proyectos.delete({
            where: {
                idusuario_idproyecto_idrol: {
                    idusuario: userId,
                    idproyecto: projectId,
                    idrol: roleId,
                },
            },
        });
    }

    async getUserProjects(userId: string) {
        // ⚡ OPTIMIZACIÓN: Eliminar query de validación previa
        const userProjects = await this.prisma.usuarios_proyectos.findMany({
            where: { idusuario: userId },
            include: {
                proyectos: true,
                roles: true,
            },
        });

        if (userProjects.length === 0) {
            throw new NotFoundException(`Usuario sin proyectos o no encontrado`);
        }

        return userProjects.map((up) => ({
            proyecto: up.proyectos,
            rol: up.roles,
        }));
    }

    async getProjectUsers(projectId: string) {
        // Verificar que el proyecto existe
        const project = await this.prisma.proyectos.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Proyecto con ID ${projectId} no encontrado`);
        }

        const projectUsers = await this.prisma.usuarios_proyectos.findMany({
            where: { idproyecto: projectId },
            select: {
                // 🔒 SEGURIDAD: NO incluir idusuario en la respuesta
                profiles: {
                    select: {
                        email: true,
                        nombre: true,
                        apellido: true,
                        activo: true,
                        // id: EXCLUIDO por seguridad
                    },
                },
                roles: true,
            },
        });

        return projectUsers.map((pu) => ({
            usuario: pu.profiles,
            rol: pu.roles,
        }));
    }

    async hasAccess(userId: string, projectId: string): Promise<boolean> {
        const access = await this.prisma.usuarios_proyectos.findFirst({
            where: {
                idusuario: userId,
                idproyecto: projectId,
            },
        });

        return !!access;
    }

    async getUserProjectRole(userId: string, projectId: string) {
        const assignment = await this.prisma.usuarios_proyectos.findFirst({
            where: {
                idusuario: userId,
                idproyecto: projectId,
            },
            include: {
                roles: true,
            },
        });

        if (!assignment) {
            throw new NotFoundException(
                'El usuario no tiene acceso a este proyecto',
            );
        }

        return assignment.roles;
    }
}
