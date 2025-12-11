import { IsString, IsOptional, IsNumber, IsArray, IsObject, IsBoolean } from 'class-validator';

/**
 * DTO para validar la estructura de datos de una minuta
 */
export class DatosMinutaDto {
    @IsString()
    @IsOptional()
    descripcion?: string;

    @IsString()
    @IsOptional()
    observaciones?: string;

    @IsNumber()
    @IsOptional()
    superficie?: number;

    @IsNumber()
    @IsOptional()
    precio?: number;

    @IsString()
    @IsOptional()
    tipo_unidad?: string;

    @IsString()
    @IsOptional()
    orientacion?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    caracteristicas?: string[];

    @IsObject()
    @IsOptional()
    ubicacion?: Record<string, any>;

    @IsBoolean()
    @IsOptional()
    disponible?: boolean;

    // Permitir campos adicionales pero validados
    [key: string]: any;
}
