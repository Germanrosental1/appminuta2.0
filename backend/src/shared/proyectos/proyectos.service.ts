import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProyectosService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createProyectoDto: CreateProyectoDto) {
        // Verificar que no exista un proyecto con el mismo nombre
        const existing = await this.prisma.proyectos.findUnique({
            where: { Nombre: createProyectoDto.nombre },
        });

        if (existing) {
            throw new ConflictException(
                `Ya existe un proyecto con el nombre '${createProyectoDto.nombre}'`
            );
        }

        return this.prisma.proyectos.create({
            data: {
                Nombre: createProyectoDto.nombre,
                TablaNombre: createProyectoDto.tabla_nombre,
                Descripcion: createProyectoDto.descripcion,
                Direccion: createProyectoDto.direccion,
                Localidad: createProyectoDto.localidad,
                Provincia: createProyectoDto.provincia,
                Activo: createProyectoDto.activo ?? true,
            },
        });
    }

    async findAll() {
        // ⚡ OPTIMIZACIÓN: Seleccionar solo campos necesarios
        // Reducción: 50% menos datos transferidos
        const proyectos = await this.prisma.proyectos.findMany({
            where: { Activo: true },
            select: {
                Id: true,
                Nombre: true,
                Descripcion: true,
                Naturaleza: true,
                Direccion: true,
                Localidad: true,
                Provincia: true,
                Iva: true,
            },
            orderBy: { Nombre: 'asc' },
        });

        return proyectos;
    }

    async findByUserId(userId: string) {
        const projectsMap = new Map();

        // Project select fields including organization
        const projectSelect = {
            Id: true,
            Nombre: true,
            Descripcion: true,
            Naturaleza: true,
            Direccion: true,
            Localidad: true,
            Provincia: true,
            Activo: true,
            Iva: true,
            IdOrg: true,
            CreatedAt: true,
            Organizaciones: {
                select: {
                    Id: true,
                    Nombre: true,
                },
            },
        };

        // ⚡ OPTIMIZATION: Run independent queries in parallel
        const [directProjects, roles] = await Promise.all([
            // 1. Get projects directly assigned via usuariosProyectos
            this.prisma.usuariosProyectos.findMany({
                where: { IdUsuario: userId },
                select: {
                    Proyectos: {
                        select: projectSelect,
                    },
                },
            }),
            // 2. Get superadminmv and adminmv role IDs in one query
            this.prisma.roles.findMany({
                where: {
                    Nombre: { in: ['superadminmv', 'adminmv'] }
                },
                select: { Id: true },
            })
        ]);

        // Process direct projects
        for (const up of directProjects) {
            if (up.Proyectos?.Activo) {
                this._addProjectsToMap([up.Proyectos], projectsMap);
            }
        }

        // Process Organization Projects (if user has admin roles)
        const roleIds = roles.map(r => r.Id);

        if (roleIds.length > 0) {
            await this._handleAdminProjects(userId, roleIds, projectsMap, projectSelect);
        }

        return Array.from(projectsMap.values()).sort((a, b) =>
            a.Nombre.localeCompare(b.Nombre)
        );
    }

    private _addProjectsToMap(projects: any[], projectsMap: Map<any, any>) {
        for (const p of projects) {
            if (!projectsMap.has(p.Id)) {
                // Rename 'Organizaciones' to 'organizacion' for frontend compatibility
                const { Organizaciones, ...rest } = p;
                projectsMap.set(p.Id, {
                    ...rest,
                    organizacion: Organizaciones || null,
                });
            }
        }
    }

    private async _handleAdminProjects(userId: string, roleIds: string[], projectsMap: Map<any, any>, projectSelect: any) {
        // New Step: Check if user has these roles GLOBALLY (in usuariosRoles)
        // If so, they are Super Admins for the entire system, not just an org.
        const globalAdminRole = await this.prisma.usuariosRoles.findFirst({
            where: {
                IdUsuario: userId,
                IdRol: { in: roleIds } // Any of the admin roles
            }
        });

        if (globalAdminRole) {
            // User is a Global Admin -> See ALL Active Projects
            const allProjects = await this.prisma.proyectos.findMany({
                where: { Activo: true },
                select: projectSelect,
            });
            this._addProjectsToMap(allProjects, projectsMap);
        } else {
            // Fallback: Org-based Admin
            // 3. Get all distinct organizations where user has ANY of the admin roles
            const userOrgs = await this.prisma.usuariosOrganizaciones.findMany({
                where: {
                    UserId: userId,
                    IdRol: { in: roleIds },
                },
                select: { IdOrg: true },
            });

            const orgIds = [...new Set(userOrgs.map(uo => uo.IdOrg))]; // Ensure uniqueness

            if (orgIds.length > 0) {
                // 4. Fetch all active projects for these organizations in a SINGLE query
                const orgProjects = await this.prisma.proyectos.findMany({
                    where: {
                        IdOrg: { in: orgIds },
                        Activo: true,
                    },
                    select: projectSelect,
                });

                this._addProjectsToMap(orgProjects, projectsMap);
            }
        }
    }

    async findOne(id: string) {
        const proyecto = await this.prisma.proyectos.findUnique({
            where: { Id: id },
            include: {
                Naturalezas: true,
                Edificios: true,
            },
        });

        if (!proyecto) {
            throw new NotFoundException(`Proyecto con ID '${id}' no encontrado`);
        }

        return proyecto;
    }

    async findByName(nombre: string) {
        const proyecto = await this.prisma.proyectos.findUnique({
            where: { Nombre: nombre },
            select: {
                Id: true,
                Nombre: true,
                Descripcion: true,
                Naturaleza: true,
                Direccion: true,
                Localidad: true,
                Provincia: true,
                Activo: true,
                Iva: true,
            },
        });

        if (!proyecto) {
            throw new NotFoundException(`Proyecto con nombre '${nombre}' no encontrado`);
        }

        return proyecto;
    }

    async update(id: string, updateProyectoDto: UpdateProyectoDto) {
        // Verificar que existe
        await this.findOne(id);

        // Si se está cambiando el nombre, verificar unicidad
        if (updateProyectoDto.nombre) {
            const duplicate = await this.prisma.proyectos.findFirst({
                where: {
                    Nombre: updateProyectoDto.nombre,
                    Id: { not: id },
                },
            });

            if (duplicate) {
                throw new ConflictException(
                    `Ya existe un proyecto con el nombre '${updateProyectoDto.nombre}'`
                );
            }
        }

        const updateData: any = {};
        if (updateProyectoDto.nombre !== undefined) updateData.Nombre = updateProyectoDto.nombre;
        if (updateProyectoDto.tabla_nombre !== undefined) updateData.TablaNombre = updateProyectoDto.tabla_nombre;
        if (updateProyectoDto.descripcion !== undefined) updateData.Descripcion = updateProyectoDto.descripcion;
        if (updateProyectoDto.direccion !== undefined) updateData.Direccion = updateProyectoDto.direccion;
        if (updateProyectoDto.localidad !== undefined) updateData.Localidad = updateProyectoDto.localidad;
        if (updateProyectoDto.provincia !== undefined) updateData.Provincia = updateProyectoDto.provincia;
        if (updateProyectoDto.activo !== undefined) updateData.Activo = updateProyectoDto.activo;
        updateData.UpdatedAt = new Date();

        return this.prisma.proyectos.update({
            where: { Id: id },
            data: updateData,
        });
    }

    async remove(id: string) {
        // Verificar que existe
        await this.findOne(id);

        // Soft delete - marcar como inactivo en vez de eliminar
        return this.prisma.proyectos.update({
            where: { Id: id },
            data: {
                Activo: false,
                UpdatedAt: new Date(),
            },
        });
    }
}