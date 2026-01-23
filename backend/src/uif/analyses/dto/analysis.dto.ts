import { IsString, IsUUID, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

export class CreateUifAnalysisDto {
    @IsUUID()
    client_id: string;

    @IsString()
    @IsNotEmpty({ message: 'El nombre del análisis es requerido' })
    name: string;

    @IsObject()
    @IsOptional()
    financial_data?: Record<string, any>;

    @IsObject()
    @IsOptional()
    analysis_settings?: Record<string, any>;
}

export class UpdateUifAnalysisDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    status?: string;

    @IsObject()
    @IsOptional()
    financial_data?: Record<string, any>;

    @IsObject()
    @IsOptional()
    analysis_settings?: Record<string, any>;
}
