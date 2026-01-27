import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * DTO para validar query params del endpoint GET /unidades
 * Reemplaza el uso de `any` en el controller y service
 */
export class FindAllUnidadesQueryDto {
    @IsOptional()
    @IsString()
    proyecto?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => {
        if (!value) return value;
        // Normalizar estado a Title Case
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    })
    @IsIn([
        'Disponible',
        'Reservado',
        'Vendido',
        'No Disponible',
        'Bloqueado'
    ], {
        message: 'estado debe ser uno de: Disponible, Reservado, Vendido, No Disponible, Bloqueado'
    })
    estado?: string;

    @IsOptional()
    @IsString()
    etapa?: string;

    @IsOptional()
    @IsString()
    tipo?: string;

    @IsOptional()
    @IsString()
    sectorid?: string;

    @IsOptional()
    @IsString()
    nrounidad?: string;

    // ⚡ PERFORMANCE: Paginación
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(500)
    limit?: number = 100;
}
