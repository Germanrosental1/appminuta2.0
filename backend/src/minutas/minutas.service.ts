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

// Definir transiciones de estado válidas (en minúsculas)
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
    // ⚡ OPTIMIZED QUERY: Fetch Permissions, Roles, and Projects in one go
    const userDataRaw: any[] = await this.prisma.$queryRaw`
      SELECT 
        DISTINCT p.nombre as permiso_nombre, 
        up.idproyecto,
        r.nombre as rol_nombre
      FROM "usuarios-roles" ur
      LEFT JOIN roles r ON ur.idrol = r.id
      LEFT JOIN "roles-permisos" rp ON ur.idrol = rp.idrol
      LEFT JOIN permisos p ON rp.idpermiso = p.id
      LEFT JOIN "usuarios-proyectos" up ON ur.idusuario = up.idusuario
      WHERE ur.idusuario = ${userId}::uuid
    `;

    const permissions = [...new Set(userDataRaw.map(row => row.permiso_nombre).filter(Boolean))] as string[];
    const projectIds = [...new Set(userDataRaw.map(row => row.idproyecto).filter(Boolean))] as string[];
    const roles = [...new Set(userDataRaw.map(row => row.rol_nombre).filter(Boolean))] as string[];

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
        where: { nombre: nombreProyecto },
        select: { id: true }
      });

      if (proyecto) {
        proyectoId = proyecto.id;
      }
    }

    // Exclude clienteInteresadoDni from spread - it's not a valid Prisma field
    const { clienteInteresadoDni: _dniToExclude, ...dataForPrisma } = sanitizedData;

    const minuta = await this.prisma.minutas_definitivas.create({
      data: {
        ...dataForPrisma,
        proyecto: proyectoId,
        usuario_id: userId,
        fecha_creacion: new Date(),
        updated_at: new Date(),
        clienteinteresado: createMinutaDto.clienteInteresadoDni || null,
      } as any,
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
        await this.prisma.detallesventa.upsert({
          where: { unidad_id: unidadId },
          update: {
            clienteInteresado: createMinutaDto.clienteInteresadoId || null,
          },
          create: {
            unidad_id: unidadId,
            clienteInteresado: createMinutaDto.clienteInteresadoId || null,
          },
        });
      }
    }


    // Emitir evento WebSocket a admins
    if (this.gateway) {
      this.gateway.emitMinutaCreated({
        minutaId: minuta.id,
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
    // Sanitizar datos
    const sanitizedData = {
      ...data,
      comentarios: data.comentarios ? sanitizeString(data.comentarios) : undefined,
      datos: sanitizeObject(data.datos),
    };

    // Buscar proyecto si es necesario (similar a create)
    let proyectoId = null;
    if (sanitizedData.proyecto) {
      // Si el proyecto viene como nombre en el DTO (string), buscar su ID
      // Nota: El DTO define proyecto como string, asumo que puede ser UUID o Nombre
      // Si es UUID válido, usarlo. Si no, buscar por nombre.
      // Para simplificar y seguir el patrón de create:
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sanitizedData.proyecto);

      if (isUuid) {
        proyectoId = sanitizedData.proyecto;
      } else {
        const proyecto = await this.prisma.proyectos.findFirst({
          where: { nombre: sanitizedData.proyecto },
          select: { id: true }
        });
        if (proyecto) proyectoId = proyecto.id;
      }
    }

    const minuta = await this.prisma.minutas_definitivas.create({
      data: {
        proyecto: proyectoId,
        usuario_id: userId,
        estado: 'provisoria', // Estado forzado para provisoria
        comentarios: sanitizedData.comentarios,
        datos: sanitizedData.datos,
        fecha_creacion: new Date(),
        updated_at: new Date(),
        version: 1,
      } as any,
    });

    return minuta;
  }

  async updateProvisoria(id: string, data: any) {
    const minuta = await this.prisma.minutas_definitivas.findUnique({
      where: { id },
      select: { id: true, version: true, estado: true }
    });

    if (!minuta) {
      throw new NotFoundException(`Minuta provisoria con ID ${id} no encontrada.`);
    }

    // Permitir update solo si es provisoria (opcional, pero seguro)
    if (normalizeEstado(minuta.estado) !== 'provisoria') {
      // Si ya no es provisoria, quizás deberíamos usar el update normal?
      // Por ahora lanzamos error para ser estrictos con la intención de este método
      throw new BadRequestException(`La minuta ${id} no está en estado provisoria.`);
    }

    const sanitizedData = {
      datos: data.datos ? sanitizeObject(data.datos) : undefined,
      comentarios: data.comentarios ? sanitizeString(data.comentarios) : undefined,
    };

    const result = await this.prisma.minutas_definitivas.update({
      where: { id },
      data: {
        ...sanitizedData,
        version: { increment: 1 },
        updated_at: new Date(),
      },
    });

    return result;
  }

  async findAll(query: FindAllMinutasQueryDto, userId: string) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const { sortBy, sortOrder } = this.getSortParams(query);

    // ⚡ OPTIMIZACIÓN: Usar cache para permisos y proyectos del usuario
    const { permissions: userPermissions, projectIds: userProjectIds } = await this.getCachedUserPermissions(userId);

    // Construir WHERE clause
    const where = this.buildFindAllWhereClause(query, userId, userPermissions, userProjectIds);

    // ⚡⚡ OPTIMIZACIÓN CRÍTICA: Ejecutar count y findMany EN PARALELO
    const [total, minutasRaw] = await Promise.all([
      this.prisma.minutas_definitivas.count({ where }),
      this.prisma.minutas_definitivas.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: skip,
        select: {
          id: true,
          fecha_creacion: true,
          estado: true,
          comentarios: true,
          proyecto: true,
          version: true,
          updated_at: true,
          users: {
            select: {
              email: true,
            },
          },
          proyectos: {
            select: {
              nombre: true,
            },
          },
        }
      }),
    ]);

    // 🔒 SEGURIDAD: Enmascarar emails en la respuesta
    const safeMinutas = minutasRaw.map(m => ({
      ...m,
      users: m.users ? { email: PrivacyHelpers.maskEmail(m.users.email) } : null,
    }));

    return {
      data: safeMinutas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private getSortParams(query: FindAllMinutasQueryDto) {
    const allowedSortFields = ['fecha_creacion', 'updated_at', 'proyecto', 'estado'];
    const sortBy = query.sortBy && allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : 'fecha_creacion';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    return { sortBy, sortOrder };
  }

  private buildFindAllWhereClause(
    query: FindAllMinutasQueryDto,
    userId: string,
    userPermissions: string[],
    userProjectIds: string[]
  ): any {
    const where: any = {};
    const canViewAll = userPermissions.includes('verTodasMinutas');
    const canSign = userPermissions.includes('firmarMinuta');

    if (canViewAll) {
      this.applyAdminFilters(where, query);
    } else if (canSign) {
      this.applySignerFilters(where, userId);
    } else {
      this.applyStandardUserFilters(where, query, userId, userProjectIds);
    }

    if (query.estado) where.estado = query.estado;

    const dateFilter = this.buildDateFilter(query.fechaDesde, query.fechaHasta);
    if (dateFilter) where.fecha_creacion = dateFilter;

    return where;
  }

  private applyAdminFilters(where: any, query: FindAllMinutasQueryDto) {
    if (query.proyecto) where.proyecto = query.proyecto;
    if (query.usuario_id) where.usuario_id = query.usuario_id;
  }

  private applySignerFilters(where: any, userId: string) {
    where.OR = [
      { estado: 'aprobada' },
      { estado: 'firmada' },
      { usuario_id: userId }
    ];
  }

  private applyStandardUserFilters(where: any, query: FindAllMinutasQueryDto, userId: string, userProjectIds: string[]) {
    const orConditions: any[] = [{ usuario_id: userId }];

    if (userProjectIds.length > 0) {
      if (query.proyecto) {
        if (userProjectIds.includes(query.proyecto)) {
          orConditions.push({ proyecto: query.proyecto });
        }
      } else {
        orConditions.push({ proyecto: { in: userProjectIds } });
      }
    }
    where.OR = orConditions;
  }

  private buildDateFilter(fechaDesde?: string, fechaHasta?: string) {
    if (!fechaDesde && !fechaHasta) return null;

    const filter: any = {};
    if (fechaDesde) {
      const fecha = new Date(fechaDesde);
      if (Number.isNaN(fecha.getTime())) throw new BadRequestException('fechaDesde inválida');
      filter.gte = fecha;
    }
    if (fechaHasta) {
      const fecha = new Date(fechaHasta);
      if (Number.isNaN(fecha.getTime())) throw new BadRequestException('fechaHasta inválida');
      filter.lte = fecha;
    }
    return filter;
  }

  async findOne(id: string, userId: string) {
    const minuta = await this.prisma.minutas_definitivas.findUnique({
      where: { id },
      // SEGURIDAD: Usar select para controlar exactamente qué campos devolver
      // El usuario_id se obtiene internamente para validación pero NO se expone al cliente
      select: {
        id: true,
        proyecto: true,
        estado: true,
        comentarios: true,
        datos: true,
        datos_adicionales: true,
        datos_mapa_ventas: true,
        fecha_creacion: true,
        updated_at: true,
        version: true,
        usuario_id: true, // Para validación interna, se elimina antes de responder
        users: {
          select: {
            email: true,
          },
        },
        proyectos: {
          select: {
            nombre: true,
          },
        },
      },
    }) as any;

    if (!minuta) {
      throw new NotFoundException(`Minuta con ID ${id} no encontrada.`);
    }

    // SEGURIDAD: Verificar permisos usando userId antes de eliminarlo de la respuesta
    const userPermissions = await this.getUserPermissions(userId);
    const canViewAll = userPermissions.some(p => p.nombre === 'verTodasMinutas');
    const canSign = userPermissions.some(p => p.nombre === 'firmarMinuta');

    // Guardar usuario_id para validación y luego eliminarlo de la respuesta
    const minutaUsuarioId = minuta.usuario_id;

    // Si NO es admin, validar que el usuario tiene acceso
    if (!canViewAll) {
      // Opción 1: Es el creador de la minuta
      const isOwner = minutaUsuarioId === userId;

      // Opción 2: Tiene acceso al proyecto de la minuta
      let hasProjectAccess = false;
      if (minuta.proyecto) {
        const access = await this.prisma.usuarios_proyectos.findFirst({
          where: {
            idusuario: userId,
            idproyecto: minuta.proyecto,
          },
        });
        hasProjectAccess = !!access;
      }

      // Opción 3: Es firmante y la minuta está en estado aprobada o firmada
      const canSignerView = canSign && ['aprobada', 'firmada'].includes(minuta.estado?.toLowerCase());

      if (!isOwner && !hasProjectAccess && !canSignerView) {
        throw new ForbiddenException(
          `No tienes permiso para acceder a esta minuta. Debes ser el creador, tener acceso al proyecto, o ser firmante de una minuta aprobada.`
        );
      }
    }

    // SEGURIDAD: Eliminar usuario_id de la respuesta - no debe exponerse al cliente
    const { usuario_id: _, ...safeMinuta } = minuta;

    // 🔒 SEGURIDAD: Enmascarar email del usuario
    if (safeMinuta.users) {
      safeMinuta.users.email = PrivacyHelpers.maskEmail(safeMinuta.users.email);
    }

    return safeMinuta;
  }

  async update(id: string, updateMinutaDto: any, userId: string, userRole?: string) {
    // ⚡ OPTIMIZACIÓN: Obtener minuta y permisos en paralelo
    const [minuta, userPermissions] = await Promise.all([
      this.prisma.minutas_definitivas.findUnique({
        where: { id },
        select: {
          id: true,
          estado: true,
          version: true,
          usuario_id: true,
          proyecto: true,
          datos: true, // Necesario para extraer unidades
        },
      }),
      this.getCachedUserPermissions(userId),
    ]);

    if (!minuta) throw new NotFoundException(`Minuta con ID ${id} no encontrada.`);

    // Validar permisos
    this.verifyUpdatePermissions(minuta, userPermissions, userId);

    // Optimistic locking
    if (updateMinutaDto.version !== undefined && updateMinutaDto.version !== minuta.version) {
      throw new ConflictException('La minuta ha sido modificada por otro usuario. Por favor, recarga la página.');
    }

    // Validar y procesar cambios de estado
    if (updateMinutaDto.estado && updateMinutaDto.estado !== minuta.estado) {
      this.validateStateTransition(minuta.estado, updateMinutaDto.estado, updateMinutaDto.comentarios, userPermissions.permissions);
      await this.handleUnitStateChanges(minuta, updateMinutaDto.estado);
    }

    // Sanitizar y guardar
    const sanitizedData = this.prepareUpdateData(updateMinutaDto);

    // Update y Fetch (Raw + FindUnique)
    const updatedMinuta = await this.performUpdate(id, minuta.version, sanitizedData);

    // Notificaciones y Logs
    await this.handleUpdateSideEffects(minuta, updateMinutaDto, updatedMinuta, userId);

    // Formatear respuesta segura
    return this.formatUpdateResponse(updatedMinuta);
  }

  private verifyUpdatePermissions(minuta: any, userPermissions: any, userId: string) {
    const canViewAll = userPermissions.permissions.includes('verTodasMinutas');
    const canSign = userPermissions.permissions.includes('firmarMinuta');
    const isOwner = minuta.usuario_id === userId;
    const hasProjectAccess = minuta.proyecto ? userPermissions.projectIds.includes(minuta.proyecto) : false;
    const isGlobalAdmin = userPermissions.roles?.some((r: string) => ['superadminmv', 'adminmv'].includes(r));

    if (!canViewAll && !isOwner && !hasProjectAccess && !isGlobalAdmin && !canSign) {
      throw new ForbiddenException(`No tienes permiso para acceder a esta minuta.`);
    }
  }

  private validateStateTransition(estadoActual: string, estadoNuevo: string, comentarios: string, permissions: string[]) {
    const currentNorm = normalizeEstado(estadoActual);
    const newNorm = normalizeEstado(estadoNuevo);
    const validTransitions = VALID_STATE_TRANSITIONS[currentNorm];

    if (!validTransitions) throw new BadRequestException(`Estado actual '${estadoActual}' no es válido`);
    if (!validTransitions.includes(newNorm)) throw new BadRequestException(`Transición inválida: '${estadoActual}' → '${estadoNuevo}'`);

    if (newNorm === 'cancelada' && (!comentarios?.trim())) {
      throw new BadRequestException('El motivo de cancelación es obligatorio.');
    }

    if (estadoNuevo === 'Definitiva' && !permissions.includes('aprobarRechazarMinuta')) {
      throw new ForbiddenException('No tienes permiso para aprobar minutas.');
    }
  }

  private async handleUnitStateChanges(minuta: any, estadoNuevo: string) {
    const estadoNuevoNorm = normalizeEstado(estadoNuevo);
    const minutaData = minuta.datos as { unidades?: { id: string }[] };
    const unidadIds = minutaData?.unidades?.map((u) => u.id).filter(Boolean) || [];

    if (unidadIds.length > 0 && estadoNuevoNorm === 'cancelada') {
      await this.unitStateService.liberarUnidades(unidadIds);
      await this.prisma.detallesventa.updateMany({
        where: { unidad_id: { in: unidadIds } },
        data: { clienteInteresado: null },
      });
    }
  }

  private prepareUpdateData(dto: any) {
    return {
      ...dto,
      comentarios: dto.comentarios ? sanitizeString(dto.comentarios) : undefined,
      datos: dto.datos ? sanitizeObject(dto.datos) : undefined,
      datos_adicionales: dto.datos_adicionales ? sanitizeObject(dto.datos_adicionales) : undefined,
      datos_mapa_ventas: dto.datos_mapa_ventas ? sanitizeObject(dto.datos_mapa_ventas) : undefined,
    };
  }

  private async performUpdate(id: string, currentVersion: number, data: any) {
    const datosJson = data.datos ? JSON.stringify(data.datos) : null;
    try {
      const result = await this.prisma.$executeRaw`
            UPDATE minutas_definitivas
            SET 
              estado = COALESCE(${data.estado}, estado),
              comentarios = COALESCE(${data.comentarios}, comentarios),
              datos = COALESCE(${datosJson}::jsonb, datos),
              version = ${currentVersion + 1},
              updated_at = NOW()
            WHERE id = ${id}::uuid AND version = ${currentVersion}
        `;
      if (result === 0) throw new ConflictException('Conflicto de versión al actualizar minuta.');

      return await this.prisma.minutas_definitivas.findUnique({
        where: { id },
        select: {
          id: true, proyecto: true, estado: true, comentarios: true,
          fecha_creacion: true, updated_at: true, version: true, usuario_id: true,
          users: { select: { email: true } },
          proyectos: { select: { nombre: true } },
        }
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error.message?.includes('state') || error.message?.includes('estado')) {
        throw new BadRequestException(
          `Error de base de datos: ${error.message}. Esto puede ser causado por un trigger de validación.`
        );
      }
      throw error;
    }
  }

  private async handleUpdateSideEffects(oldMinuta: any, dto: any, newMinuta: any, userId: string) {
    if (this.gateway && dto.estado && dto.estado !== oldMinuta.estado) {
      this.gateway.emitMinutaStateChanged({
        minutaId: newMinuta.id,
        proyecto: newMinuta.proyecto || undefined,
        estado: dto.estado,
      });

      const userEmail = (await this.prisma.users.findUnique({ where: { id: userId }, select: { email: true } }))?.email || 'unknown';
      const impacto = dto.estado === 'cancelada' ? 'Alto' : 'Medio';

      await this.logger.agregarLog({
        motivo: 'Cambio de Estado de Minuta',
        descripcion: `Estado cambiado de '${oldMinuta.estado}' a '${dto.estado}'.`,
        impacto,
        tablaafectada: 'minutas_definitivas',
        usuarioID: userId,
        usuarioemail: userEmail,
      });
    }
  }

  private formatUpdateResponse(minuta: any) {
    if (!minuta) return null;
    const { usuario_id, ...safe } = minuta;
    if (safe.users) safe.users.email = PrivacyHelpers.maskEmail(safe.users.email);
    return safe;
  }

  private async getUserPermissions(userId: string) {
    const userRoles = await this.prisma.usuarios_roles.findMany({
      where: { idusuario: userId },
      include: {
        roles: {
          include: {
            roles_permisos: {
              include: {
                permisos: true,
              },
            },
          },
        },
      },
    });

    const permissions = userRoles.flatMap(ur =>
      ur.roles.roles_permisos.map(rp => rp.permisos)
    );

    return permissions;
  }

  async remove(id: string, userId: string) {
    // Validar propiedad antes de eliminar
    await this.findOne(id, userId);

    const deletedMinuta = await this.prisma.minutas_definitivas.delete({
      where: { id },
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

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const buffer = Buffer.from(await response.arrayBuffer());

    return { buffer, contentType };
  }
}
