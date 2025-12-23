import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoUnidadDto, UpdateTipoUnidadDto } from './dto/create-tipounidad.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TiposUnidadService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateTipoUnidadDto) {
        try {
            return await this.prisma.tiposunidad.create({ data: dto });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Ya existe un tipo de unidad con el nombre "${dto.nombre}"`);
            }
            throw error;
        }
    }

    async findAll() {
        return await this.prisma.tiposunidad.findMany({ orderBy: { nombre: 'asc' } });
    }

    async findOne(id: string) {
        const tipo = await this.prisma.tiposunidad.findUnique({
            where: { id },
            include: { unidades: { select: { id: true, sectorid: true, nrounidad: true } } },
        });
        if (!tipo) throw new NotFoundException(`Tipo de unidad con ID "${id}" no encontrado`);
        return tipo;
    }

    async update(id: string, dto: UpdateTipoUnidadDto) {
        try {
            return await this.prisma.tiposunidad.update({ where: { id }, data: dto });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') throw new NotFoundException(`Tipo de unidad con ID "${id}" no encontrado`);
                if (error.code === 'P2002') throw new ConflictException(`Ya existe un tipo con el nombre "${dto.nombre}"`);
            }
            throw error;
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.tiposunidad.delete({ where: { id } });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Tipo de unidad con ID "${id}" no encontrado`);
            }
            throw error;
        }
    }
}
