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
        // Verificar que el usuario existe
        const user = await this.prisma.profiles.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
        }

        // Verificar que el proyecto existe
        const project = await this.prisma.proyectos.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Proyecto con ID ${projectId} no encontrado`);
        }

        // Verificar que el rol existe
        const role = await this.prisma.roles.findUnique({
            where: { id: roleId },
        });

        if (!role) {
            throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
        }

        // Verificar si ya existe la asignación
        const existing = await this.prisma.usuarios_proyectos.findUnique({
            where: {
                idusuario_idproyecto_idrol: {
                    idusuario: userId,
                    idproyecto: projectId,
                    idrol: roleId,
                },
            },
        });

        if (existing) {
            throw new ConflictException(
                'El usuario ya está asignado a este proyecto con este rol',
            );
        }

        return this.prisma.usuarios_proyectos.create({
            data: {
                idusuario: userId,
                idproyecto: projectId,
                idrol: roleId,
            },
            include: {
                proyectos: true,
                roles: true,
            },
        });
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
        // Verificar que el usuario existe
        const user = await this.prisma.profiles.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
        }

        const userProjects = await this.prisma.usuarios_proyectos.findMany({
            where: { idusuario: userId },
            include: {
                proyectos: true,
                roles: true,
            },
        });

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
            include: {
                profiles: true,
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
