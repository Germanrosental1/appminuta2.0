import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateGastosGeneralesDto } from './dto/update-gastos-generales.dto';

export interface GastosGenerales {
    proyecto: string;
    sellado: number | null;
    certificaciondefirmas: number | null;
    alajamiento: number | null;
    planosm2propiedad: number | null;
    planosm2cochera: number | null;
    comisioninmobiliaria: number | null;
    otrosgastos: number | null;
    created_at: Date | null;
    fecha_posesion: string | null;
    etapatorre: string | null;
}

@Injectable()
export class GastosgeneralesService {
    constructor(private readonly prisma: PrismaService) { }

    async findByProject(projectId: string): Promise<GastosGenerales | null> {
        // Usar raw SQL porque el modelo tiene @@ignore
        const result = await this.prisma.$queryRaw<GastosGenerales[]>`
            SELECT * FROM gastosgenerales WHERE proyecto = ${projectId}::uuid
        `;

        return result.length > 0 ? result[0] : null;
    }

    async updateByProject(projectId: string, updateDto: UpdateGastosGeneralesDto): Promise<GastosGenerales> {
        // Verificamos que el proyecto exista
        const projectExists = await this.prisma.proyectos.findUnique({
            where: { Id: projectId },
        });

        if (!projectExists) {
            throw new NotFoundException(`Proyecto con ID ${projectId} no encontrado`);
        }

        // Verificar si existe el registro
        const existing = await this.findByProject(projectId);

        if (existing) {
            // Update existente
            await this.prisma.$executeRaw`
                UPDATE gastosgenerales SET
                    sellado = COALESCE(${updateDto.sellado}, sellado),
                    certificaciondefirmas = COALESCE(${updateDto.certificaciondefirmas}, certificaciondefirmas),
                    alajamiento = COALESCE(${updateDto.alajamiento}, alajamiento),
                    planosm2propiedad = COALESCE(${updateDto.planosm2propiedad}, planosm2propiedad),
                    planosm2cochera = COALESCE(${updateDto.planosm2cochera}, planosm2cochera),
                    comisioninmobiliaria = COALESCE(${updateDto.comisioninmobiliaria}, comisioninmobiliaria),
                    otrosgastos = COALESCE(${updateDto.otrosgastos}, otrosgastos),
                    fecha_posesion = COALESCE(${updateDto.fecha_posesion}, fecha_posesion),
                    etapatorre = COALESCE(${updateDto.etapatorre}, etapatorre)
                WHERE proyecto = ${projectId}::uuid
            `;
        } else {
            // Insert nuevo
            await this.prisma.$executeRaw`
                INSERT INTO gastosgenerales (
                    proyecto, sellado, certificaciondefirmas, alajamiento,
                    planosm2propiedad, planosm2cochera, comisioninmobiliaria,
                    otrosgastos, fecha_posesion, etapatorre
                ) VALUES (
                    ${projectId}::uuid,
                    ${updateDto.sellado ?? null},
                    ${updateDto.certificaciondefirmas ?? null},
                    ${updateDto.alajamiento ?? null},
                    ${updateDto.planosm2propiedad ?? null},
                    ${updateDto.planosm2cochera ?? null},
                    ${updateDto.comisioninmobiliaria ?? null},
                    ${updateDto.otrosgastos ?? null},
                    ${updateDto.fecha_posesion ?? null},
                    ${updateDto.etapatorre ?? null}
                )
            `;
        }

        // Retornar el registro actualizado
        const updated = await this.findByProject(projectId);
        if (!updated) {
            throw new Error('Error al actualizar gastos generales');
        }
        return updated;
    }
}
