import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Optional, Inject, forwardRef } from '@nestjs/common';
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { CreateMinutaProvisoriaDto } from './dto/create-minuta-provisoria.dto';
import { FindAllMinutasQueryDto } from './dto/find-all-minutas-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MinutasGateway } from './minutas.gateway';
import { PrivacyHelpers } from '../common/privacy.helper';
import { MinutasStateService } from './services/minutas-state.service';
import { MinutasQueryService } from './services/minutas-query.service';
import { MinutasCommandService } from './services/minutas-command.service';
import { MinutasPermissionsService } from './services/minutas-permissions.service';

/**
 * MinutasService - Thin Facade
 * 
 * This service acts as the public API for the minutas module.
 * All logic is delegated to specialized services:
 * - MinutasCommandService: create, update, remove operations
 * - MinutasQueryService: query building and filtering
 * - MinutasStateService: state machine logic
 * - MinutasPermissionsService: permission handling with caching
 */
@Injectable()
export class MinutasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateService: MinutasStateService,
    private readonly queryService: MinutasQueryService,
    private readonly commandService: MinutasCommandService,
    private readonly permissionsService: MinutasPermissionsService,
    @Optional() @Inject(forwardRef(() => MinutasGateway)) private readonly gateway?: MinutasGateway,
  ) { }

  // ==================== CACHE MANAGEMENT ====================

  public async getPermissionsCacheStats() {
    return this.permissionsService.getStats();
  }

  public async invalidateUserCache(userId: string): Promise<void> {
    await this.permissionsService.invalidateUser(userId);
  }

  public async clearAllCache(): Promise<void> {
    await this.permissionsService.clearAll();
  }

  // ==================== CREATE ====================

  async create(createMinutaDto: CreateMinutaDto, userId: string) {
    return this.commandService.create(createMinutaDto, userId);
  }

  async createProvisoria(data: CreateMinutaProvisoriaDto, userId: string) {
    throw new Error('createProvisoria not implemented - table migration needed');
  }

  async updateProvisoria(id: string, data: any) {
    throw new Error('updateProvisoria not implemented - table migration needed');
  }

  // ==================== READ ====================

  async findAll(query: FindAllMinutasQueryDto, userId: string) {
    // Get cached permissions
    const { permissions: userPermissions, projectIds: userProjectIds } =
      await this.permissionsService.getCachedPermissions(userId);

    // Build where clause
    const where = await this.buildWhereClause(query, userId, userPermissions, userProjectIds);

    // Pagination
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Validate and sanitize sortBy
    const allowedSortFields = ['FechaCreacion', 'UpdatedAt', 'proyecto', 'estado'];
    const sortBy = query.sortBy && allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : 'FechaCreacion';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    // Execute count and findMany in parallel
    const [total, minutasRaw] = await Promise.all([
      this.prisma.minutasDefinitivas.count({ where }),
      this.prisma.minutasDefinitivas.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: skip,
        select: {
          Id: true,
          FechaCreacion: true,
          Estado: true,
          Comentario: true,
          Proyecto: true,
          Version: true,
          UpdatedAt: true,
          users: { select: { email: true } },
          Proyectos: { select: { Nombre: true } },
        }
      }),
    ]);

    // Map to safe DTO
    const safeMinutas = minutasRaw.map(m => ({
      Id: m.Id,
      Numero: '',
      Estado: m.Estado,
      Tipo: 'Venta',
      ProyectoNombre: m.Proyectos?.Nombre || '',
      ClienteRut: '',
      ClienteNombre: '',
      PrecioTotal: 0,
      CreatedAt: m.FechaCreacion,
      CreadoPor: m.users ? PrivacyHelpers.maskEmail(m.users.email) : 'unknown',
    }));

    return {
      data: safeMinutas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async buildWhereClause(
    query: FindAllMinutasQueryDto,
    userId: string,
    userPermissions: string[],
    userProjectIds: string[]
  ): Promise<any> {
    const where: any = {};

    // Permission filter
    const permissionFilter = this.permissionsService.buildPermissionsFilter(
      query,
      userId,
      { permissions: userPermissions, projectIds: userProjectIds, roles: [] }
    );
    if (permissionFilter) {
      Object.assign(where, permissionFilter);
    }

    // State filter
    if (query.estado) where.Estado = query.estado;

    // Date filter
    const dateFilter = this.permissionsService.buildDateFilter(query.fechaDesde, query.fechaHasta);
    if (dateFilter) {
      where.FechaCreacion = dateFilter;
    }

    return where;
  }

  async findOne(id: string, userId: string) {
    const minuta = await this.prisma.minutasDefinitivas.findUnique({
      where: { Id: id },
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
        UsuarioId: true,
        users: { select: { email: true } },
        Proyectos: { select: { Nombre: true } },
      },
    }) as any;

    if (!minuta) {
      throw new NotFoundException(`Minuta con ID ${id} no encontrada.`);
    }

    // Validate access permissions
    await this.validateFindOnePermissions(minuta, userId);

    // Remove sensitive data and format response
    return this.formatMinutaResponse(minuta);
  }

  private async validateFindOnePermissions(minuta: any, userId: string): Promise<void> {
    const canViewAll = await this.permissionsService.canViewAllMinutas(userId);

    if (canViewAll) return;

    const isOwner = minuta.UsuarioId === userId;

    let hasProjectAccess = false;
    if (minuta.Proyecto) {
      hasProjectAccess = await this.permissionsService.hasProjectAccess(userId, minuta.Proyecto);
    }

    const canSign = await this.permissionsService.canSignMinuta(userId);
    const canSignerView = canSign && ['aprobada', 'firmada'].includes(minuta.Estado?.toLowerCase());

    if (!isOwner && !hasProjectAccess && !canSignerView) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a esta minuta. Debes ser el creador, tener acceso al proyecto, o ser firmante de una minuta aprobada.'
      );
    }
  }

  private formatMinutaResponse(minuta: any) {
    const { UsuarioId: _, ...safeMinuta } = minuta;

    if (safeMinuta.users) {
      safeMinuta.users.email = PrivacyHelpers.maskEmail(safeMinuta.users.email);
    }

    return {
      Id: safeMinuta.Id,
      Numero: safeMinuta.Numero || '',
      Estado: safeMinuta.Estado,
      Tipo: safeMinuta.Dato?.tipo || 'Venta',
      ProyectoId: safeMinuta.Proyecto,
      ProyectoNombre: safeMinuta.Proyectos?.Nombre || '',
      UnidadId: safeMinuta.Dato?.unidad_id || null,
      UnidadIdentificador: safeMinuta.Dato?.unidadCodigo || null,
      ClienteRut: safeMinuta.Dato?.clienteRut || '',
      ClienteNombre: safeMinuta.Dato?.clienteNombre || '',
      PrecioTotal: safeMinuta.Dato?.precioTotal || 0,
      CreadoPor: safeMinuta.users?.email || 'unknown',
      CreatedAt: safeMinuta.FechaCreacion,
      UpdatedAt: safeMinuta.UpdatedAt,
      Comentario: safeMinuta.Comentario,
      Dato: safeMinuta.Dato,
      DatoAdicional: safeMinuta.DatoAdicional,
      DatoMapaVenta: safeMinuta.DatoMapaVenta,
    };
  }

  // ==================== UPDATE ====================

  async update(id: string, updateMinutaDto: any, userId: string, userRole?: string) {
    return this.commandService.update(
      id,
      updateMinutaDto,
      userId,
      (id, userId) => this.findOne(id, userId)
    );
  }

  // ==================== DELETE ====================

  async remove(id: string, userId: string) {
    return this.commandService.remove(
      id,
      userId,
      (id, userId) => this.findOne(id, userId)
    );
  }

  // ==================== DOCUMENT GENERATION ====================

  async generate(data: any): Promise<{ buffer: Buffer; contentType: string }> {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('N8N_WEBHOOK_URL not configured');
    }

    // Validate URL to prevent SSRF
    this.validateWebhookUrl(webhookUrl);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error generating document: ${response.statusText}`);
    }

    return this.processGenerateResponse(response);
  }

  private validateWebhookUrl(webhookUrl: string): void {
    try {
      const url = new URL(webhookUrl);

      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Only HTTP/HTTPS protocols are allowed');
      }

      const hostname = url.hostname.toLowerCase();
      const internalPatterns = [
        'localhost', '127.', '10.', '192.168.',
        '172.16.', '172.17.', '172.18.', '172.19.',
        '172.20.', '172.21.', '172.22.', '172.23.',
        '172.24.', '172.25.', '172.26.', '172.27.',
        '172.28.', '172.29.', '172.30.', '172.31.',
        '169.254.', '0.0.0.0', '::1', '[::1]',
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
  }

  private async processGenerateResponse(response: Response): Promise<{ buffer: Buffer; contentType: string }> {
    const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

    const contentLength = response.headers.get('content-length');
    if (contentLength && Number.parseInt(contentLength) > MAX_SIZE_BYTES) {
      throw new BadRequestException('El documento generado excede el límite de tamaño permitido (50MB).');
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const arrayBuffer = await response.arrayBuffer();

    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new BadRequestException('El documento generado excede el límite de tamaño permitido (50MB).');
    }

    return { buffer: Buffer.from(arrayBuffer), contentType };
  }

  // ==================== STATE HELPERS (Exposed for backwards compatibility) ====================

  getValidTransitions(currentState: string): string[] {
    return this.stateService.getValidTransitions(currentState);
  }

  isFinalState(state: string): boolean {
    return this.stateService.isFinalState(state);
  }
}
