import { Injectable } from '@nestjs/common';
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { CreateMinutaProvisoriaDto } from './dto/create-minuta-provisoria.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MinutasService {
  constructor(private prisma: PrismaService) { }

  async create(createMinutaDto: CreateMinutaDto) {
    return this.prisma.minutas_definitivas.create({
      data: {
        ...createMinutaDto,
        fecha_creacion: new Date(),
        updated_at: new Date(),
      } as any, // Temporary cast as DTO might not match exact Prisma types yet
    });
  }

  async createProvisoria(data: CreateMinutaProvisoriaDto) {
    return this.prisma.minutas_provisorias.create({
      data: {
        ...data,
        fecha_creacion: new Date(),
        updated_at: new Date(),
        unidad_id: BigInt(data.unidad_id), // Ensure BigInt
      } as any,
    });
  }

  async updateProvisoria(id: string, data: any) {
    return this.prisma.minutas_provisorias.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      } as any,
    });
  }

  async findAll(query: any) {
    const where: any = {};
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    // Sort
    const sortBy = query.sortBy || 'fecha_creacion';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    if (query.usuario_id) where.usuario_id = query.usuario_id;
    if (query.proyecto) where.proyecto = query.proyecto;
    if (query.estado) where.estado = query.estado;

    if (query.fechaDesde || query.fechaHasta) {
      where.fecha_creacion = {};
      if (query.fechaDesde) where.fecha_creacion.gte = new Date(query.fechaDesde);
      if (query.fechaHasta) where.fecha_creacion.lte = new Date(query.fechaHasta);
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

  async findOne(id: string) {
    return this.prisma.minutas_definitivas.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateMinutaDto: any) {
    // Handling generic update or specific DTO
    // We update updated_at automatically
    return this.prisma.minutas_definitivas.update({
      where: { id },
      data: {
        ...updateMinutaDto,
        updated_at: new Date(),
      },
    });
  }

  async remove(id: string) {
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
