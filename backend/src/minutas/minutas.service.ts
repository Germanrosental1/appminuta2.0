import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Optional, Inject, forwardRef } from '@nestjs/common';
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { CreateMinutaProvisoriaDto } from './dto/create-minuta-provisoria.dto';
import { FindAllMinutasQueryDto } from './dto/find-all-minutas-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MinutasGateway } from './minutas.gateway';
import { sanitizeString, sanitizeObject } from '../common/sanitize.helper';
import { UnitStateService } from './services/unit-state.service';
import { LoggerService } from '../logger/logger.service';

// Definir transiciones de estado válidas (todo en minúsculas)
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
const PERMISSIONS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
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
    console.log('📝 Creating minuta with DTO:', JSON.stringify(createMinutaDto, null, 2));

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
    console.log('📌 Proyecto from DTO:', createMinutaDto.proyecto);
    console.log('📌 Proyecto from datos:', sanitizedData.datos?.proyecto);

    if (!proyectoId && sanitizedData.datos?.proyecto) {
      const nombreProyecto = sanitizedData.datos.proyecto;
      console.log('🔍 Buscando proyecto por nombre:', nombreProyecto);

      const proyecto = await this.prisma.proyectos.findFirst({
        where: { nombre: nombreProyecto },
        select: { id: true }
      });

      console.log('Proyecto encontrado:', proyecto);

      if (proyecto) {
        proyectoId = proyecto.id;
      }
    }

    console.log('Guardando con proyectoId:', proyectoId);

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
      console.log('Actualizando detallesventa con cliente DNI:', createMinutaDto.clienteInteresadoDni);

      for (const unidadId of unidadIds) {
        await this.prisma.detallesventa.upsert({
          where: { unidad_id: unidadId },
          update: {
            clienteinteresado: createMinutaDto.clienteInteresadoDni,
          } as any,
          create: {
            unidad_id: unidadId,
            clienteinteresado: createMinutaDto.clienteInteresadoDni,
          } as any,
        });
      }

      // Actualizar unidadesInteresadas del cliente para estadísticas
      const cliente = await this.prisma.clientes.findUnique({
        where: { dni: createMinutaDto.clienteInteresadoDni },
        select: { unidadesInteresadas: true },
      });

      // Obtener array existente o inicializar vacío
      const unidadesActuales = (cliente?.unidadesInteresadas as string[]) || [];

      // Agregar nuevas unidades sin duplicados
      const unidadesActualizadas = [...new Set([...unidadesActuales, ...unidadIds])];

      await this.prisma.clientes.update({
        where: { dni: createMinutaDto.clienteInteresadoDni },
        data: { unidadesInteresadas: unidadesActualizadas },
      });

      console.log('Unidades interesadas actualizadas para cliente:', unidadesActualizadas);
    }


    // Emitir evento WebSocket a admins
    if (this.gateway) {
      this.gateway.emitMinutaCreated({
        minutaId: minuta.id,
        proyecto: proyectoId || undefined,
        estado: 'pendiente',
        usuarioId: userId,
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
    // TODO: Table 'minutas_provisorias' doesn't exist in current schema
    // Need to create this table or use minutas_definitivas with estado='Provisoria'
    throw new Error('createProvisoria not implemented - table migration needed');
  }

  async updateProvisoria(id: string, data: any) {
    // TODO: Table 'minutas_provisorias' doesn't exist in current schema
    throw new Error('updateProvisoria not implemented - table migration needed');
  }

  async findAll(query: FindAllMinutasQueryDto, userId: string) {
    const where: any = {};
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Máximo 100
    const skip = (page - 1) * limit;

    // Validar y sanitizar sortBy y sortOrder
    const allowedSortFields = ['fecha_creacion', 'updated_at', 'proyecto', 'estado'];
    const sortBy = query.sortBy && allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : 'fecha_creacion';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    // ⚡ OPTIMIZACIÓN: Usar cache para permisos y proyectos del usuario
    const { permissions: userPermissions, projectIds: userProjectIds } = await this.getCachedUserPermissions(userId);
    const canViewAll = userPermissions.includes('verTodasMinutas');
    const canSign = userPermissions.includes('firmarMinuta');

    // Si NO es admin y NO es firmante, filtrar por proyectos del usuario O minutas propias
    if (!canViewAll && !canSign) {
      // Construir condición OR: minutas de proyectos asignados O minutas propias
      const orConditions = [];

      // Siempre incluir las minutas creadas por el propio usuario
      orConditions.push({ usuario_id: userId });

      // Si tiene proyectos asignados, también incluir minutas de esos proyectos
      if (userProjectIds.length > 0) {
        // Validar que el proyecto solicitado esté en los proyectos del usuario
        if (query.proyecto) {
          if (userProjectIds.includes(query.proyecto)) {
            orConditions.push({ proyecto: query.proyecto });
          }
          // Si solicita un proyecto al que no tiene acceso, solo verá sus propias minutas
        } else {
          orConditions.push({ proyecto: { in: userProjectIds } });
        }
      }

      where.OR = orConditions;
    } else if (canSign && !canViewAll) {
      // Firmante: puede ver TODAS las minutas aprobadas y firmadas + sus propias minutas
      where.OR = [
        { estado: 'aprobada' },
        { estado: 'firmada' },
        { usuario_id: userId }
      ];
    } else {
      // Admin puede filtrar por proyecto específico si lo solicita
      if (query.proyecto) {
        where.proyecto = query.proyecto;
      }
      // Admin también puede filtrar por usuario_id si lo solicita
      if (query.usuario_id) where.usuario_id = query.usuario_id;
    }

    // Filtro de estado (aplica a todos)
    if (query.estado) where.estado = query.estado;

    // Validar y construir filtro de fechas
    if (query.fechaDesde || query.fechaHasta) {
      where.fecha_creacion = {};

      if (query.fechaDesde) {
        const fecha = new Date(query.fechaDesde);
        if (Number.isNaN(fecha.getTime())) {
          throw new BadRequestException('fechaDesde inválida');
        }
        where.fecha_creacion.gte = fecha;
      }

      if (query.fechaHasta) {
        const fecha = new Date(query.fechaHasta);
        if (Number.isNaN(fecha.getTime())) {
          throw new BadRequestException('fechaHasta inválida');
        }
        where.fecha_creacion.lte = fecha;
      }
    }

    // ⚡⚡ OPTIMIZACIÓN CRÍTICA: Ejecutar count y findMany EN PARALELO
    const [total, minutasRaw] = await Promise.all([
      // Query 1: Count
      this.prisma.minutas_definitivas.count({ where }),

      // Query 2: FindMany con select optimizado (excluye campos JSON pesados)
      // 🔒 SEGURIDAD: NO incluir usuario_id en la respuesta
      this.prisma.minutas_definitivas.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: skip,
        select: {
          id: true,
          // usuario_id: ELIMINADO por seguridad - exponía IDs internos
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

    // Ya no necesitamos enriquecer datos - vienen incluidos
    return {
      data: minutasRaw,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

      if (!isOwner && !hasProjectAccess) {
        throw new ForbiddenException(
          `No tienes permiso para acceder a esta minuta. Debes ser el creador o tener acceso al proyecto.`
        );
      }
    }

    // SEGURIDAD: Eliminar usuario_id de la respuesta - no debe exponerse al cliente
    const { usuario_id: _, ...safeMinuta } = minuta;
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
      this.getCachedUserPermissions(userId), // Usa cache
    ]);

    if (!minuta) {
      throw new NotFoundException(`Minuta con ID ${id} no encontrada.`);
    }

    // ⚡ OPTIMIZACIÓN: Verificar permisos usando datos ya obtenidos
    const canViewAll = userPermissions.permissions.includes('verTodasMinutas');
    const canSign = userPermissions.permissions.includes('firmarMinuta'); // Permitir firmantes
    const isOwner = minuta.usuario_id === userId;
    const hasProjectAccess = minuta.proyecto ? userPermissions.projectIds.includes(minuta.proyecto) : false;

    // Explicit bypass for global admins
    const isGlobalAdmin = userPermissions.roles && userPermissions.roles.some(r => ['superadminmv', 'adminmv'].includes(r));

    if (!canViewAll && !isOwner && !hasProjectAccess && !isGlobalAdmin && !canSign) {
      throw new ForbiddenException(`No tienes permiso para acceder a esta minuta.`);
    }

    // SEGURIDAD: Validar version para optimistic locking
    if (updateMinutaDto.version !== undefined && updateMinutaDto.version !== minuta.version) {
      throw new ConflictException(
        `La minuta ha sido modificada por otro usuario. Por favor, recarga la página y vuelve a intentar.`
      );
    }

    // Validar transición de estado si se está cambiando
    if (updateMinutaDto.estado && updateMinutaDto.estado !== minuta.estado) {
      // Normalizar estados a minúsculas para validación
      const estadoActual = normalizeEstado(minuta.estado);
      const estadoNuevo = normalizeEstado(updateMinutaDto.estado);

      const validTransitions = VALID_STATE_TRANSITIONS[estadoActual];

      if (!validTransitions) {
        throw new BadRequestException(`Estado actual '${minuta.estado}' no es válido`);
      }

      if (!validTransitions.includes(estadoNuevo)) {
        throw new BadRequestException(
          `Transición de estado inválida: '${minuta.estado}' → '${updateMinutaDto.estado}'. ` +
          `Transiciones válidas: ${validTransitions.join(', ')}`
        );
      }

      // 🔒 VALIDACIÓN: Motivo obligatorio al cancelar
      const estadoLower = updateMinutaDto.estado.toLowerCase();

      // Validar motivo obligatorio para 'cancelada'
      if (['cancelada'].includes(estadoLower)) {
        if (!updateMinutaDto.comentarios || updateMinutaDto.comentarios.trim() === '') {
          const accion = estadoLower === 'cancelada' ? 'cancelación' : 'edición';
          throw new BadRequestException(
            `El motivo de ${accion} es obligatorio. Por favor, proporcione un comentario.`
          );
        }
      }

      // Validar permisos para aprobar minutas
      if (['Definitiva'].includes(updateMinutaDto.estado)) {
        const hasApprovalPermission = userPermissions.permissions.includes('aprobarRechazarMinuta');
        if (!hasApprovalPermission) {
          throw new ForbiddenException(
            'No tienes permiso para aprobar minutas. Se requiere el permiso "aprobarRechazarMinuta"'
          );
        }
      }

      // 📦 Actualizar estados de unidades según el nuevo estado de la minuta
      const minutaData = minuta.datos as { unidades?: { id: string }[] };
      const unidadIds = minutaData?.unidades?.map((u) => u.id).filter(Boolean) || [];

      if (unidadIds.length > 0) {
        if (estadoNuevo === 'cancelada') {
          // Al cancelar, liberar unidades (vuelven a Disponible)
          await this.unitStateService.liberarUnidades(unidadIds);

          // Limpiar el cliente interesado de los detalles de venta
          for (const unidadId of unidadIds) {
            await this.prisma.detallesventa.updateMany({
              where: { unidad_id: unidadId },
              data: { clienteinteresado: null } as any,
            });
          }
        }
        // Al firmar, las unidades se mantienen como "Reservada" - no se hace nada
      }
    }

    // Sanitizar datos antes de actualizar
    const sanitizedData = {
      ...updateMinutaDto,
      comentarios: updateMinutaDto.comentarios
        ? sanitizeString(updateMinutaDto.comentarios)
        : undefined,
      datos: updateMinutaDto.datos ? sanitizeObject(updateMinutaDto.datos) : undefined,
      datos_adicionales: updateMinutaDto.datos_adicionales
        ? sanitizeObject(updateMinutaDto.datos_adicionales)
        : undefined,
      datos_mapa_ventas: updateMinutaDto.datos_mapa_ventas
        ? sanitizeObject(updateMinutaDto.datos_mapa_ventas)
        : undefined,
    };

    // ⚡ OPTIMIZACIÓN: Usar raw SQL para update más rápido
    try {
      // Preparar datos como JSON para la query
      const datosJson = sanitizedData.datos ? JSON.stringify(sanitizedData.datos) : null;

      // Ejecutar raw SQL update
      const result = await this.prisma.$executeRaw`
        UPDATE minutas_definitivas
        SET 
          estado = COALESCE(${sanitizedData.estado}, estado),
          comentarios = COALESCE(${sanitizedData.comentarios}, comentarios),
          datos = COALESCE(${datosJson}::jsonb, datos),
          version = ${minuta.version + 1},
          updated_at = NOW()
        WHERE id = ${id}::uuid AND version = ${minuta.version}
      `;

      if (result === 0) {
        throw new ConflictException(
          'La minuta ha sido modificada por otro usuario. Por favor, recarga la página y vuelve a intentar.'
        );
      }
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error.message?.includes('state') || error.message?.includes('estado')) {
        throw new BadRequestException(
          `Error de base de datos: ${error.message}. Esto puede ser causado por un trigger de validación.`
        );
      }
      throw error;
    }

    // ⚡ OPTIMIZACIÓN: Retornar solo campos necesarios
    const updatedMinuta = await this.prisma.minutas_definitivas.findUnique({
      where: { id },
      select: {
        id: true,
        proyecto: true,
        estado: true,
        comentarios: true,
        fecha_creacion: true,
        updated_at: true,
        version: true,
        usuario_id: true, // Necesario para WebSocket
        users: { select: { email: true } },
        proyectos: { select: { nombre: true } },
      },
    });

    // 📡 Emitir evento WebSocket si cambió el estado
    if (this.gateway && updateMinutaDto.estado && updateMinutaDto.estado !== minuta.estado) {
      this.gateway.emitMinutaStateChanged({
        minutaId: id,
        proyecto: updatedMinuta?.proyecto || undefined,
        estado: updateMinutaDto.estado,
        usuarioId: minuta.usuario_id,
      });

      // 📝 AUDIT LOG: Cambio de Estado
      const userEmailRaw = await this.prisma.users.findUnique({
        where: { id: userId },
        select: { email: true }
      });

      // Determinar impacto based on new state
      const impacto = updateMinutaDto.estado === 'cancelada' ? 'Alto' : 'Medio';

      await this.logger.agregarLog({
        motivo: 'Cambio de Estado de Minuta',
        descripcion: `Estado cambiado de '${minuta.estado}' a '${updateMinutaDto.estado}'.`,
        impacto: impacto,
        tablaafectada: 'minutas_definitivas',
        usuarioID: userId,
        usuarioemail: userEmailRaw?.email || 'unknown',
      });
    }

    // 🔒 SEGURIDAD: Eliminar usuario_id de la respuesta
    if (updatedMinuta) {
      const { usuario_id: _, ...safeMinuta } = updatedMinuta;
      return safeMinuta;
    }
    return updatedMinuta;
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
