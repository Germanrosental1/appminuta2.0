import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComercialDto } from './dto/create-comercial.dto';
import { UpdateComercialDto } from './dto/update-comercial.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ComercialesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createComercialDto: CreateComercialDto) {
        try {
            return await this.prisma.comerciales.create({
                data: createComercialDto,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException(
                        `Ya existe un comercial con el nombre "${createComercialDto.nombre}"`,
                    );
                }
            }
            throw error;
        }
    }

    async findAll() {
        return await this.prisma.comerciales.findMany({
            orderBy: { nombre: 'asc' },
        });
    }

    async findOne(id: string) {
        const comercial = await this.prisma.comerciales.findUnique({
            where: { id },
            include: {
                detallesventa: {
                    include: {
                        unidades_detallesventa_unidad_idTounidades: {
                            select: {
                                id: true,
                                sectorid: true,
                                nrounidad: true,
                            },
                        },
                    },
                },
            },
        });

        if (!comercial) {
            throw new NotFoundException(`Comercial con ID "${id}" no encontrado`);
        }

        return comercial;
    }

    async update(id: string, updateComercialDto: UpdateComercialDto) {
        try {
            return await this.prisma.comerciales.update({
                where: { id },
                data: updateComercialDto,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Comercial con ID "${id}" no encontrado`);
                }
                if (error.code === 'P2002') {
                    throw new ConflictException(
                        `Ya existe un comercial con el nombre "${updateComercialDto.nombre}"`,
                    );
                }
            }
            throw error;
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.comerciales.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Comercial con ID "${id}" no encontrado`);
                }
                if (error.code === 'P2003') {
                    throw new ConflictException(
                        'No se puede eliminar el comercial porque tiene ventas asociadas',
                    );
                }
            }
            throw error;
        }
    }
}
