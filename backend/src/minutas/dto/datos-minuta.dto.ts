import {
    IsString,
    IsOptional,
    IsNumber,
    IsArray,
    IsObject,
    IsBoolean,
    ValidateNested,
    Min,
    Max,
    MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * DTO para ubicación geográfica
 */
export class UbicacionDto {
    @IsNumber()
    @Min(-90)
    @Max(90)
    @IsOptional()
    latitud?: number;

    @IsNumber()
    @Min(-180)
    @Max(180)
    @IsOptional()
    longitud?: number;

    @IsString()
    @MaxLength(200)
    @IsOptional()
    direccion?: string;
}

/**
 * DTO para validar la estructura de datos de una minuta
 * 🔒 SEGURIDAD: Validación profunda para prevenir inyección y prototype pollution
 */
export class DatosMinutaDto {
    @IsString()
    @MaxLength(1000)
    @IsOptional()
    descripcion?: string;

    @IsString()
    @MaxLength(2000)
    @IsOptional()
    observaciones?: string;

    @IsNumber()
    @Min(0)
    @Max(1000000) // Superficie máxima razonable en m²
    @IsOptional()
    superficie?: number;

    @IsNumber()
    @Min(0)
    @Max(1000000000) // Precio máximo razonable
    @IsOptional()
    precio?: number;

    @IsString()
    @MaxLength(100)
    @IsOptional()
    tipo_unidad?: string;

    @IsString()
    @MaxLength(50)
    @IsOptional()
    orientacion?: string;

    @IsArray()
    @IsString({ each: true })
    @MaxLength(200, { each: true })
    @IsOptional()
    caracteristicas?: string[];

    @ValidateNested()
    @Type(() => UbicacionDto)
    @IsOptional()
    ubicacion?: UbicacionDto;

    @IsBoolean()
    @IsOptional()
    disponible?: boolean;

    // 🔒 SEGURIDAD: Transformar para remover propiedades peligrosas
    @Transform(({ value }) => {
        if (value && typeof value === 'object') {
            // Filtrar propiedades peligrosas sin usar delete
            const dangerousProps = ['__proto__', 'constructor', 'prototype'];
            const sanitized: Record<string, string | number | boolean> = {};

            for (const [key, val] of Object.entries(value)) {
                if (!dangerousProps.includes(key)) {
                    sanitized[key] = val as string | number | boolean;
                }
            }

            return sanitized;
        }
        return value;
    })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, string | number | boolean>;
}
