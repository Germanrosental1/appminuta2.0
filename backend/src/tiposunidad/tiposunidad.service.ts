import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoUnidadDto, UpdateTipoUnidadDto } from './dto/create-tipounidad.dto';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
// ⚡ OPTIMIZACIÓN: Cache para catálogos
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

const CACHE_KEY = 'tiposunidad:all';

@Injectable()
export class TiposUnidadService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) { }

    // ⚡ Invalidar cache
    private async invalidateCache(): Promise<void> {
        await this.cacheManager.del(CACHE_KEY);
    }

    async create(dto: CreateTipoUnidadDto) {
        try {
            const result = await this.prisma.tiposunidad.create({ data: dto });
            await this.invalidateCache();
            return result;
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Ya existe un tipo de unidad con el nombre "${dto.nombre}"`);
            }
            throw error;
        }
    }

    // ⚡ OPTIMIZACIÓN: Cache en findAll()
    async findAll() {
        const cached = await this.cacheManager.get(CACHE_KEY);
        if (cached) return cached;

        const data = await this.prisma.tiposunidad.findMany({ orderBy: { nombre: 'asc' } });
        await this.cacheManager.set(CACHE_KEY, data);
        return data;
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
            const result = await this.prisma.tiposunidad.update({ where: { id }, data: dto });
            await this.invalidateCache();
            return result;
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2025') throw new NotFoundException(`Tipo de unidad con ID "${id}" no encontrado`);
                if (error.code === 'P2002') throw new ConflictException(`Ya existe un tipo con el nombre "${dto.nombre}"`);
            }
            throw error;
        }
    }

    async remove(id: string) {
        try {
            const result = await this.prisma.tiposunidad.delete({ where: { id } });
            await this.invalidateCache();
            return result;
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Tipo de unidad con ID "${id}" no encontrado`);
            }
            throw error;
        }
    }
}
