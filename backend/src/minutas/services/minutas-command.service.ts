import { Injectable, NotFoundException, ForbiddenException, ConflictException, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoggerService } from '../../logger/logger.service';
import { UnitStateService } from './unit-state.service';
import { MinutasStateService } from './minutas-state.service';
import { MinutasGateway } from '../minutas.gateway';
import { AuthorizationService } from '../../auth/authorization/authorization.service';
import { sanitizeString, sanitizeObject } from '../../common/sanitize.helper';
import { PrivacyHelpers } from '../../common/privacy.helper';
import { CreateMinutaDto } from '../dto/create-minuta.dto';
import { PermissionsCacheService, UserPermissions } from '../../shared/iam/services/permissions-cache.service';

/**
 * MinutasCommandService - Handles create, update, and remove operations for minutas.
 * 
 * This service encapsulates all write operations and provides:
 * - Data sanitization before persistence
 * - Unit state management (reservation/release)
 * - Audit logging
 * - WebSocket event emission
 * - Optimistic locking for concurrent updates
 */
@Injectable()
export class MinutasCommandService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly unitStateService: UnitStateService,
        private readonly stateService: MinutasStateService,
        private readonly logger: LoggerService,
        private readonly authService: AuthorizationService,
        private readonly permissionsCache: PermissionsCacheService,
        @Optional() @Inject(forwardRef(() => MinutasGateway)) private readonly gateway?: MinutasGateway,
    ) { }

    // ==================== CREATE ====================

    async create(createMinutaDto: CreateMinutaDto, userId: string) {
        // Sanitize data before saving
        const sanitizedData = this.sanitizeCreateData(createMinutaDto);

        // Find project by name if provided in datos.proyecto
        const proyectoId = await this.resolveProjectId(createMinutaDto, sanitizedData);

        // Create minuta in database
        const minuta = await this.prisma.minutasDefinitivas.create({
            data: {
                Dato: sanitizedData.datos,
                DatoAdicional: sanitizedData.datos_adicionales || {},
                DatoMapaVenta: sanitizedData.datos_mapa_ventas,
                Comentario: sanitizedData.comentarios,
                Estado: sanitizedData.estado,
                Proyecto: proyectoId,
                UsuarioId: userId,
                FechaCreacion: new Date(),
                UpdatedAt: new Date(),
                ClienteInteresado: createMinutaDto.clienteInteresadoDni || null,
            },
        });

        // Reserve associated units
        const unidadIds = this.extractUnitIds(sanitizedData);
        await this.handleUnitReservation(unidadIds);

        // Update detallesventa with client DNI
        await this.updateDetallesVenta(unidadIds, createMinutaDto);

        // Emit WebSocket event
        this.emitCreatedEvent(minuta, proyectoId);

        // Audit log
        await this.logCreate(userId, sanitizedData, unidadIds);

        return minuta;
    }

    private sanitizeCreateData(dto: CreateMinutaDto) {
        return {
            ...dto,
            comentarios: dto.comentarios ? sanitizeString(dto.comentarios) : undefined,
            datos: sanitizeObject(dto.datos),
            datos_adicionales: dto.datos_adicionales ? sanitizeObject(dto.datos_adicionales) : undefined,
            datos_mapa_ventas: dto.datos_mapa_ventas ? sanitizeObject(dto.datos_mapa_ventas) : undefined,
        };
    }

    private async resolveProjectId(dto: CreateMinutaDto, sanitizedData: any): Promise<string | null> {
        let proyectoId = dto.proyecto || null;

        if (!proyectoId && sanitizedData.datos?.proyecto) {
            const proyecto = await this.prisma.proyectos.findFirst({
                where: { Nombre: sanitizedData.datos.proyecto },
                select: { Id: true }
            });
            if (proyecto) proyectoId = proyecto.Id;
        }

        return proyectoId;
    }

    private extractUnitIds(sanitizedData: any): string[] {
        return sanitizedData.datos?.unidades?.map((u: { id: string }) => u.id).filter(Boolean) || [];
    }

    private async handleUnitReservation(unidadIds: string[]): Promise<void> {
        if (unidadIds.length > 0) {
            await this.unitStateService.reservarUnidades(unidadIds);
        }
    }

    private async updateDetallesVenta(unidadIds: string[], dto: CreateMinutaDto): Promise<void> {
        if (dto.clienteInteresadoDni && unidadIds.length > 0) {
            const upsertOperations = unidadIds.map((unidadId: string) =>
                this.prisma.detallesVenta.upsert({
                    where: { UnidadId: unidadId },
                    update: { ClienteInteresado: dto.clienteInteresadoId || null },
                    create: { UnidadId: unidadId, ClienteInteresado: dto.clienteInteresadoId || null },
                })
            );
            await Promise.all(upsertOperations);
        }
    }

    private emitCreatedEvent(minuta: any, proyectoId: string | null): void {
        if (this.gateway) {
            this.gateway.emitMinutaCreated({
                minutaId: minuta.Id,
                proyecto: proyectoId || undefined,
                estado: 'pendiente',
            });
        }
    }

    private async logCreate(userId: string, sanitizedData: any, unidadIds: string[]): Promise<void> {
        const userEmail = await this.getUserEmail(userId);
        await this.logger.agregarLog({
            motivo: 'Creación de Minuta',
            descripcion: `Minuta creada exitosamente para proyecto ${sanitizedData.datos?.proyecto}. Unidades: ${unidadIds.length}`,
            impacto: 'Alto',
            tablaafectada: 'minutas_definitivas',
            usuarioID: userId,
            usuarioemail: userEmail,
        });
    }

    // ==================== UPDATE ====================

    async update(id: string, updateMinutaDto: any, userId: string, findOneFn: (id: string, userId: string) => Promise<any>) {
        // Fetch minuta and permissions in parallel
        const [minuta, userPermissions] = await Promise.all([
            this.prisma.minutasDefinitivas.findUnique({
                where: { Id: id },
                select: { Id: true, Estado: true, Version: true, UsuarioId: true, Proyecto: true, Dato: true },
            }),
            this.getCachedUserPermissions(userId),
        ]);

        if (!minuta) {
            throw new NotFoundException(`Minuta con ID ${id} no encontrada.`);
        }

        // Validate permissions
        const userRoleInProject = await this.validateUpdatePermissions(minuta, userId, userPermissions);

        // Validate optimistic locking
        this.validateVersion(updateMinutaDto, minuta);

        // Check if global admin
        const isGlobalAdmin = userPermissions.roles?.some((r: string) => ['superadminmv', 'adminmv'].includes(r));

        // Handle state transition if needed
        if (updateMinutaDto.estado && updateMinutaDto.estado !== minuta.Estado) {
            await this.stateService.handleStateChange(
                minuta,
                updateMinutaDto.estado,
                updateMinutaDto.comentarios,
                userRoleInProject,
                isGlobalAdmin || false
            );
        }

        // Sanitize and execute update
        const sanitizedData = this.sanitizeUpdateData(updateMinutaDto);
        await this.executeUpdate(id, minuta.Version, sanitizedData);

        // Fetch updated minuta
        const updatedMinuta = await this.prisma.minutasDefinitivas.findUnique({
            where: { Id: id },
            select: {
                Id: true, Proyecto: true, Estado: true, Comentario: true, FechaCreacion: true,
                UpdatedAt: true, Version: true, UsuarioId: true,
                users: { select: { email: true } },
                Proyectos: { select: { Nombre: true } },
            },
        });

        // Emit events
        if (updatedMinuta) {
            await this.emitUpdateEvents(minuta, updatedMinuta, updateMinutaDto, userId);
        }

        return this.cleanResponse(updatedMinuta);
    }

    private validateVersion(dto: any, minuta: any): void {
        if (dto.version !== undefined && dto.version !== minuta.Version) {
            throw new ConflictException(
                'La minuta ha sido modificada por otro usuario. Por favor, recarga la página y vuelve a intentar.'
            );
        }
    }

    private sanitizeUpdateData(dto: any) {
        return {
            ...dto,
            comentarios: dto.comentarios ? sanitizeString(dto.comentarios) : undefined,
            datos: dto.datos ? sanitizeObject(dto.datos) : undefined,
            datos_adicionales: dto.datos_adicionales ? sanitizeObject(dto.datos_adicionales) : undefined,
            datos_mapa_ventas: dto.datos_mapa_ventas ? sanitizeObject(dto.datos_mapa_ventas) : undefined,
        };
    }

    private async executeUpdate(id: string, version: number, data: any): Promise<void> {
        try {
            await this.prisma.minutasDefinitivas.update({
                where: { Id: id, Version: version },
                data: {
                    Estado: data.estado || undefined,
                    Comentario: data.comentarios || undefined,
                    Dato: data.datos || undefined,
                    DatoAdicional: data.datos_adicionales || undefined,
                    DatoMapaVenta: data.datos_mapa_ventas || undefined,
                    Version: { increment: 1 },
                    UpdatedAt: new Date(),
                },
            });
        } catch (error: unknown) {
            const prismaError = error as { code?: string };
            if (prismaError.code === 'P2025') {
                throw new ConflictException('La minuta ha sido modificada por otro usuario.');
            }
            throw error;
        }
    }

    private async emitUpdateEvents(originalMinuta: any, updatedMinuta: any, dto: any, userId: string): Promise<void> {
        if (this.gateway && dto.estado && dto.estado !== originalMinuta.Estado) {
            this.gateway.emitMinutaStateChanged({
                minutaId: updatedMinuta.Id,
                proyecto: updatedMinuta.Proyecto || undefined,
                estado: dto.estado,
            });

            const userEmail = await this.getUserEmail(userId);
            await this.logger.agregarLog({
                motivo: 'Cambio de Estado de Minuta',
                descripcion: `Estado cambiado de '${originalMinuta.Estado}' a '${dto.estado}'.`,
                impacto: dto.estado === 'cancelada' ? 'Alto' : 'Medio',
                tablaafectada: 'minutas_definitivas',
                usuarioID: userId,
                usuarioemail: userEmail,
            });
        }
    }

    private cleanResponse(minuta: any) {
        if (!minuta) return undefined;
        const { UsuarioId: _, ...safe } = minuta;
        if (safe.users) safe.users.email = PrivacyHelpers.maskEmail(safe.users.email);
        return safe;
    }

    async validateUpdatePermissions(minuta: any, userId: string, userPermissions: UserPermissions): Promise<string | undefined> {
        const canViewAll = userPermissions.permissions.includes('verTodasMinutas');
        const isOwner = minuta.UsuarioId === userId;

        const projectId = minuta.Proyecto;
        let userRoleInProject: string | undefined = undefined;

        if (projectId) {
            userRoleInProject = await this.authService.getUserRoleInProject(userId, projectId) || undefined;
        }

        // Global admin or owner can always edit
        if (canViewAll || isOwner) {
            return userRoleInProject;
        }

        // Check if user has edit permission in this project
        if (userRoleInProject) {
            const projectPermissions = userPermissions.projectIds.includes(projectId);
            if (projectPermissions) {
                const canEdit = userPermissions.permissions.includes('editarMinuta');
                if (!canEdit) {
                    throw new ForbiddenException('No tienes permiso para editar minutas en este proyecto.');
                }
            }
        }

        return userRoleInProject;
    }

    // ==================== REMOVE ====================

    async remove(id: string, userId: string, findOneFn: (id: string, userId: string) => Promise<any>) {
        // Validate ownership before deleting
        await findOneFn(id, userId);

        const deletedMinuta = await this.prisma.minutasDefinitivas.delete({
            where: { Id: id },
        });

        // Audit log
        const userEmail = await this.getUserEmail(userId);
        await this.logger.agregarLog({
            motivo: 'Eliminación de Minuta',
            descripcion: `Minuta ID ${id} eliminada permanentemente.`,
            impacto: 'Alto',
            tablaafectada: 'minutas_definitivas',
            usuarioID: userId,
            usuarioemail: userEmail,
        });

        return deletedMinuta;
    }

    // ==================== HELPERS ====================

    private async getUserEmail(userId: string): Promise<string> {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            select: { email: true }
        });
        return user?.email || 'unknown';
    }

    private async getCachedUserPermissions(userId: string): Promise<UserPermissions> {
        return this.permissionsCache.getOrFetch(userId, async () => {
            // Fetch permissions from database
            const [userRoles, userProjects] = await Promise.all([
                this.prisma.usuariosRoles.findMany({
                    where: { IdUsuario: userId },
                    include: {
                        Roles: {
                            select: { Nombre: true },
                            include: {
                                RolesPermisos: {
                                    select: {
                                        Permisos: { select: { Nombre: true } }
                                    }
                                }
                            }
                        }
                    }
                }),
                this.prisma.usuariosProyectos.findMany({
                    where: { IdUsuario: userId },
                    select: { IdProyecto: true }
                })
            ]);

            const roles = userRoles.map(ur => ur.Roles?.Nombre).filter((n): n is string => typeof n === 'string');
            const permissions = userRoles.flatMap(ur =>
                ur.Roles?.RolesPermisos?.map(rp => rp.Permisos?.Nombre) || []
            ).filter((n): n is string => typeof n === 'string');
            const projectIds = userProjects.map(up => up.IdProyecto);

            return { permissions, projectIds, roles };
        });
    }
}
