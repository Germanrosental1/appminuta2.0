import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateGastosGeneralesDto } from './dto/update-gastos-generales.dto';

@Injectable()
export class GastosgeneralesService {
    constructor(private prisma: PrismaService) { }

    async findByProject(projectId: string) {
        const gastos = await this.prisma.gastosgenerales.findUnique({
            where: { proyecto: projectId },
        });

        // Si no existen gastos para este proyecto, devolvemos un objeto por defecto (opcional)
        // o null. El frontend deberá manejarlo.
        return gastos;
    }

    async updateByProject(projectId: string, updateDto: UpdateGastosGeneralesDto) {
        // Verificamos que el proyecto exista primero (opcional, pero buena práctica)
        const projectExists = await this.prisma.proyectos.findUnique({
            where: { id: projectId },
        });

        if (!projectExists) {
            throw new NotFoundException(`Proyecto con ID ${projectId} no encontrado`);
        }

        // Usamos upsert para crear si no existe o actualizar si ya existe
        return await this.prisma.gastosgenerales.upsert({
            where: { proyecto: projectId },
            update: updateDto,
            create: {
                proyecto: projectId,
                ...updateDto,
            },
        });
    }
}
