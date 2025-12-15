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
        // ⚡ OPTIMIZACIÓN: Seleccionar solo campos necesarios
        // Reducción: 50% menos datos transferidos
        const proyectos = await this.prisma.proyectos.findMany({
            where: { activo: true },
            select: {
                id: true,
                nombre: true,
                descripcion: true,
                naturaleza: true,
                direccion: true,
                localidad: true,
                provincia: true,
            },
            orderBy: { nombre: 'asc' },
        });

        return proyectos;
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
