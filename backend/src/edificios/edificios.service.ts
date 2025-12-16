import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEdificioDto } from './dto/create-edificio.dto';
import { UpdateEdificioDto } from './dto/update-edificio.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EdificiosService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createEdificioDto: CreateEdificioDto) {
        // Verify project exists
        const proyecto = await this.prisma.proyectos.findUnique({
            where: { id: createEdificioDto.proyecto_id },
        });
        if (!proyecto) {
            throw new BadRequestException(`Proyecto con ID "${createEdificioDto.proyecto_id}" no encontrado`);
        }

        return await this.prisma.edificios.create({
            data: createEdificioDto,
            include: { proyectos: true },
        });
    }

    async findAll(proyectoId?: string) {
        const where = proyectoId ? { proyecto_id: proyectoId } : {};
        return await this.prisma.edificios.findMany({
            where,
            include: {
                proyectos: { select: { id: true, nombre: true } },
                unidades: { select: { id: true, sectorid: true, nrounidad: true } },
            },
            orderBy: { nombreedificio: 'asc' },
        });
    }

    async findOne(id: string) {
        const edificio = await this.prisma.edificios.findUnique({
            where: { id },
            include: {
                proyectos: true,
                unidades: {
                    include: {
                        tiposunidad: true,
                        etapas: true,
                    },
                },
            },
        });

        if (!edificio) {
            throw new NotFoundException(`Edificio con ID "${id}" no encontrado`);
        }

        return edificio;
    }

    async update(id: string, updateEdificioDto: UpdateEdificioDto) {
        try {
            return await this.prisma.edificios.update({
                where: { id },
                data: updateEdificioDto,
                include: { proyectos: true },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Edificio con ID "${id}" no encontrado`);
            }
            throw error;
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.edificios.delete({ where: { id } });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Edificio con ID "${id}" no encontrado`);
                }
            }
            throw error;
        }
    }
}
