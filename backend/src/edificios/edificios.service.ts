import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEdificioDto } from './dto/create-edificio.dto';
import { UpdateEdificioDto } from './dto/update-edificio.dto';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class EdificiosService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createEdificioDto: CreateEdificioDto) {
        // Verify project exists
        const proyecto = await this.prisma.proyectos.findUnique({
            where: { Id: createEdificioDto.proyecto_id },
        });
        if (!proyecto) {
            throw new BadRequestException(`Proyecto con ID "${createEdificioDto.proyecto_id}" no encontrado`);
        }

        return await this.prisma.edificios.create({
            data: {
                NombreEdificio: createEdificioDto.nombreedificio,
                ProyectoId: createEdificioDto.proyecto_id,
            },
            include: { Proyectos: true },
        });
    }

    async findAll(proyectoId?: string) {
        const where = proyectoId ? { ProyectoId: proyectoId } : {};
        return await this.prisma.edificios.findMany({
            where,
            include: {
                Proyectos: { select: { Id: true, Nombre: true } },
                Unidades: { select: { Id: true, SectorId: true, NroUnidad: true } },
            },
            orderBy: { NombreEdificio: 'asc' },
        });
    }

    async findOne(id: string) {
        const edificio = await this.prisma.edificios.findUnique({
            where: { Id: id },
            include: {
                Proyectos: true,
                Unidades: {
                    include: {
                        TiposUnidad: true,
                        Etapas: true,
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
                where: { Id: id },
                data: {
                    NombreEdificio: updateEdificioDto.nombreedificio,
                    ProyectoId: updateEdificioDto.proyecto_id,
                },
                include: { Proyectos: true },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Edificio con ID "${id}" no encontrado`);
            }
            throw error;
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.edificios.delete({ where: { Id: id } });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Edificio con ID "${id}" no encontrado`);
                }
            }
            throw error;
        }
    }
}
