import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEtapaDto } from './dto/create-etapa.dto';
import { UpdateEtapaDto } from './dto/update-etapa.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
// ⚡ OPTIMIZACIÓN: Cache para catálogos
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

const CACHE_KEY = 'etapas:all';

@Injectable()
export class EtapasService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) { }

    // ⚡ Invalidar cache cuando se modifica el catálogo
    private async invalidateCache(): Promise<void> {
        await this.cacheManager.del(CACHE_KEY);
    }

    async create(createEtapaDto: CreateEtapaDto) {
        try {
            const result = await this.prisma.etapas.create({
                data: createEtapaDto,
            });
            await this.invalidateCache(); // Invalidar cache al crear
            return result;
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException(
                        `Ya existe una etapa con el nombre "${createEtapaDto.nombre}"`,
                    );
                }
            }
            throw error;
        }
    }

    // ⚡ OPTIMIZACIÓN: Cache en findAll() - reduce ~80% queries a DB
    async findAll() {
        // Intentar obtener del cache
        const cached = await this.cacheManager.get(CACHE_KEY);
        if (cached) return cached;

        // Si no está en cache, consultar DB y guardar
        const data = await this.prisma.etapas.findMany({
            orderBy: { nombre: 'asc' },
        });

        await this.cacheManager.set(CACHE_KEY, data);
        return data;
    }

    async findOne(id: string) {
        const etapa = await this.prisma.etapas.findUnique({
            where: { id },
            include: {
                unidades: {
                    select: {
                        id: true,
                        sectorid: true,
                        nrounidad: true,
                    },
                },
            },
        });

        if (!etapa) {
            throw new NotFoundException(`Etapa con ID "${id}" no encontrada`);
        }

        return etapa;
    }

    async update(id: string, updateEtapaDto: UpdateEtapaDto) {
        try {
            return await this.prisma.etapas.update({
                where: { id },
                data: updateEtapaDto,
            }).then(async (result) => {
                await this.invalidateCache();
                return result;
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Etapa con ID "${id}" no encontrada`);
                }
                if (error.code === 'P2002') {
                    throw new ConflictException(
                        `Ya existe una etapa con el nombre "${updateEtapaDto.nombre}"`,
                    );
                }
            }
            throw error;
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.etapas.delete({
                where: { id },
            }).then(async (result) => {
                await this.invalidateCache();
                return result;
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new NotFoundException(`Etapa con ID "${id}" no encontrada`);
                }
                if (error.code === 'P2003') {
                    throw new ConflictException(
                        'No se puede eliminar la etapa porque tiene unidades asociadas',
                    );
                }
            }
            throw error;
        }
    }
}
