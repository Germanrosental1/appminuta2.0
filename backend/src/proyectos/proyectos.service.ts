import { Injectable } from '@nestjs/common';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProyectosService {
    constructor(private readonly prisma: PrismaService) { }

    create(createProyectoDto: CreateProyectoDto) {
        return 'This action adds a new proyecto';
    }

    async findAll() {
        // 1. Try to get active projects from 'proyectos' table
        const proyectos = await this.prisma.proyectos.findMany({
            where: { activo: true },
            orderBy: { nombre: 'asc' },
        });

        if (proyectos.length > 0) {
            return proyectos;
        }

        // 2. Fallback: Get unique projects from 'tablas'
        const uniqueProjects = await this.prisma.tablas.findMany({
            distinct: ['proyecto'],
            select: {
                proyecto: true,
            },
            where: {
                proyecto: { not: null },
            },
            orderBy: {
                proyecto: 'asc',
            },
        });

        // Map to Proyecto structure
        return uniqueProjects.map((p) => ({
            id: p.proyecto,
            nombre: p.proyecto,
            tabla_nombre: 'tablas',
            activo: true,
            created_at: new Date(),
            updated_at: new Date(),
        }));
    }

    findOne(id: number) {
        return `This action returns a #${id} proyecto`;
    }

    update(id: number, updateProyectoDto: UpdateProyectoDto) {
        return `This action updates a #${id} proyecto`;
    }

    remove(id: number) {
        return `This action removes a #${id} proyecto`;
    }
}
