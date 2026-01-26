import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTipoCocheraDto, UpdateTipoCocheraDto } from './dto/create-tipocochera.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class TiposCocheraService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateTipoCocheraDto) {
        try {
            return await this.prisma.tiposCochera.create({ data: { Nombre: dto.nombre } });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Ya existe un tipo de cochera con el nombre "${dto.nombre}"`);
            }
            throw error;
        }
    }

    async findAll() {
        return await this.prisma.tiposCochera.findMany({ orderBy: { Nombre: 'asc' } });
    }

    async findOne(id: string) {
        const tipo = await this.prisma.tiposCochera.findUnique({ where: { Id: id } });
        if (!tipo) throw new NotFoundException(`Tipo de cochera con ID "${id}" no encontrado`);
        return tipo;
    }

    async update(id: string, dto: UpdateTipoCocheraDto) {
        try {
            return await this.prisma.tiposCochera.update({ where: { Id: id }, data: { Nombre: dto.nombre } });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2025') throw new NotFoundException(`Tipo de cochera con ID "${id}" no encontrado`);
                if (error.code === 'P2002') throw new ConflictException(`Ya existe un tipo con el nombre "${dto.nombre}"`);
            }
            throw error;
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.tiposCochera.delete({ where: { Id: id } });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Tipo de cochera con ID "${id}" no encontrado`);
            }
            throw error;
        }
    }
}
