import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEstadoComercialDto } from './dto/create-estadocomercial.dto';
import { UpdateEstadoComercialDto } from './dto/update-estadocomercial.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
// ⚡ OPTIMIZACIÓN: Cache para catálogos
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

const CACHE_KEY = 'estadocomercial:all';

@Injectable()
export class EstadoComercialService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) { }

    // ⚡ Invalidar cache
    private async invalidateCache(): Promise<void> {
        await this.cacheManager.del(CACHE_KEY);
    }

    async create(createEstadoComercialDto: CreateEstadoComercialDto) {
        try {
            const result = await this.prisma.estadoComercial.create({
                data: { NombreEstado: createEstadoComercialDto.nombreestado },
            });
            await this.invalidateCache();
            return result;
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException(
                        `Ya existe un estado con el nombre "${createEstadoComercialDto.nombreestado}"`,
                    );
                }
            }
            throw error;
        }
    }

    // ⚡ OPTIMIZACIÓN: Cache en findAll()
    async findAll() {
        const cached = await this.cacheManager.get(CACHE_KEY);
        if (cached) return cached;

        const data = await this.prisma.estadoComercial.findMany({
            orderBy: { NombreEstado: 'asc' },
        });
        await this.cacheManager.set(CACHE_KEY, data);
        return data;
    }

    async findOne(id: string) {
        const estado = await this.prisma.estadoComercial.findUnique({
            where: { Id: id },
            include: {
                DetallesVenta: {
                    include: {
                        Unidades_DetallesVenta_UnidadIdToUnidades: {
                            select: { Id: true, SectorId: true, NroUnidad: true },
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
            const result = await this.prisma.estadoComercial.update({
                where: { Id: id },
                data: { NombreEstado: updateEstadoComercialDto.nombreestado },
            });
            await this.invalidateCache();
            return result;
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
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
            const result = await this.prisma.estadoComercial.delete({
                where: { Id: id },
            });
            await this.invalidateCache();
            return result;
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
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
