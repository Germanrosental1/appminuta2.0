import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class AuthorizationService {
    constructor(
        private prisma: PrismaService,
        private readonly logger: LoggerService
    ) { }

    /**
     * Verifica si el usuario es SuperAdminMV de la organización
     */
    async isOrganizationOwner(userId: string, orgId: string): Promise<boolean> {
        // Obtener ID del rol superadminmv
        const superAdminRole = await this.prisma.roles.findFirst({
            where: { Nombre: 'superadminmv' },
            select: { Id: true },
        });

        if (!superAdminRole) {
            return false;
        }

        // Verificar si el usuario tiene rol superadminmv en esta org
        const userOrgRole = await this.prisma.usuariosOrganizaciones.findFirst({
            where: {
                UserId: userId,
                IdOrg: orgId,
                IdRol: superAdminRole.Id,
            },
        });

        return userOrgRole !== null;
    }

    /**
     * Obtiene el rol del usuario en un proyecto específico
     */
    async getUserRoleInProject(
        userId: string,
        projectId: string,
    ): Promise<string | null> {
        const userProject = await this.prisma.usuariosProyectos.findFirst({
            where: {
                IdUsuario: userId,
                IdProyecto: projectId,
            },
            include: {
                Roles: true,
            },
        });

        return userProject?.Roles.Nombre || null;
    }

    /**
   * Verifica si el usuario tiene un rol específico en el proyecto
   * superadminmv y adminmv siempre tienen acceso completo
   */
    async hasRoleInProject(
        userId: string,
        projectId: string,
        requiredRole: string,
    ): Promise<boolean> {
        const userRole = await this.getUserRoleInProject(userId, projectId);

        if (!userRole) return false;

        // superadminmv y adminmv tienen TODOS los permisos
        if (userRole === 'superadminmv' || userRole === 'adminmv') {
            return true;
        }

        // Para otros roles, verificar coincidencia exacta
        return userRole === requiredRole;
    }


    /**
     * Obtiene todos los proyectos a los que el usuario tiene acceso
     * Lógica:
     * - Si tiene rol superadminmv en una organización: ve TODOS los proyectos de esa org
     * - Si tiene otros roles: solo ve proyectos donde está explícitamente asignado
     */
    async getUserProjects(userId: string): Promise<string[]> {
        const projectIds = new Set<string>();

        // 1. Obtener proyectos donde está directamente asignado (usuarios-proyectos)
        const directProjects = await this.prisma.usuariosProyectos.findMany({
            where: { IdUsuario: userId },
            select: { IdProyecto: true },
        });

        directProjects.forEach(p => projectIds.add(p.IdProyecto));

        // 2. Verificar si es SuperAdminMV en alguna organización
        // Primero obtener el ID del rol superadminmv
        const superAdminRole = await this.prisma.roles.findFirst({
            where: { Nombre: 'superadminmv' },
            select: { Id: true },
        });

        if (superAdminRole) {
            // Obtener organizaciones donde tiene rol superadminmv
            const superAdminOrgs = await this.prisma.usuariosOrganizaciones.findMany({
                where: {
                    UserId: userId,
                    IdRol: superAdminRole.Id
                },
                select: { IdOrg: true },
            });

            // Para cada org donde es superadmin, agregar TODOS sus proyectos
            for (const org of superAdminOrgs) {
                const orgProjects = await this.prisma.proyectos.findMany({
                    where: { IdOrg: org.IdOrg },
                    select: { Id: true },
                });

                orgProjects.forEach(p => projectIds.add(p.Id));
            }
        }

        // Retornar lista única de proyectos
        return Array.from(projectIds);
    }

    /**
     * Obtiene información detallada de proyectos accesibles por el usuario
     */
    async getUserProjectsDetailed(userId: string) {
        const projectIds = await this.getUserProjects(userId);

        if (projectIds.length === 0) {
            return [];
        }

        const projects = await this.prisma.proyectos.findMany({
            where: {
                Id: {
                    in: projectIds,
                },
            },
            select: {
                Id: true,
                Nombre: true,
                CreatedAt: true,
                IdOrg: true,
            },
            orderBy: {
                Nombre: 'asc',
            },
        });

        return projects;
    }


    /**
     * Verifica si el usuario puede acceder al proyecto
     * (tiene rol asignado O es owner de la organización)
     */
    async canAccessProject(userId: string, projectId: string): Promise<boolean> {
        // Verificar si es owner de la organización
        const proyecto = await this.prisma.proyectos.findUnique({
            where: { Id: projectId },
            select: { IdOrg: true },
        });

        // Si tiene id_org, verificar si es owner de esa organización
        if (proyecto?.IdOrg) {
            const isOwner = await this.isOrganizationOwner(
                userId,
                proyecto.IdOrg,  // Ya es string UUID
            );
            if (isOwner) {
                return true;
            }
        }
        // Verificar si tiene rol en el proyecto
        const hasRole = await this.getUserRoleInProject(userId, projectId);
        return hasRole !== null;
    }

    /**
     * Obtiene los permisos del usuario en un proyecto
     */
    async getUserPermissions(
        userId: string,
        projectId: string,
    ): Promise<string[]> {
        const userRole = await this.getUserRoleInProject(userId, projectId);

        if (!userRole) return [];

        const roleWithPerms = await this.prisma.roles.findFirst({
            where: { Nombre: userRole },
            include: {
                RolesPermisos: {
                    include: {
                        Permisos: true,
                    },
                },
            },
        });

        return (
            roleWithPerms?.RolesPermisos.map((rp) => rp.Permisos.Nombre || '') ||
            []
        );
    }

    /**
     * Obtiene información completa del usuario con sus organizaciones y proyectos
     */
    async getUserAccessInfo(userId: string) {
        const profile = await this.prisma.profiles.findUnique({
            where: { Id: userId },
            include: {
                UsuariosRoles: {
                    include: {
                        Roles: true,
                    },
                },
                UsuariosProyectos: {
                    include: {
                        Proyectos: true,
                        Roles: true,
                    },
                },
            },
        });

        return profile;
    }

    /**
     * Asigna un usuario a un proyecto y automáticamente lo agrega a la organización
     * Lógica: Cuando el owner asigna a alguien a un proyecto, automáticamente
     * se convierte en miembro de la organización
     */
    async assignUserToProject(
        userId: string,
        projectId: string,
        roleId: string,
        assignedBy: string, // Usuario que está asignando (debe ser owner)
    ): Promise<{ success: boolean; message: string }> {
        // 1. Verificar que el proyecto existe y obtener su organización
        const project = await this.prisma.proyectos.findUnique({
            where: { Id: projectId },
            select: { IdOrg: true },
        });

        if (!project || !project.IdOrg) {
            throw new Error('Proyecto no encontrado o no pertenece a una organización');
        }

        // 2. Verificar que quien asigna es owner de la organización
        const isOwner = await this.isOrganizationOwner(assignedBy, project.IdOrg);
        if (!isOwner) {
            throw new Error('Solo el owner de la organización puede asignar usuarios a proyectos');
        }

        // 3. Asignar usuario al proyecto (usuarios-proyectos)
        await this.prisma.usuariosProyectos.upsert({
            where: {
                IdUsuario_IdProyecto_IdRol: {
                    IdUsuario: userId,
                    IdProyecto: projectId,
                    IdRol: roleId,
                },
            },
            create: {
                IdUsuario: userId,
                IdProyecto: projectId,
                IdRol: roleId,
            },
            update: {
                // Si ya existe, no hace nada más que actualizar el timestamp
                CreatedAt: new Date(),
            },
        });

        // 4. Automáticamente agregar a usuarios-organizaciones si no está
        const existsInOrg = await this.prisma.usuariosOrganizaciones.findFirst({
            where: {
                UserId: userId,
                IdOrg: project.IdOrg,
            },
        });

        if (!existsInOrg) {
            // Agregar como miembro con el mismo rol que tiene en el proyecto
            await this.prisma.usuariosOrganizaciones.create({
                data: {
                    UserId: userId,
                    IdOrg: project.IdOrg,
                    IdRol: roleId,
                },
            });
        }

        // 📝 AUDIT LOG: Asignación de Usuario a Proyecto
        try {
            const user = await this.prisma.users.findUnique({
                where: { id: assignedBy },
                select: { email: true }
            });
            const userEmail = user?.email || 'unknown';

            await this.logger.agregarLog({
                motivo: 'Asignación de Usuario a Proyecto',
                descripcion: `Usuario ${userId} asignado al proyecto ${projectId} con rol ${roleId}. Asignado por: ${assignedBy}`,
                impacto: 'Alto',
                tablaafectada: 'usuarios-proyectos',
                usuarioID: assignedBy,
                usuarioemail: userEmail,
            });
        } catch (e) {
            console.error('Failed to audit log assignment:', e);
        }

        return {
            success: true,
            message: 'Usuario asignado exitosamente al proyecto y agregado a la organización',
        };
    }
}
