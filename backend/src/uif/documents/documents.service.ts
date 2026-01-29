import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaUifService } from '../../prisma-uif/prisma-uif.service';
import { CreateUifDocumentDto } from './dto/create-document.dto';
import { UpdateUifDocumentDto, WebhookDocumentProcessedDto } from './dto/update-document.dto';
import { LoggerService } from '../../logger/logger.service';
import { sanitizeObject } from '../../common/sanitize.helper';

@Injectable()
export class UifDocumentsService {
    constructor(
        private readonly prisma: PrismaUifService,
        private readonly logger: LoggerService,
    ) { }

    async findByClient(clientId: string) {
        return this.prisma.documents.findMany({
            where: { client_id: clientId },
            orderBy: { created_at: 'desc' },
        });
    }

    async findOne(id: string) {
        const doc = await this.prisma.documents.findUnique({
            where: { id },
            include: { client: true, analysis: true },
        });

        if (!doc) {
            throw new NotFoundException(`Documento UIF con ID ${id} no encontrado`);
        }

        return doc;
    }

    async create(dto: CreateUifDocumentDto, userId: string, userEmail: string) {
        const sanitizedDto = sanitizeObject(dto);

        const doc = await this.prisma.documents.create({
            data: {
                client_id: sanitizedDto.client_id,
                analysis_id: sanitizedDto.analysis_id,
                doc_type: sanitizedDto.doc_type,
                storage_path: sanitizedDto.storage_path,
                storage_bucket: sanitizedDto.storage_bucket || 'documents',
                original_filename: sanitizedDto.original_filename,
                mime_type: sanitizedDto.mime_type,
                status: 'Pendiente',
            },
        });

        await this.logger.agregarLog({
            motivo: 'Subida de Documento UIF',
            descripcion: `Documento ${doc.doc_type} subido para procesamiento`,
            impacto: 'Bajo',
            tablaafectada: 'uif.documents',
            usuarioID: userId,
            usuarioemail: userEmail,
        });

        return doc;
    }

    async update(id: string, dto: UpdateUifDocumentDto, userId: string, userEmail: string) {
        await this.findOne(id);

        const sanitizedDto = sanitizeObject(dto);

        const doc = await this.prisma.documents.update({
            where: { id },
            data: {
                ...sanitizedDto,
                processed_at: dto.status === 'Validado' || dto.status === 'ListoParaRevision'
                    ? new Date()
                    : undefined,
            },
        });

        await this.logger.agregarLog({
            motivo: 'Actualización de Documento UIF',
            descripcion: `Documento actualizado a estado: ${doc.status}`,
            impacto: 'Bajo',
            tablaafectada: 'uif.documents',
            usuarioID: userId,
            usuarioemail: userEmail,
        });

        return doc;
    }

    async remove(id: string, userId: string, userEmail: string) {
        const doc = await this.findOne(id);

        await this.prisma.documents.delete({ where: { id } });

        await this.logger.agregarLog({
            motivo: 'Eliminación de Documento UIF',
            descripcion: `Documento ${doc.doc_type} eliminado`,
            impacto: 'Medio',
            tablaafectada: 'uif.documents',
            usuarioID: userId,
            usuarioemail: userEmail,
        });

        return { deleted: true, id };
    }

    /**
     * Webhook endpoint para n8n - actualiza documento procesado
     * Este método NO requiere autenticación (es llamado por n8n)
     */
    async processWebhook(dto: WebhookDocumentProcessedDto) {
        // ... implementation
    }

    async analyze(id: string, signedUrl: string, userId: string, userEmail: string) {
        const doc = await this.findOne(id);

        if (!doc) throw new NotFoundException('Documento no encontrado');

        // Update status
        await this.prisma.documents.update({
            where: { id },
            data: { status: 'Procesando', error_message: null },
        });

        // Call n8n
        const n8nUrl = process.env.N8N_WEBHOOK_URL;
        if (!n8nUrl) {
            throw new Error('N8N_WEBHOOK_URL not configured');
        }

        try {
            // Usamos fetch nativo o axios
            const response = await fetch(n8nUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    document_id: doc.id,
                    document_url: signedUrl,
                    doc_type: doc.doc_type,
                    original_filename: doc.original_filename,
                }),
            });

            if (!response.ok) {
                throw new Error(`N8N Error: ${response.statusText}`);
            }
        } catch (error: unknown) {
            // Revert status on error
            await this.prisma.documents.update({
                where: { id },
                data: { status: 'Error', error_message: 'Error al iniciar análisis: ' + (error instanceof Error ? error.message : JSON.stringify(error)) },
            });
            throw error;
        }

        await this.logger.agregarLog({
            motivo: 'Inicio de Análisis UIF',
            descripcion: `Documento ${doc.doc_type} enviado a procesar`,
            impacto: 'Bajo',
            tablaafectada: 'uif.documents',
            usuarioID: userId,
            usuarioemail: userEmail,
        });

        return { success: true };
    }
}
