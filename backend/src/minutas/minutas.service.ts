import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Optional, Inject, forwardRef } from '@nestjs/common';
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { CreateMinutaProvisoriaDto } from './dto/create-minuta-provisoria.dto';
import { FindAllMinutasQueryDto } from './dto/find-all-minutas-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MinutasGateway } from './minutas.gateway';
import { sanitizeString, sanitizeObject } from '../common/sanitize.helper';
import { PrivacyHelpers } from '../common/privacy.helper';
import { UnitStateService } from './services/unit-state.service';
import { LoggerService } from '../logger/logger.service';
import { AuthorizationService } from '../auth/authorization/authorization.service'; // 🔒 Import AuthorizationService
import { ROLE_PERMISSIONS } from '../auth/authorization/roles.constants'; // 🔒 Import Role Constants

// Definir transiciones de estado válidas (todoo en minúsculas)
const VALID_STATE_TRANSITIONS: Record<string, string[]> = {
  'pendiente': ['aprobada', 'cancelada', 'en_edicion'],
  'aprobada': ['firmada', 'cancelada', 'en_edicion'],
  'en_edicion': ['pendiente'],
  'firmada': [], // Estado final
  'cancelada': [], // Estado final
  // Estados legacy para retrocompatibilidad
  'provisoria': ['en revisión', 'pendiente', 'rechazada'],
  'en revisión': ['definitiva', 'aprobada', 'provisoria', 'rechazada'],
  'definitiva': [],
  'rechazada': ['provisoria', 'pendiente'],
};

// Función helper para normalizar estados a minúsculas
function normalizeEstado(estado: string): string {
  return estado?.toLowerCase().trim() || '';
}

// ⚡ CACHE: Cache in-memory para permisos de usuario (TTL: 5 minutos)
interface UserPermissionsCache {
  permissions: string[];
  projectIds: string[];
  roles: string[];
  cachedAt: number;
}
const PERMISSIONS_CACHE_TTL_MS = 1 * 60 * 1000; // 1 minuto (Reducido para mayor seguridad)
const userPermissionsCache = new Map<string, UserPermissionsCache>();

@Injectable()
export class MinutasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitStateService: UnitStateService,
    private readonly logger: LoggerService,
    private readonly authService: AuthorizationService, // 🔒 Injected AuthorizationService
    @Optional() @Inject(forwardRef(() => MinutasGateway)) private readonly gateway?: MinutasGateway,
  ) { }

  // ⚡ Método para obtener permisos con cache
  private async getCachedUserPermissions(userId: string): Promise<{ permissions: string[]; projectIds: string[]; roles: string[] }> {
    const cached = userPermissionsCache.get(userId);
    const now = Date.now();

    // Si hay cache válido, usarlo
    if (cached && (now - cached.cachedAt) < PERMISSIONS_CACHE_TTL_MS) {
      return { permissions: cached.permissions, projectIds: cached.projectIds, roles: cached.roles };
    }

    // Si no hay cache o expiró, hacer la query
    // ⚡ OPTIMIZED QUERY: Fetch Permissions, Roles, and Projects using Prisma Client to avoid SQL Injection Hotspots
    const [userRoles, userProjects] = await Promise.all([
      this.prisma.usuariosRoles.findMany({
        where: { IdUsuario: userId },
        include: {
          Roles: {
            select: {
              Nombre: true,
              RolesPermisos: {
                include: {
                  Permisos: {
                    select: { Nombre: true }
                  }
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

    // Flatten and extract distinct values
    const permissions = [...new Set(
      userRoles.flatMap(ur =>
        ur.Roles.RolesPermisos.map(rp => rp.Permisos?.Nombre).filter(Boolean)
      )
    )] as string[];

    const roles = [...new Set(
      userRoles.map(ur => ur.Roles.Nombre).filter(Boolean)
    )] as string[];

    const projectIds = [...new Set(
      userProjects.map(up => up.IdProyecto).filter(Boolean)
    )] as string[];

    // Guardar en cache
    userPermissionsCache.set(userId, {
      permissions,
      projectIds,
      roles,
      cachedAt: now,
    });

    return { permissions, projectIds, roles };
  }

  // Método para invalidar cache de un usuario (llamar cuando cambien sus permisos/proyectos)
  public invalidateUserCache(userId: string): void {
    userPermissionsCache.delete(userId);
  }

  // Método para limpiar todo el cache (útil para testing o cambios masivos)
  public clearAllCache(): void {
    userPermissionsCache.clear();
  }

  async create(createMinutaDto: CreateMinutaDto, userId: string) {
    // 🔒 SEGURIDAD: No loguear DTOs completos - pueden contener datos sensibles

    // Sanitizar datos antes de guardar
    const sanitizedData = {
      ...createMinutaDto,
      comentarios: createMinutaDto.comentarios
        ? sanitizeString(createMinutaDto.comentarios)
        : undefined,
      datos: sanitizeObject(createMinutaDto.datos),
      datos_adicionales: createMinutaDto.datos_adicionales
        ? sanitizeObject(createMinutaDto.datos_adicionales)
        : undefined,
      datos_mapa_ventas: createMinutaDto.datos_mapa_ventas
        ? sanitizeObject(createMinutaDto.datos_mapa_ventas)
        : undefined,
    };

    // Buscar el proyecto por nombre si viene en datos.proyecto
    let proyectoId = createMinutaDto.proyecto || null;

    if (!proyectoId && sanitizedData.datos?.proyecto) {
      const nombreProyecto = sanitizedData.datos.proyecto;

      const proyecto = await this.prisma.proyectos.findFirst({
        where: { Nombre: nombreProyecto },
        select: { Id: true }
      });

      if (proyecto) {
        proyectoId = proyecto.Id;
      }
    }

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
        // ClienteInteresadoId: createMinutaDto.clienteInteresadoId || null, // Descomentar si existe en el esquema actualizado
      },
    });

    // Reservar unidades asociadas a la minuta
    const unidadIds = sanitizedData.datos?.unidades?.map((u: { id: string }) => u.id).filter(Boolean) || [];
    if (unidadIds.length > 0) {
      await this.unitStateService.reservarUnidades(unidadIds);
    }

    // Actualizar detallesventa con el DNI del cliente interesado
    if (createMinutaDto.clienteInteresadoDni && unidadIds.length > 0) {
      // 🔒 SEGURIDAD: No loguear DNIs de clientes

      for (const unidadId of unidadIds) {
        await this.prisma.detallesVenta.upsert({
          where: { UnidadId: unidadId },
          update: {
            ClienteInteresado: createMinutaDto.clienteInteresadoId || null,
          },
          create: {
            UnidadId: unidadId,
            ClienteInteresado: createMinutaDto.clienteInteresadoId || null,
          },
        });
      }
    }


    // Emitir evento WebSocket a admins
    if (this.gateway) {
      this.gateway.emitMinutaCreated({
        minutaId: minuta.Id,
        proyecto: proyectoId || undefined,
        estado: 'pendiente',
        // 🔒 SEGURIDAD: usuarioId eliminado
      });
    }

    // AUDIT LOG: Creación de Minuta
    const userEmailRaw = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    await this.logger.agregarLog({
      motivo: 'Creación de Minuta',
      descripcion: `Minuta creada exitosamente para proyecto ${sanitizedData.datos?.proyecto}. Unidades: ${unidadIds.length}`,
      impacto: 'Alto',
      tablaafectada: 'minutas_definitivas',
      usuarioID: userId,
      usuarioemail: userEmailRaw?.email || 'unknown',
    });

    return minuta;
  }

  async createProvisoria(data: CreateMinutaProvisoriaDto, userId: string) {
    // Need to create this table or use minutas_definitivas with estado='Provisoria'
    throw new Error('createProvisoria not implemented - table migration needed');
  }

  async updateProvisoria(id: string, data: any) {
    throw new Error('updateProvisoria not implemented - table migration needed');
  }

  async findAll(query: FindAllMinutasQueryDto, userId: string) {
    // ⚡ OPTIMIZACIÓN: Usar cache para permisos y proyectos del usuario
    const { permissions: userPermissions, projectIds: userProjectIds } = await this.getCachedUserPermissions(userId);

    // Construir where clause usando helper
    const where = await this._buildWhereClause(query, userId, userPermissions, userProjectIds);

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Máximo 100
    const skip = (page - 1) * limit;

    // Validar y sanitizar sortBy y sortOrder
    const allowedSortFields = ['FechaCreacion', 'UpdatedAt', 'proyecto', 'estado'];
    const sortBy = query.sortBy && allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : 'FechaCreacion';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    // ⚡⚡ OPTIMIZACIÓN CRÍTICA: Ejecutar count y findMany EN PARALELO
    const [total, minutasRaw] = await Promise.all([
      // Query 1: Count
      this.prisma.minutasDefinitivas.count({ where }),

      // Query 2: FindMany con select optimizado (excluye campos JSON pesados)
      // 🔒 SEGURIDAD: NO incluir usuario_id en la respuesta
      this.prisma.minutasDefinitivas.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: skip,
        select: {
          Id: true,
          // usuario_id: ELIMINADO por seguridad - exponía IDs internos
          FechaCreacion: true,
          Estado: true,
          Comentario: true,
          Proyecto: true,
          Version: true,
          UpdatedAt: true,
          users: {
            select: {
              email: true,
            },
          },
          Proyectos: {
            select: {
              Nombre: true,
            },
          },
        }
      }),
    ]);

    // 🔒 SEGURIDAD: Enmascarar emails en la respuesta
    const safeMinutas = minutasRaw.map(m => ({
      ...m,
      users: (m as any).users ? { email: PrivacyHelpers.maskEmail((m as any).users.email) } : null,
    }));

    return {
      data: safeMinutas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 🔒 Helper privado para reducir complejidad de findAll
  // 🔒 Helper privado simplificado
  private async _buildWhereClause(
    query: FindAllMinutasQueryDto,
    userId: string,
    userPermissions: string[],
    userProjectIds: string[]
  ): Promise<any> {
    const where: any = {};

    // 1. Filtros de Permisos
    const permissionFilter = this._buildPermissionsFilter(query, userId, userPermissions, userProjectIds);
    if (permissionFilter) {
      Object.assign(where, permissionFilter);
    }

    // 2. Filtro de Estado
    if (query.estado) where.Estado = query.estado;

    // 3. Filtros de Fechas
    const dateFilter = this._buildDateFilter(query);
    if (dateFilter) {
      where.FechaCreacion = dateFilter;
    }

    return where;
  }

  // Helper para filtros de permisos
  private _buildPermissionsFilter(query: FindAllMinutasQueryDto, userId: string, userPermissions: string[], userProjectIds: string[]): any {
    const canViewAll = userPermissions.includes('verTodasMinutas');
    const canSign = userPermissions.includes('firmarMinuta');

    if (canViewAll) {
      if (query.proyecto) return { Proyecto: query.proyecto };
      if (query.usuario_id) return { UsuarioId: query.usuario_id };
      return null;
    }

    if (canSign) {
      return {
        OR: [
          { Estado: 'aprobada' },
          { Estado: 'firmada' },
          { UsuarioId: userId }
        ]
      };
    }

    // Default: Proyectos asignados o Propias
    const orConditions = [{ UsuarioId: userId }];

    if (userProjectIds.length > 0) {
      if (query.proyecto) {
        if (userProjectIds.includes(query.proyecto)) {
          orConditions.push({ Proyecto: query.proyecto } as any);
        }
      } else {
        orConditions.push({ Proyecto: { in: userProjectIds } } as any);
      }
    }

    return { OR: orConditions };
  }

  // Helper para filtros de fecha
  private _buildDateFilter(query: FindAllMinutasQueryDto): any {
    if (!query.fechaDesde && !query.fechaHasta) return null;

    const dateFilter: any = {};
    if (query.fechaDesde) {
      const fecha = new Date(query.fechaDesde);
      if (Number.isNaN(fecha.getTime())) throw new BadRequestException('fechaDesde inválida');
      dateFilter.gte = fecha;
    }

    if (query.fechaHasta) {
      const fecha = new Date(query.fechaHasta);
      if (Number.isNaN(fecha.getTime())) throw new BadRequestException('fechaHasta inválida');
      dateFilter.lte = fecha;
    }
    return dateFilter;
  }

  async findOne(id: string, userId: string) {
    const minuta = await this.prisma.minutasDefinitivas.findUnique({
      where: { Id: id },
      // SEGURIDAD: Usar select para controlar exactamente qué campos devolver
      // El UsuarioId se obtiene internamente para validación pero NO se expone al cliente
      select: {
        Id: true,
        Proyecto: true,
        Estado: true,
        Comentario: true,
        Dato: true,
        DatoAdicional: true,
        DatoMapaVenta: true,
        FechaCreacion: true,
        UpdatedAt: true,
        Version: true,
        UsuarioId: true, // Para validación interna, se elimina antes de responder
        users: {
          select: {
            email: true,
          },
        },
        Proyectos: {
          select: {
            Nombre: true,
          },
        },
      },
    }) as any;

    if (!minuta) {
      throw new NotFoundException(`Minuta con ID ${id} no encontrada.`);
    }

    // SEGURIDAD: Verificar permisos usando userId antes de eliminarlo de la respuesta
    const userPermissions = await this.getUserPermissions(userId);
    const canViewAll = userPermissions.some(p => p.Nombre === 'verTodasMinutas');
    const canSign = userPermissions.some(p => p.Nombre === 'firmarMinuta');

    // Guardar UsuarioId para validación y luego eliminarlo de la respuesta
    const minutaUsuarioId = minuta.UsuarioId;

    // Si NO es admin, validar que el usuario tiene acceso
    if (!canViewAll) {
      // Opción 1: Es el creador de la minuta
      const isOwner = minutaUsuarioId === userId;

      // Opción 2: Tiene acceso al proyecto de la minuta
      let hasProjectAccess = false;
      if (minuta.Proyecto) {
        const access = await this.prisma.usuariosProyectos.findFirst({
          where: {
            IdUsuario: userId,
            IdProyecto: minuta.Proyecto,
          },
        });
        hasProjectAccess = !!access;
      }

      // Opción 3: Es firmante y la minuta está en estado aprobada o firmada
      const canSignerView = canSign && ['aprobada', 'firmada'].includes(minuta.Estado?.toLowerCase());

      if (!isOwner && !hasProjectAccess && !canSignerView) {
        throw new ForbiddenException(
          `No tienes permiso para acceder a esta minuta. Debes ser el creador, tener acceso al proyecto, o ser firmante de una minuta aprobada.`
        );
      }
    }

    // SEGURIDAD: Eliminar UsuarioId de la respuesta - no debe exponerse al cliente
    const { UsuarioId: _, ...safeMinuta } = minuta;

    // 🔒 SEGURIDAD: Enmascarar email del usuario
    if ((safeMinuta).users) {
      (safeMinuta).users.email = PrivacyHelpers.maskEmail((safeMinuta).users.email);
    }

    return safeMinuta;
  }

  async update(id: string, updateMinutaDto: any, userId: string, userRole?: string) {
    // ⚡ OPTIMIZACIÓN: Obtener minuta y permisos en paralelo
    const [minuta, userPermissions] = await Promise.all([
      this.prisma.minutasDefinitivas.findUnique({
        where: { Id: id },
        select: {
          Id: true,
          Estado: true,
          Version: true,
          UsuarioId: true,
          Proyecto: true,
          Dato: true, // Necesario para extraer unidades
        },
      }),
      this.getCachedUserPermissions(userId), // Usa cache
    ]);

    if (!minuta) {
      throw new NotFoundException(`Minuta con ID ${id} no encontrada.`);
    }

    // 1. Validar permisos para esta operación (Scope aware)
    // Devuelve el rol en el proyecto si existe, para usarlo en validaciones posteriores
    const userRoleInProject = await this._validateUpdatePermissions(minuta, userId, userPermissions);

    // SEGURIDAD: Validar version para optimistic locking
    if (updateMinutaDto.version !== undefined && updateMinutaDto.version !== minuta.Version) {
      throw new ConflictException(
        `La minuta ha sido modificada por otro usuario. Por favor, recarga la página y vuelve a intentar.`
      );
    }

    // Explicit bypass for global admins (SuperAdminMV / AdminMV)
    const isGlobalAdmin = userPermissions.roles?.some(r => ['superadminmv', 'adminmv'].includes(r));

    // 2. Validar transición de estado
    if (updateMinutaDto.estado && updateMinutaDto.estado !== minuta.Estado) {
      await this._handleStateChange(minuta, updateMinutaDto, userRoleInProject, isGlobalAdmin || false);
    }

    // Sanitizar datos y ejecutar Update en DB
    const sanitizedData = this._sanitizeUpdateData(updateMinutaDto);
    await this._executeUpdateInDb(id, minuta.Version, sanitizedData);

    // ⚡ OPTIMIZACIÓN: Retornar solo campos necesarios
    const updatedMinuta = await this.prisma.minutasDefinitivas.findUnique({
      where: { Id: id },
      select: {
        Id: true, Proyecto: true, Estado: true, Comentario: true, FechaCreacion: true,
        UpdatedAt: true, Version: true, UsuarioId: true,
        users: { select: { email: true } },
        Proyectos: { select: { Nombre: true } },
      },
    });

    // 📡 Emitir eventos
    if (updatedMinuta) {
      await this._emitUpdateEvents(minuta, updatedMinuta, updateMinutaDto, userId);
    }

    // 🔒 SEGURIDAD: Retornar limpio
    return this._cleanResponse(updatedMinuta);
  }

  private _sanitizeUpdateData(dto: any) {
    return {
      ...dto,
      comentarios: dto.comentarios ? sanitizeString(dto.comentarios) : undefined,
      datos: dto.datos ? sanitizeObject(dto.datos) : undefined,
      datos_adicionales: dto.datos_adicionales ? sanitizeObject(dto.datos_adicionales) : undefined,
      datos_mapa_ventas: dto.datos_mapa_ventas ? sanitizeObject(dto.datos_mapa_ventas) : undefined,
    };
  }

  private async _executeUpdateInDb(id: string, version: number, data: any) {
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
    } catch (error) {
      if (error.code === 'P2025') throw new ConflictException('La minuta ha sido modificada por otro usuario.');
      if (error instanceof ConflictException) throw error;
      throw error;
    }
  }

  private async _emitUpdateEvents(originalMinuta: any, updatedMinuta: any, dto: any, userId: string) {
    if (this.gateway && dto.estado && dto.estado !== originalMinuta.Estado) {
      this.gateway.emitMinutaStateChanged({
        minutaId: updatedMinuta.Id,
        proyecto: updatedMinuta.Proyecto || undefined,
        estado: dto.estado,
      });

      const userEmailRaw = await this.prisma.users.findUnique({ where: { id: userId }, select: { email: true } });
      await this.logger.agregarLog({
        motivo: 'Cambio de Estado de Minuta',
        descripcion: `Estado cambiado de '${originalMinuta.Estado}' a '${dto.estado}'.`,
        impacto: dto.estado === 'cancelada' ? 'Alto' : 'Medio',
        tablaafectada: 'minutas_definitivas',
        usuarioID: userId,
        usuarioemail: userEmailRaw?.email || 'unknown',
      });
    }
  }

  private _cleanResponse(minuta: any) {
    if (!minuta) return null;
    const { UsuarioId: _, ...safe } = minuta;
    if (safe.users) safe.users.email = PrivacyHelpers.maskEmail(safe.users.email);
    return safe;
  }

  // 🔒 Helper para validar permisos de update
  private async _validateUpdatePermissions(minuta: any, userId: string, userPermissions: any): Promise<string | null> {
    const canViewAll = userPermissions.permissions.includes('verTodasMinutas');
    const isOwner = minuta.UsuarioId === userId;

    const projectId = minuta.Proyecto;
    let userRoleInProject = null;

    if (projectId) {
      userRoleInProject = await this.authService.getUserRoleInProject(userId, projectId);
    }
    const hasProjectAccess = !!userRoleInProject;

    const isGlobalAdmin = userPermissions.roles?.some((r: string) => ['superadminmv', 'adminmv'].includes(r));

    if (!isGlobalAdmin && !canViewAll && !isOwner) {
      if (!hasProjectAccess) {
        throw new ForbiddenException(`No tienes acceso al proyecto de esta minuta.`);
      }

      const rolePermissions = userRoleInProject ? (ROLE_PERMISSIONS[userRoleInProject] || []) : [];
      const canSign = rolePermissions.includes('firmarMinuta');
      const canSignerView = canSign && ['aprobada', 'firmada'].includes(minuta.Estado?.toLowerCase());

      if (!canSignerView) {
        const canEdit = rolePermissions.includes('editarMinuta') || rolePermissions.includes('aprobarRechazarMinuta');
        if (!canEdit) {
          throw new ForbiddenException(`No tienes permiso para editar minutas en este proyecto.`);
        }
      }
    }
    return userRoleInProject;
  }

  // 🔒 Helper para manejar lógica de cambio de estado
  private async _handleStateChange(
    minuta: any,
    updateMinutaDto: any,
    userRoleInProject: string | null,
    isGlobalAdmin: boolean
  ) {
    // 1. Validar Transición
    this._validateStateTransition(minuta.Estado, updateMinutaDto.estado, updateMinutaDto.comentarios);

    // 2. Validar Permisos de Aprobación
    this._validateApprovalPermissions(updateMinutaDto.estado, userRoleInProject, isGlobalAdmin);

    // 3. Manejar Efectos en Unidades
    await this._handleUnitEffects(minuta, updateMinutaDto.estado);
  }

  private _validateStateTransition(currentState: string, newState: string, comments?: string) {
    const estadoActual = normalizeEstado(currentState);
    const estadoNuevo = normalizeEstado(newState);

    const validTransitions = VALID_STATE_TRANSITIONS[estadoActual];
    if (!validTransitions) {
      throw new BadRequestException(`Estado actual '${currentState}' no es válido`);
    }

    if (!validTransitions.includes(estadoNuevo)) {
      throw new BadRequestException(
        `Transición de estado inválida: '${currentState}' → '${newState}'. Transiciones válidas: ${validTransitions.join(', ')}`
      );
    }

    if (['cancelada'].includes(estadoNuevo)) {
      if (!comments || comments.trim() === '') {
        throw new BadRequestException('El motivo de cancelación es obligatorio.');
      }
    }
  }

  private _validateApprovalPermissions(newState: string, userRoleInProject: string | null, isGlobalAdmin: boolean) {
    if (['Definitiva'].includes(newState)) {
      if (!isGlobalAdmin) {
        const permissionsInProject = userRoleInProject ? (ROLE_PERMISSIONS[userRoleInProject] || []) : [];
        if (!permissionsInProject.includes('aprobarRechazarMinuta')) {
          throw new ForbiddenException('No tienes permiso para aprobar minutas en este proyecto.');
        }
      }
    }
  }

  private async _handleUnitEffects(minuta: any, newState: string) {
    const estadoNuevo = normalizeEstado(newState);
    const minutaData = minuta.Dato as { unidades?: { id: string }[] };
    const unidadIds = minutaData?.unidades?.map((u) => u.id).filter(Boolean) || [];

    if (unidadIds.length > 0 && estadoNuevo === 'cancelada') {
      await this.unitStateService.liberarUnidades(unidadIds);
      for (const unidadId of unidadIds) {
        await this.prisma.detallesVenta.updateMany({
          where: { UnidadId: unidadId },
          data: { ClienteInteresado: null },
        });
      }
    }
  }

  private async getUserPermissions(userId: string) {
    const userRoles = await this.prisma.usuariosRoles.findMany({
      where: { IdUsuario: userId },
      include: {
        Roles: {
          include: {
            RolesPermisos: {
              include: {
                Permisos: true,
              },
            },
          },
        },
      },
    });

    const permissions = userRoles.flatMap(ur =>
      ur.Roles.RolesPermisos.map(rp => rp.Permisos)
    );

    return permissions;
  }

  async remove(id: string, userId: string) {
    // Validar propiedad antes de eliminar
    await this.findOne(id, userId);

    const deletedMinuta = await this.prisma.minutasDefinitivas.delete({
      where: { Id: id },
    });

    // 📝 AUDIT LOG: Eliminación de minuta
    const userEmailRaw = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    await this.logger.agregarLog({
      motivo: 'Eliminación de Minuta',
      descripcion: `Minuta ID ${id} eliminada permanentemente.`,
      impacto: 'Alto',
      tablaafectada: 'minutas_definitivas',
      usuarioID: userId,
      usuarioemail: userEmailRaw?.email || 'unknown',
    });

    return deletedMinuta;
  }

  async generate(data: any): Promise<{ buffer: Buffer; contentType: string }> {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('N8N_WEBHOOK_URL not configured');
    }

    // 🔒 SEGURIDAD: Validar URL para prevenir SSRF
    try {
      const url = new URL(webhookUrl);

      // Rechazar protocolos peligrosos
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Only HTTP/HTTPS protocols are allowed');
      }

      // Rechazar IPs internas/locales
      const hostname = url.hostname.toLowerCase();
      const internalPatterns = [
        'localhost',
        '127.',
        '10.',
        '192.168.',
        '172.16.', '172.17.', '172.18.', '172.19.',
        '172.20.', '172.21.', '172.22.', '172.23.',
        '172.24.', '172.25.', '172.26.', '172.27.',
        '172.28.', '172.29.', '172.30.', '172.31.',
        '169.254.',
        '0.0.0.0',
        '::1',
        '[::1]',
      ];

      if (internalPatterns.some(pattern => hostname.startsWith(pattern) || hostname === pattern.replace('.', ''))) {
        throw new Error('Internal/local URLs are not allowed');
      }
    } catch (e) {
      if (e instanceof TypeError) {
        throw new Error('Invalid webhook URL configuration');
      }
      throw e;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error generating document: ${response.statusText}`);
    }

    // 🔒 SEGURIDAD: Validar Content-Length si existe
    const contentLength = response.headers.get('content-length');
    const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB Limit

    if (contentLength && parseInt(contentLength) > MAX_SIZE_BYTES) {
      throw new BadRequestException('El documento generado excede el límite de tamaño permitido (50MB).');
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    
    // Obtener buffer con límite de tamaño
    const arrayBuffer = await response.arrayBuffer();
    
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
       throw new BadRequestException('El documento generado excede el límite de tamaño permitido (50MB).');
    }

    const buffer = Buffer.from(arrayBuffer);

    return { buffer, contentType };
  }
}
