import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNaturalezaDto } from './dto/create-naturaleza.dto';
import { UpdateNaturalezaDto } from './dto/update-naturaleza.dto';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class NaturalezasService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createNaturalezaDto: CreateNaturalezaDto) {
        return await this.prisma.naturalezas.create({ data: { Nombre: createNaturalezaDto.nombre } });
    }

    async findAll() {
        return await this.prisma.naturalezas.findMany({ orderBy: { Nombre: 'asc' } });
    }

    async findOne(id: string) {
        const naturaleza = await this.prisma.naturalezas.findUnique({ where: { Id: id } });
        if (!naturaleza) throw new NotFoundException(`Naturaleza con ID "${id}" no encontrada`);
        return naturaleza;
    }

    async update(id: string, updateNaturalezaDto: UpdateNaturalezaDto) {
        try {
            return await this.prisma.naturalezas.update({ where: { Id: id }, data: { Nombre: updateNaturalezaDto.nombre } });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Naturaleza con ID "${id}" no encontrada`);
            }
            throw error;
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.naturalezas.delete({ where: { Id: id } });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Naturaleza con ID "${id}" no encontrada`);
            }
            throw error;
        }
    }
}
