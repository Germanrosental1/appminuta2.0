import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMotivoNodispDto } from './dto/create-motivonodisp.dto';
import { UpdateMotivoNodispDto } from './dto/update-motivonodisp.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class MotivosNodispService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createMotivoNodispDto: CreateMotivoNodispDto) {
        try {
            return await this.prisma.motivosNoDisp.create({
                data: { Nombre: createMotivoNodispDto.nombre },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Ya existe un motivo con el nombre "${createMotivoNodispDto.nombre}"`);
            }
            throw error;
        }
    }

    async findAll() {
        return await this.prisma.motivosNoDisp.findMany({
            orderBy: { Nombre: 'asc' },
        });
    }

    async findOne(id: string) {
        const motivo = await this.prisma.motivosNoDisp.findUnique({
            where: { Id: id },
        });
        if (!motivo) {
            throw new NotFoundException(`Motivo con ID "${id}" no encontrado`);
        }
        return motivo;
    }

    async update(id: string, updateMotivoNodispDto: UpdateMotivoNodispDto) {
        try {
            return await this.prisma.motivosNoDisp.update({
                where: { Id: id },
                data: { Nombre: updateMotivoNodispDto.nombre },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2025') throw new NotFoundException(`Motivo con ID "${id}" no encontrado`);
                if (error.code === 'P2002') throw new ConflictException(`Ya existe un motivo con el nombre "${updateMotivoNodispDto.nombre}"`);
            }
            throw error;
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.motivosNoDisp.delete({ where: { Id: id } });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2025') throw new NotFoundException(`Motivo con ID "${id}" no encontrado`);
                if (error.code === 'P2003') throw new ConflictException('No se puede eliminar porque tiene ventas asociadas');
            }
            throw error;
        }
    }
}
