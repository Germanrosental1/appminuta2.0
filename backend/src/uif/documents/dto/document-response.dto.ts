import { ApiProperty } from '@nestjs/swagger';
import { DocType } from './create-document.dto';

export class UifDocumentResponseDto {
    @ApiProperty({ description: 'ID único (UUID)' })
    id: string;

    @ApiProperty({ description: 'ID del cliente asociado' })
    client_id: string;

    @ApiProperty({ description: 'ID del análisis asociado', required: false })
    analysis_id?: string;

    @ApiProperty({ enum: DocType, description: 'Tipo de documento' })
    doc_type: DocType;

    @ApiProperty({ description: 'Path en el storage' })
    storage_path: string;

    @ApiProperty({ description: 'Nombre original del archivo', required: false })
    original_filename?: string;

    @ApiProperty({ description: 'MIME type', required: false })
    mime_type?: string;

    @ApiProperty({ description: 'Bucket de storage', required: false })
    storage_bucket?: string;

    @ApiProperty({ description: 'Fecha de creación' })
    created_at: Date;

    @ApiProperty({ description: 'Fecha de actualización' })
    updated_at: Date;
}
