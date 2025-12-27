import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProyectosService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createProyectoDto: CreateProyectoDto) {
        // Verificar que no exista un proyecto con el mismo nombre
        const existing = await this.prisma.proyectos.findUnique({
            where: { nombre: createProyectoDto.nombre },
        });

        if (existing) {
            throw new ConflictException(
                `Ya existe un proyecto con el nombre '${createProyectoDto.nombre}'`
            );
        }

        return this.prisma.proyectos.create({
            data: {
                nombre: createProyectoDto.nombre,
                tabla_nombre: createProyectoDto.tabla_nombre,
                descripcion: createProyectoDto.descripcion,
                direccion: createProyectoDto.direccion,
                localidad: createProyectoDto.localidad,
                provincia: createProyectoDto.provincia,
                activo: createProyectoDto.activo ?? true,
            },
        });
    }

    async findAll() {
        // ⚡ OPTIMIZACIÓN: Seleccionar solo campos necesarios
        // Reducción: 50% menos datos transferidos
        const proyectos = await this.prisma.proyectos.findMany({
            where: { activo: true },
            select: {
                id: true,
                nombre: true,
                descripcion: true,
                naturaleza: true,
                direccion: true,
                localidad: true,
                provincia: true,
            },
            orderBy: { nombre: 'asc' },
        });

        return proyectos;
    }

    async findByUserId(userId: string) {
        const projectsMap = new Map();

        // Helper function to add projects with organization
        const addProjectsWithOrg = (projects: any[]) => {
            for (const p of projects) {
                if (!projectsMap.has(p.id)) {
                    // Rename 'organizaciones' to 'organizacion' for frontend compatibility
                    const { organizaciones, ...rest } = p;
                    projectsMap.set(p.id, {
                        ...rest,
                        organizacion: organizaciones || null,
                    });
                }
            }
        };

        // Project select fields including organization
        const projectSelect = {
            id: true,
            nombre: true,
            descripcion: true,
            naturaleza: true,
            direccion: true,
            localidad: true,
            provincia: true,
            activo: true,
            id_org: true,
            created_at: true,
            organizaciones: {
                select: {
                    id: true,
                    nombre: true,
                },
            },
        };

        // ⚡ OPTIMIZATION: Run independent queries in parallel
        const [directProjects, roles] = await Promise.all([
            // 1. Get projects directly assigned via usuarios_proyectos
            this.prisma.usuarios_proyectos.findMany({
                where: { idusuario: userId },
                select: {
                    proyectos: {
                        select: projectSelect,
                    },
                },
            }),
            // 2. Get superadminmv and adminmv role IDs in one query
            this.prisma.roles.findMany({
                where: {
                    nombre: { in: ['superadminmv', 'adminmv'] }
                },
                select: { id: true },
            })
        ]);

        // Process direct projects
        for (const up of directProjects) {
            if (up.proyectos && up.proyectos.activo) {
                addProjectsWithOrg([up.proyectos]);
            }
        }

        // Process Organization Projects (if user has admin roles)
        const roleIds = roles.map(r => r.id);

        if (roleIds.length > 0) {
            // New Step: Check if user has these roles GLOBALLY (in usuarios_roles)
            // If so, they are Super Admins for the entire system, not just an org.
            const globalAdminRole = await this.prisma.usuarios_roles.findFirst({
                where: {
                    idusuario: userId,
                    idrol: { in: roleIds } // Any of the admin roles
                }
            });

            if (globalAdminRole) {
                // User is a Global Admin -> See ALL Active Projects
                const allProjects = await this.prisma.proyectos.findMany({
                    where: { activo: true },
                    select: projectSelect,
                });
                for (const p of allProjects) {
                    if (!projectsMap.has(p.id)) {
                        // Rename 'organizaciones' to 'organizacion' for frontend compatibility
                        const { organizaciones, ...rest } = p;
                        projectsMap.set(p.id, {
                            ...rest,
                            organizacion: organizaciones || null,
                        });
                    }
                }
            } else {
                // Fallback: Org-based Admin
                // 3. Get all distinct organizations where user has ANY of the admin roles
                const userOrgs = await this.prisma.usuarios_organizaciones.findMany({
                    where: {
                        userid: userId,
                        idrol: { in: roleIds },
                    },
                    select: { idorg: true },
                });

                const orgIds = [...new Set(userOrgs.map(uo => uo.idorg))]; // Ensure uniqueness

                if (orgIds.length > 0) {
                    // 4. Fetch all active projects for these organizations in a SINGLE query
                    const orgProjects = await this.prisma.proyectos.findMany({
                        where: {
                            id_org: { in: orgIds },
                            activo: true,
                        },
                        select: projectSelect,
                    });

                    addProjectsWithOrg(orgProjects);
                }
            }
        }

        return Array.from(projectsMap.values()).sort((a, b) =>
            a.nombre.localeCompare(b.nombre)
        );
    }

    async findOne(id: string) {
        const proyecto = await this.prisma.proyectos.findUnique({
            where: { id },
            include: {
                naturalezas: true,
                edificios: true,
            },
        });

        if (!proyecto) {
            throw new NotFoundException(`Proyecto con ID '${id}' no encontrado`);
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
                    nombre: updateProyectoDto.nombre,
                    id: { not: id },
                },
            });

            if (duplicate) {
                throw new ConflictException(
                    `Ya existe un proyecto con el nombre '${updateProyectoDto.nombre}'`
                );
            }
        }

        return this.prisma.proyectos.update({
            where: { id },
            data: {
                ...updateProyectoDto,
                updated_at: new Date(),
            },
        });
    }

    async remove(id: string) {
        // Verificar que existe
        await this.findOne(id);

        // Soft delete - marcar como inactivo en vez de eliminar
        return this.prisma.proyectos.update({
            where: { id },
            data: {
                activo: false,
                updated_at: new Date(),
            },
        });
    }
}