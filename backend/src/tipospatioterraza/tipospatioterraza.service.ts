import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoPatioTerrazaDto, UpdateTipoPatioTerrazaDto } from './dto/create-tipopatioterraza.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class TiposPatioTerrazaService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateTipoPatioTerrazaDto) {
        try {
            return await this.prisma.tiposPatioTerraza.create({ data: { Nombre: dto.nombre } });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Ya existe un tipo de patio/terraza con el nombre "${dto.nombre}"`);
            }
            throw error;
        }
    }

    async findAll() {
        return await this.prisma.tiposPatioTerraza.findMany({ orderBy: { Nombre: 'asc' } });
    }

    async findOne(id: string) {
        const tipo = await this.prisma.tiposPatioTerraza.findUnique({ where: { Id: id } });
        if (!tipo) throw new NotFoundException(`Tipo de patio/terraza con ID "${id}" no encontrado`);
        return tipo;
    }

    async update(id: string, dto: UpdateTipoPatioTerrazaDto) {
        try {
            return await this.prisma.tiposPatioTerraza.update({ where: { Id: id }, data: { Nombre: dto.nombre } });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2025') throw new NotFoundException(`Tipo de patio/terraza con ID "${id}" no encontrado`);
                if (error.code === 'P2002') throw new ConflictException(`Ya existe un tipo con el nombre "${dto.nombre}"`);
            }
            throw error;
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.tiposPatioTerraza.delete({ where: { Id: id } });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Tipo de patio/terraza con ID "${id}" no encontrado`);
            }
            throw error;
        }
    }
}
