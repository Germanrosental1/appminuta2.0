import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

export enum DocumentStatus {
    Pendiente = 'Pendiente',
    Procesando = 'Procesando',
    ListoParaRevision = 'ListoParaRevision',
    Validado = 'Validado',
    Error = 'Error',
}

export class UpdateUifDocumentDto {
    @IsEnum(DocumentStatus)
    @IsOptional()
    status?: DocumentStatus;

    @IsObject()
    @IsOptional()
    extracted_data?: Record<string, any>;

    @IsObject()
    @IsOptional()
    reviewed_data?: Record<string, any>;

    @IsString()
    @IsOptional()
    error_message?: string;
}

export class WebhookDocumentProcessedDto {
    @IsString()
    document_id: string;

    @IsObject()
    @IsOptional()
    extracted_data?: Record<string, any>;

    @IsString()
    @IsOptional()
    status?: string;

    @IsString()
    @IsOptional()
    error_message?: string;

    @IsOptional()
    confidence?: number;

    @IsOptional()
    dolar_rate?: number;

    @IsOptional()
    missing_fields?: string[];
}
