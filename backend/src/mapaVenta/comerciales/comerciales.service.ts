import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateComercialDto } from './dto/create-comercial.dto';
import { UpdateComercialDto } from './dto/update-comercial.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class ComercialesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createComercialDto: CreateComercialDto) {
        try {
            return await this.prisma.comerciales.create({
                data: { Nombre: createComercialDto.nombre },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
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
            orderBy: { Nombre: 'asc' },
        });
    }

    async findOne(id: string) {
        const comercial = await this.prisma.comerciales.findUnique({
            where: { Id: id },
            include: {
                DetallesVenta: {
                    include: {
                        Unidades_DetallesVenta_UnidadIdToUnidades: {
                            select: {
                                Id: true,
                                SectorId: true,
                                NroUnidad: true,
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
                where: { Id: id },
                data: { Nombre: updateComercialDto.nombre },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
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
                where: { Id: id },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
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
