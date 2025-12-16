import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEtapaDto } from './dto/create-etapa.dto';
import { UpdateEtapaDto } from './dto/update-etapa.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EtapasService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createEtapaDto: CreateEtapaDto) {
        try {
            return await this.prisma.etapas.create({
                data: createEtapaDto,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException(
                        `Ya existe una etapa con el nombre "${createEtapaDto.nombre}"`,
                    );
                }
            }
            throw error;
        }
    }

    async findAll() {
        return await this.prisma.etapas.findMany({
            orderBy: { nombre: 'asc' },
        });
    }

    async findOne(id: string) {
        const etapa = await this.prisma.etapas.findUnique({
            where: { id },
            include: {
                unidades: {
                    select: {
                        id: true,
                        sectorid: true,
                        nrounidad: true,
                    },
                },
            },
        });

        if (!etapa) {
            throw new NotFoundException(`Etapa con ID "${id}" no encontrada`);
        }

        return etapa;
    }

    async update(id: string, updateEtapaDto: UpdateEtapaDto) {
        try {
            return await this.prisma.etapas.update({
                where: { id },
                data: updateEtapaDto,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Etapa con ID "${id}" no encontrada`);
                }
                if (error.code === 'P2002') {
                    throw new ConflictException(
                        `Ya existe una etapa con el nombre "${updateEtapaDto.nombre}"`,
                    );
                }
            }
            throw error;
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.etapas.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Etapa con ID "${id}" no encontrada`);
                }
                if (error.code === 'P2003') {
                    throw new ConflictException(
                        'No se puede eliminar la etapa porque tiene unidades asociadas',
                    );
                }
            }
            throw error;
        }
    }
}
