import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthorizationService {
    constructor(private prisma: PrismaService) { }

    /**
     * Verifica si el usuario es SuperAdminMV de la organización
     */
    async isOrganizationOwner(userId: string, orgId: string): Promise<boolean> {
        // Obtener ID del rol superadminmv
        const superAdminRole = await this.prisma.roles.findFirst({
            where: { nombre: 'superadminmv' },
            select: { id: true },
        });

        if (!superAdminRole) {
            return false;
        }

        // Verificar si el usuario tiene rol superadminmv en esta org
        const userOrgRole = await this.prisma.usuarios_organizaciones.findFirst({
            where: {
                userid: userId,
                idorg: orgId,
                idrol: superAdminRole.id,
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
        const userProject = await this.prisma.usuarios_proyectos.findFirst({
            where: {
                idusuario: userId,
                idproyecto: projectId,
            },
            include: {
                roles: true,
            },
        });

        return userProject?.roles.nombre || null;
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
        const directProjects = await this.prisma.usuarios_proyectos.findMany({
            where: { idusuario: userId },
            select: { idproyecto: true },
        });

        directProjects.forEach(p => projectIds.add(p.idproyecto));

        // 2. Verificar si es SuperAdminMV en alguna organización
        // Primero obtener el ID del rol superadminmv
        const superAdminRole = await this.prisma.roles.findFirst({
            where: { nombre: 'superadminmv' },
            select: { id: true },
        });

        if (superAdminRole) {
            // Obtener organizaciones donde tiene rol superadminmv
            const superAdminOrgs = await this.prisma.usuarios_organizaciones.findMany({
                where: {
                    userid: userId,
                    idrol: superAdminRole.id
                },
                select: { idorg: true },
            });

            // Para cada org donde es superadmin, agregar TODOS sus proyectos
            for (const org of superAdminOrgs) {
                const orgProjects = await this.prisma.proyectos.findMany({
                    where: { id_org: org.idorg },
                    select: { id: true },
                });

                orgProjects.forEach(p => projectIds.add(p.id));
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
                id: {
                    in: projectIds,
                },
            },
            select: {
                id: true,
                nombre: true,
                created_at: true,
                id_org: true,
            },
            orderBy: {
                nombre: 'asc',
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
            where: { id: projectId },
            select: { id_org: true },
        });

        // Si tiene id_org, verificar si es owner de esa organización
        if (proyecto?.id_org) {
            const isOwner = await this.isOrganizationOwner(
                userId,
                proyecto.id_org,  // Ya es string UUID
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
            where: { nombre: userRole },
            include: {
                roles_permisos: {
                    include: {
                        permisos: true,
                    },
                },
            },
        });

        return (
            roleWithPerms?.roles_permisos.map((rp) => rp.permisos.nombre || '') ||
            []
        );
    }

    /**
     * Obtiene información completa del usuario con sus organizaciones y proyectos
     */
    async getUserAccessInfo(userId: string) {
        const profile = await this.prisma.profiles.findUnique({
            where: { id: userId },
            include: {
                usuarios_roles: {
                    include: {
                        roles: true,
                    },
                },
                usuarios_proyectos: {
                    include: {
                        proyectos: true,
                        roles: true,
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
            where: { id: projectId },
            select: { id_org: true },
        });

        if (!project || !project.id_org) {
            throw new Error('Proyecto no encontrado o no pertenece a una organización');
        }

        // 2. Verificar que quien asigna es owner de la organización
        const isOwner = await this.isOrganizationOwner(assignedBy, project.id_org);
        if (!isOwner) {
            throw new Error('Solo el owner de la organización puede asignar usuarios a proyectos');
        }

        // 3. Asignar usuario al proyecto (usuarios-proyectos)
        await this.prisma.usuarios_proyectos.upsert({
            where: {
                idusuario_idproyecto_idrol: {
                    idusuario: userId,
                    idproyecto: projectId,
                    idrol: roleId,
                },
            },
            create: {
                idusuario: userId,
                idproyecto: projectId,
                idrol: roleId,
            },
            update: {
                // Si ya existe, no hace nada más que actualizar el timestamp
                created_at: new Date(),
            },
        });

        // 4. Automáticamente agregar a usuarios-organizaciones si no está
        const existsInOrg = await this.prisma.usuarios_organizaciones.findFirst({
            where: {
                userid: userId,
                idorg: project.id_org,
            },
        });

        if (!existsInOrg) {
            // Agregar como miembro con el mismo rol que tiene en el proyecto
            await this.prisma.usuarios_organizaciones.create({
                data: {
                    userid: userId,
                    idorg: project.id_org,
                    idrol: roleId,
                },
            });
        }

        return {
            success: true,
            message: 'Usuario asignado exitosamente al proyecto y agregado a la organización',
        };
    }
}
