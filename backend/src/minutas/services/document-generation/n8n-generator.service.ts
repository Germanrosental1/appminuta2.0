import { Injectable } from '@nestjs/common';
import {
    IDocumentGenerator,
    GeneratedDocument,
    MinutaData
} from './document-generator.interface';

/**
 * N8N Document Generator
 * Generates documents using N8N webhook workflow
 */
@Injectable()
export class N8nDocumentGenerator implements IDocumentGenerator {
    async generate(data: MinutaData): Promise<GeneratedDocument> {
        const webhookUrl = process.env.N8N_WEBHOOK_URL;

        if (!webhookUrl) {
            throw new Error('N8N_WEBHOOK_URL not configured');
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`N8N service error: ${response.status} - ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'application/pdf';
        const buffer = Buffer.from(await response.arrayBuffer());

        return {
            buffer,
            contentType,
            filename: `minuta_${Date.now()}.pdf`
        };
    }

    getSupportedFormats(): string[] {
        return ['pdf', 'docx'];
    }

    getProviderName(): string {
        return 'n8n';
    }
}
