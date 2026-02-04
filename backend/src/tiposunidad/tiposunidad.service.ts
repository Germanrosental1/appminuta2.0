import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoUnidadDto, UpdateTipoUnidadDto } from './dto/create-tipounidad.dto';
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
            const result = await this.prisma.tiposUnidad.create({ data: { Nombre: dto.nombre } });
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

        const data = await this.prisma.tiposUnidad.findMany({ orderBy: { Nombre: 'asc' } });
        await this.cacheManager.set(CACHE_KEY, data);
        return data;
    }

    async findOne(id: string) {
        const tipo = await this.prisma.tiposUnidad.findUnique({
            where: { Id: id },
            include: { Unidades: { select: { Id: true, SectorId: true, NroUnidad: true } } },
        });
        if (!tipo) throw new NotFoundException(`Tipo de unidad con ID "${id}" no encontrado`);
        return tipo;
    }

    async update(id: string, dto: UpdateTipoUnidadDto) {
        try {
            const result = await this.prisma.tiposUnidad.update({ where: { Id: id }, data: { Nombre: dto.nombre } });
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
            const result = await this.prisma.tiposUnidad.delete({ where: { Id: id } });
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
