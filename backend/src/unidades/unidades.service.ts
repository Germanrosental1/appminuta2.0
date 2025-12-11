import { Injectable } from '@nestjs/common';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnidadesService {
    constructor(private readonly prisma: PrismaService) { }

    create(createUnidadDto: CreateUnidadDto) {
        return 'This action adds a new unidad';
    }

    async findAll(query: any) {
        const where: any = {};
        if (query.proyecto) where.proyecto = { equals: query.proyecto, mode: 'insensitive' };
        if (query.estado) where.estado = { equals: query.estado, mode: 'insensitive' };
        if (query.etapa && query.etapa !== 'Ninguna') where.etapa = query.etapa;
        if (query.tipo) where.tipo = query.tipo;
        if (query.sectorid) where.sectorid = query.sectorid;
        if (query.nrounidad) where.nrounidad = query.nrounidad;

        return this.prisma.tablas.findMany({
            where,
            orderBy: [
                { proyecto: 'asc' },
                { sectorid: 'asc' },
                { id: 'asc' },
            ],
        });
    }

    async findOne(id: number) {
        return this.prisma.tablas.findUnique({
            where: { id },
        });
    }

    async getNaturalezas() {
        const result = await this.prisma.tablas.findMany({
            distinct: ['natdelproyecto'],
            select: { natdelproyecto: true },
            where: { natdelproyecto: { not: null } },
            orderBy: { natdelproyecto: 'asc' },
        });
        return result.map(i => i.natdelproyecto);
    }

    async getEtapas(proyecto: string) {
        const result = await this.prisma.tablas.findMany({
            distinct: ['etapa'],
            select: { etapa: true },
            where: {
                proyecto: { equals: proyecto, mode: 'insensitive' },
                etapa: { not: null }
            },
            orderBy: { etapa: 'asc' },
        });
        return result.map(i => i.etapa);
    }

    async getTipos(proyecto: string, etapa?: string) {
        const where: any = {
            proyecto: { equals: proyecto, mode: 'insensitive' },
            tipo: { not: null }
        };
        if (etapa && etapa !== 'Ninguna') where.etapa = etapa;

        const result = await this.prisma.tablas.findMany({
            distinct: ['tipo'],
            select: { tipo: true },
            where,
            orderBy: { tipo: 'asc' },
        });
        return result.map(i => i.tipo);
    }

    async getSectores(proyecto: string, etapa?: string, tipo?: string) {
        const where: any = {
            proyecto: { equals: proyecto, mode: 'insensitive' },
            sectorid: { not: null }
        };
        if (etapa && etapa !== 'Ninguna') where.etapa = etapa;
        if (tipo) where.tipo = tipo;

        const result = await this.prisma.tablas.findMany({
            distinct: ['sectorid'],
            select: { sectorid: true },
            where,
            orderBy: { sectorid: 'asc' },
        });
        return result.map(i => i.sectorid);
    }

    update(id: number, updateUnidadDto: UpdateUnidadDto) {
        return `This action updates a #${id} unidad`;
    }

    remove(id: number) {
        return `This action removes a #${id} unidad`;
    }
}
