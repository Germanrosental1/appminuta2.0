import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';

export enum DocType {
    Ganancias = 'Ganancias',
    BienesPersonales = 'BienesPersonales',
    IVA = 'IVA',
    ReciboHaberes = 'ReciboHaberes',
    Monotributo = 'Monotributo',
    CertificacionContable = 'CertificacionContable',
    Otros = 'Otros',
    DNI = 'DNI',
    EECC = 'EECC',
}

export class CreateUifDocumentDto {
    @IsUUID()
    client_id: string;

    @IsUUID()
    @IsOptional()
    analysis_id?: string;

    @IsEnum(DocType)
    doc_type: DocType;

    @IsString()
    storage_path: string;

    @IsString()
    @IsOptional()
    original_filename?: string;

    @IsString()
    @IsOptional()
    mime_type?: string;

    @IsString()
    @IsOptional()
    storage_bucket?: string;
}
