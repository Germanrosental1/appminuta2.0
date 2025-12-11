import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class MinutasService {
  constructor(private readonly prisma: PrismaService) { }

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
    // Sanitizar datos antes de guardar
    const sanitizedData = {
      ...data,
      comentarios: data.comentarios
        ? sanitizeString(data.comentarios)
        : undefined,
      datos: sanitizeObject(data.datos),
    };

    return this.prisma.minutas_provisorias.create({
      data: {
        ...sanitizedData,
        usuario_id: userId,
        fecha_creacion: new Date(),
        updated_at: new Date(),
        unidad_id: BigInt(data.unidad_id), // Ensure BigInt
      } as any,
    });
  }

  async updateProvisoria(id: string, data: any) {
    // Sanitizar datos antes de actualizar
    const sanitizedData = {
      ...data,
      comentarios: data.comentarios
        ? sanitizeString(data.comentarios)
        : undefined,
      datos: data.datos ? sanitizeObject(data.datos) : undefined,
    };

    return this.prisma.minutas_provisorias.update({
      where: { id },
      data: {
        ...sanitizedData,
        updated_at: new Date(),
      },
    });
  }

  async findAll(query: FindAllMinutasQueryDto) {
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

    // Construir filtros con validación
    if (query.usuario_id) where.usuario_id = query.usuario_id;
    if (query.proyecto) where.proyecto = query.proyecto;
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

    const [total, data] = await this.prisma.$transaction([
      this.prisma.minutas_definitivas.count({ where }),
      this.prisma.minutas_definitivas.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: skip,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string) {
    const minuta = await this.prisma.minutas_definitivas.findUnique({
      where: { id },
    });

    if (!minuta) {
      throw new NotFoundException(`Minuta con ID ${id} no encontrada.`);
    }

    if (userId && minuta.usuario_id !== userId) {
      throw new ForbiddenException(`No tienes permiso para acceder a esta minuta.`);
    }

    return minuta;
  }

  async update(id: string, updateMinutaDto: any, userId?: string, userRole?: string) {
    // Validar propiedad antes de actualizar
    if (userId) {
      const minuta = await this.findOne(id, userId);

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

        // Solo admins pueden aprobar (marcar como Definitiva)
        if (updateMinutaDto.estado === 'Definitiva' && userRole !== 'admin') {
          throw new ForbiddenException('Solo administradores pueden aprobar minutas definitivas');
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

    return this.prisma.minutas_definitivas.update({
      where: { id },
      data: {
        ...sanitizedData,
        updated_at: new Date(),
      },
    });
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
