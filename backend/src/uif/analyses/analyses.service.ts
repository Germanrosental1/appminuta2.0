import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaUifService } from '../../prisma-uif/prisma-uif.service';
import { CreateUifAnalysisDto, UpdateUifAnalysisDto } from './dto/analysis.dto';
import { LoggerService } from '../../logger/logger.service';
import { sanitizeObject } from '../../common/sanitize.helper';

@Injectable()
export class UifAnalysesService {
    constructor(
        private readonly prisma: PrismaUifService,
        private readonly logger: LoggerService,
    ) { }

    async findByClient(clientId: string) {
        return this.prisma.analyses.findMany({
            where: { client_id: clientId },
            include: {
                documents: {
                    select: {
                        id: true,
                        doc_type: true,
                        original_filename: true,
                        status: true,
                        created_at: true,
                        // Omit extracted_data and reviewed_data for performance
                    },
                    orderBy: { created_at: 'desc' },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    async findOne(id: string) {
        const analysis = await this.prisma.analyses.findUnique({
            where: { id },
            include: {
                client: true,
                documents: { orderBy: { created_at: 'desc' } },
            },
        });

        if (!analysis) {
            throw new NotFoundException(`Análisis UIF con ID ${id} no encontrado`);
        }

        return analysis;
    }

    async create(dto: CreateUifAnalysisDto, userId: string, userEmail: string) {
        const sanitizedDto = sanitizeObject(dto);

        // Obtener cliente para heredar sus datos financieros y settings
        const client = await this.prisma.clients.findUnique({
            where: { id: sanitizedDto.client_id },
        });

        if (!client) {
            throw new NotFoundException(`Cliente ${sanitizedDto.client_id} no encontrado`);
        }

        const analysis = await this.prisma.analyses.create({
            data: {
                client_id: sanitizedDto.client_id,
                name: sanitizedDto.name,
                status: 'En Proceso',
                financial_data: sanitizedDto.financial_data || client.financial_data,
                analysis_settings: sanitizedDto.analysis_settings || client.analysis_settings,
            },
        });

        await this.logger.agregarLog({
            motivo: 'Creación de Análisis UIF',
            descripcion: `Análisis "${analysis.name}" creado para cliente`,
            impacto: 'Medio',
            tablaafectada: 'uif.analyses',
            usuarioID: userId,
            usuarioemail: userEmail,
        });

        return analysis;
    }

    async update(id: string, dto: UpdateUifAnalysisDto, userId: string, userEmail: string) {
        await this.findOne(id);

        const sanitizedDto = sanitizeObject(dto);

        const analysis = await this.prisma.analyses.update({
            where: { id },
            data: sanitizedDto,
        });

        await this.logger.agregarLog({
            motivo: 'Actualización de Análisis UIF',
            descripcion: `Análisis "${analysis.name}" actualizado`,
            impacto: 'Bajo',
            tablaafectada: 'uif.analyses',
            usuarioID: userId,
            usuarioemail: userEmail,
        });

        return analysis;
    }

    async remove(id: string, userId: string, userEmail: string) {
        const analysis = await this.findOne(id);

        await this.prisma.analyses.delete({ where: { id } });

        await this.logger.agregarLog({
            motivo: 'Eliminación de Análisis UIF',
            descripcion: `Análisis "${analysis.name}" eliminado`,
            impacto: 'Alto',
            tablaafectada: 'uif.analyses',
            usuarioID: userId,
            usuarioemail: userEmail,
        });

        return { deleted: true, id };
    }

    /**
     * Finaliza un análisis y actualiza los datos del cliente
     */
    async finalize(id: string, userId: string, userEmail: string) {
        const analysis = await this.findOne(id);

        // Actualizar análisis como finalizado
        const updatedAnalysis = await this.prisma.analyses.update({
            where: { id },
            data: { status: 'Finalizado' },
        });

        // Actualizar datos financieros del cliente con los del análisis
        await this.prisma.clients.update({
            where: { id: analysis.client_id },
            data: {
                financial_data: analysis.financial_data as any,
                analysis_settings: analysis.analysis_settings as any,
            },
        });

        await this.logger.agregarLog({
            motivo: 'Finalización de Análisis UIF',
            descripcion: `Análisis "${analysis.name}" finalizado y datos sincronizados al cliente`,
            impacto: 'Alto',
            tablaafectada: 'uif.analyses',
            usuarioID: userId,
            usuarioemail: userEmail,
        });

        return updatedAnalysis;
    }
}
