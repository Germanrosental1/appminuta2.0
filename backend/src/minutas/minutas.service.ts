import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { CreateMinutaProvisoriaDto } from './dto/create-minuta-provisoria.dto';
import { FindAllMinutasQueryDto } from './dto/find-all-minutas-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeString, sanitizeObject } from '../common/sanitize.helper';

// Definir transiciones de estado válidas
const VALID_STATE_TRANSITIONS: Record<string, string[]> = {
  'Provisoria': ['En Revisión', 'Rechazada'],
  'En Revisión': ['Definitiva', 'Provisoria', 'Rechazada'],
  'Definitiva': [], // Estado final, no puede cambiar
  'Rechazada': ['Provisoria'], // Puede volver a provisoria para corrección
};

// ⚡ CACHE: Cache in-memory para permisos de usuario (TTL: 5 minutos)
interface UserPermissionsCache {
  permissions: string[];
  projectIds: string[];
  cachedAt: number;
}
const PERMISSIONS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const userPermissionsCache = new Map<string, UserPermissionsCache>();

@Injectable()
export class MinutasService {
  constructor(private readonly prisma: PrismaService) { }

  // ⚡ Método para obtener permisos con cache
  private async getCachedUserPermissions(userId: string): Promise<{ permissions: string[]; projectIds: string[] }> {
    const cached = userPermissionsCache.get(userId);
    const now = Date.now();

    // Si hay cache válido, usarlo
    if (cached && (now - cached.cachedAt) < PERMISSIONS_CACHE_TTL_MS) {
      return { permissions: cached.permissions, projectIds: cached.projectIds };
    }

    // Si no hay cache o expiró, hacer la query
    const userDataRaw: any[] = await this.prisma.$queryRaw`
      SELECT DISTINCT p.nombre as permiso_nombre, up.idproyecto
      FROM "usuarios-roles" ur
      LEFT JOIN "roles-permisos" rp ON ur.idrol = rp.idrol
      LEFT JOIN permisos p ON rp.idpermiso = p.id
      LEFT JOIN "usuarios-proyectos" up ON ur.idusuario = up.idusuario
      WHERE ur.idusuario = ${userId}::uuid
    `;

    const permissions = [...new Set(userDataRaw.map(row => row.permiso_nombre).filter(Boolean))] as string[];
    const projectIds = [...new Set(userDataRaw.map(row => row.idproyecto).filter(Boolean))] as string[];

    // Guardar en cache
    userPermissionsCache.set(userId, {
      permissions,
      projectIds,
      cachedAt: now,
    });

    return { permissions, projectIds };
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

    return this.prisma.minutas_definitivas.create({
      data: {
        ...sanitizedData,
        usuario_id: userId,
        fecha_creacion: new Date(),
        updated_at: new Date(),
      } as any,
    });
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

    // Si NO es admin, filtrar por proyectos del usuario
    if (!canViewAll) {
      // Si el usuario no tiene proyectos asignados, retornar vacío
      if (userProjectIds.length === 0) {
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      // Filtrar solo minutas de proyectos asignados al usuario
      where.proyecto = { in: userProjectIds };

      // Validar que el proyecto solicitado esté en los proyectos del usuario
      if (query.proyecto) {
        if (userProjectIds.includes(query.proyecto)) {
          where.proyecto = query.proyecto;
        } else {
          // Si solicita un proyecto al que no tiene acceso, retornar vacío
          return {
            data: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          };
        }
      }
    } else {
      // Admin puede filtrar por proyecto específico si lo solicita
      if (query.proyecto) {
        where.proyecto = query.proyecto;
      }
    }

    // Construir filtros adicionales con validación
    if (query.usuario_id) where.usuario_id = query.usuario_id;
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
    const [total, minutas] = await Promise.all([
      // Query 1: Count
      this.prisma.minutas_definitivas.count({ where }),

      // Query 2: FindMany con select optimizado (excluye campos JSON pesados)
      this.prisma.minutas_definitivas.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: skip,
        select: {
          id: true,
          usuario_id: true,
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
      data: minutas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId: string) {
    const minuta = await this.prisma.minutas_definitivas.findUnique({
      where: { id },
      // ⚡ Incluir relaciones para mostrar nombres en lugar de IDs
      include: {
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
    }) as any; // Type assertion needed due to Prisma include + select typing limitation

    if (!minuta) {
      throw new NotFoundException(`Minuta con ID ${id} no encontrada.`);
    }

    // 🔒 SEGURIDAD: Verificar si el usuario es admin
    const userPermissions = await this.getUserPermissions(userId);
    const canViewAll = userPermissions.some(p => p.nombre === 'verTodasMinutas');

    // Si es admin, permitir acceso sin restricciones
    if (canViewAll) {
      return minuta;
    }

    // Si NO es admin, validar que el usuario tiene acceso
    // Opción 1: Es el creador de la minuta
    const isOwner = minuta.usuario_id === userId;

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

    return minuta;
  }

  async update(id: string, updateMinutaDto: any, userId: string, userRole?: string) {
    // Validar propiedad antes de actualizar
    const minuta = await this.findOne(id, userId);

    // 🔒 SEGURIDAD: Validar version para optimistic locking
    if (updateMinutaDto.version !== undefined && updateMinutaDto.version !== minuta.version) {
      throw new ConflictException(
        `La minuta ha sido modificada por otro usuario. Por favor, recarga la página y vuelve a intentar. ` +
        `Versión esperada: ${updateMinutaDto.version}, Versión actual: ${minuta.version}`
      );
    }

    // Validar transición de estado si se está cambiando
    if (updateMinutaDto.estado && updateMinutaDto.estado !== minuta.estado) {
      const validTransitions = VALID_STATE_TRANSITIONS[minuta.estado];

      if (!validTransitions) {
        throw new BadRequestException(`Estado actual '${minuta.estado}' no es válido`);
      }

      if (!validTransitions.includes(updateMinutaDto.estado)) {
        throw new BadRequestException(
          `Transición de estado inválida: '${minuta.estado}' → '${updateMinutaDto.estado}'. ` +
          `Transiciones válidas: ${validTransitions.join(', ')}`
        );
      }

      // Validar permisos para aprobar/rechazar minutas
      if (['Definitiva'].includes(updateMinutaDto.estado)) {
        // Verificar si el usuario tiene el permiso 'aprobarRechazarMinuta'
        const userPermissions = await this.getUserPermissions(userId);
        const hasApprovalPermission = userPermissions.some(
          p => p.nombre === 'aprobarRechazarMinuta'
        );

        if (!hasApprovalPermission) {
          throw new ForbiddenException(
            'No tienes permiso para aprobar minutas. Se requiere el permiso "aprobarRechazarMinuta"'
          );
        }
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

    // SEGURIDAD: Usar updateMany con version check para optimistic locking
    const updated = await this.prisma.minutas_definitivas.updateMany({
      where: {
        id,
        version: minuta.version, // Solo actualizar si la versión coincide
      },
      data: {
        ...sanitizedData,
        version: minuta.version + 1, // Incrementar versión
        updated_at: new Date(),
      },
    });

    // Si no se actualizó ningún registro, significa que hubo un conflicto de versión
    if (updated.count === 0) {
      throw new ConflictException(
        'La minuta ha sido modificada por otro usuario. Por favor, recarga la página y vuelve a intentar.'
      );
    }

    // Retornar la minuta actualizada
    return this.findOne(id, userId);
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

    return this.prisma.minutas_definitivas.delete({
      where: { id },
    });
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
