import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEstadoComercialDto } from './dto/create-estadocomercial.dto';
import { UpdateEstadoComercialDto } from './dto/update-estadocomercial.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EstadoComercialService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createEstadoComercialDto: CreateEstadoComercialDto) {
        try {
            return await this.prisma.estadocomercial.create({
                data: createEstadoComercialDto,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException(
                        `Ya existe un estado con el nombre "${createEstadoComercialDto.nombreestado}"`,
                    );
                }
            }
            throw error;
        }
    }

    async findAll() {
        return await this.prisma.estadocomercial.findMany({
            orderBy: { nombreestado: 'asc' },
        });
    }

    async findOne(id: string) {
        const estado = await this.prisma.estadocomercial.findUnique({
            where: { id },
            include: {
                detallesventa: {
                    include: {
                        unidades_detallesventa_unidad_idTounidades: {
                            select: { id: true, sectorid: true, nrounidad: true },
                        },
                    },
                },
            },
        });

        if (!estado) {
            throw new NotFoundException(`Estado comercial con ID "${id}" no encontrado`);
        }

        return estado;
    }

    async update(id: string, updateEstadoComercialDto: UpdateEstadoComercialDto) {
        try {
            return await this.prisma.estadocomercial.update({
                where: { id },
                data: updateEstadoComercialDto,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Estado comercial con ID "${id}" no encontrado`);
                }
                if (error.code === 'P2002') {
                    throw new ConflictException(
                        `Ya existe un estado con el nombre "${updateEstadoComercialDto.nombreestado}"`,
                    );
                }
            }
            throw error;
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.estadocomercial.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Estado comercial con ID "${id}" no encontrado`);
                }
                if (error.code === 'P2003') {
                    throw new ConflictException(
                        'No se puede eliminar el estado porque tiene ventas asociadas',
                    );
                }
            }
            throw error;
        }
    }
}
