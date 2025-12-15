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

        // Handle proyecto filter - convert nombre to proyecto_id
        if (query.proyecto) {
            const proyecto = await this.prisma.proyectos.findFirst({
                where: { nombre: { equals: query.proyecto, mode: 'insensitive' } },
            });
            if (proyecto) {
                where.proyecto_id = proyecto.id;
            } else {
                // If project not found, return empty array
                return [];
            }
        }

        // Other filters
        if (query.estado)
            where.estado = { equals: query.estado, mode: 'insensitive' };
        if (query.etapa && query.etapa !== 'Ninguna') where.etapa = query.etapa;
        if (query.tipo) where.tipo = query.tipo;
        if (query.sectorid) where.sectorid = query.sectorid;
        if (query.nrounidad) where.nrounidad = query.nrounidad;

        return this.prisma.tablas.findMany({
            where,
            orderBy: [{ sectorid: 'asc' }, { id: 'asc' }],
        });
    }

    async findOne(id: number) {
        return this.prisma.tablas.findUnique({
            where: { id },
        });
    }

    async getNaturalezas(): Promise<string[]> {
        const result = await this.prisma.tablas.findMany({
            select: { natdelproyecto: true },
            where: { natdelproyecto: { not: null } },
            distinct: ['natdelproyecto'],
            orderBy: { natdelproyecto: 'asc' },
        });
        const naturalezas = result.map((r) => r.natdelproyecto).filter(Boolean);
        return naturalezas;
    }

    /**
     * Get all available unit types across all projects
     */
    async getTiposDisponibles(): Promise<string[]> {
        const result = await this.prisma.tablas.findMany({
            select: { tipo: true },
            where: { tipo: { not: null } },
            distinct: ['tipo'],
            orderBy: { tipo: 'asc' },
        });
        const tipos = result.map((r) => r.tipo).filter(Boolean);
        return tipos;
    }

    /**
     * Get projects that have units of a specific type
     */
    async getProyectosPorTipo(tipo: string): Promise<string[]> {
        const result = await this.prisma.tablas.findMany({
            select: {
                proyectos: {
                    select: { nombre: true },
                },
            },
            where: {
                tipo: tipo,
                proyecto_id: { not: null },
            },
            distinct: ['proyecto_id'],
        });
        const proyectos = result
            .map((r) => r.proyectos?.nombre)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
        return proyectos;
    }

    async getEtapas(nombreProyecto: string): Promise<string[]> {
        const proyecto = await this.prisma.proyectos.findFirst({
            where: { nombre: { equals: nombreProyecto, mode: 'insensitive' } },
            select: { id: true }, // Only select ID, not all fields
        });

        if (!proyecto) {
            return [];
        }

        const result = await this.prisma.tablas.findMany({
            select: { etapa: true },
            where: {
                proyecto_id: proyecto.id,
                etapa: { not: null },
            },
            distinct: ['etapa'],
            orderBy: { etapa: 'asc' },
        });

        const etapas = result.map((r) => r.etapa).filter(Boolean);

        return etapas;
    }

    async getTipos(nombreProyecto: string, etapa?: string): Promise<string[]> {
        const proyecto = await this.prisma.proyectos.findFirst({
            where: { nombre: { equals: nombreProyecto, mode: 'insensitive' } },
        });

        if (!proyecto) return [];

        const where: any = {
            proyecto_id: proyecto.id,
            tipo: { not: null },
        };

        if (etapa && etapa !== 'Ninguna') {
            where.etapa = etapa;
        }

        const result = await this.prisma.tablas.findMany({
            select: { tipo: true },
            where,
            distinct: ['tipo'],
            orderBy: { tipo: 'asc' },
        });

        return result.map((r) => r.tipo).filter(Boolean);
    }

    async getSectores(
        nombreProyecto: string,
        etapa?: string,
        tipo?: string,
    ): Promise<string[]> {
        try {
            const proyecto = await this.prisma.proyectos.findFirst({
                where: { nombre: { equals: nombreProyecto, mode: 'insensitive' } },
                select: { id: true }, // Only select ID, not all fields
            });

            if (!proyecto) {
                return [];
            }

            const where: any = {
                proyecto_id: proyecto.id,
            };

            if (etapa && etapa !== 'Ninguna') where.etapa = etapa;
            if (tipo) where.tipo = tipo;

            const result = await this.prisma.tablas.findMany({
                select: { sectorid: true },
                where,
                distinct: ['sectorid'],
                orderBy: { sectorid: 'asc' },
            });

            // Filter out null/empty sectorid values
            const sectores = result
                .map((r) => r.sectorid)
                .filter((s) => s != null && s !== '');
            return sectores;
        } catch (error) {
            console.error('[ERROR] getSectores failed:', error);
            throw error;
        }
    }

    update(id: number, updateUnidadDto: UpdateUnidadDto) {
        return `This action updates a #${id} unidad`;
    }

    remove(id: number) {
        return `This action removes a #${id} unidad`;
    }
}
