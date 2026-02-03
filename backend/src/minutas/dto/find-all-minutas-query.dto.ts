import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, Min, Max, IsOptional, Matches } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class FindAllMinutasQueryDto {
    @ApiPropertyOptional({
        description: 'Filtrar por usuario creador (UUID)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsOptional()
    @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
        message: 'usuario_id debe ser un UUID válido',
    })
    usuario_id?: string;

    @ApiPropertyOptional({
        description: 'Filtrar por proyecto (UUID)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsOptional()
    @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
        message: 'proyecto debe ser un UUID válido',
    })
    proyecto?: string;

    @ApiPropertyOptional({
        description: 'Filtrar por estado de la minuta',
        enum: [
            'Provisoria',
            'Pendiente',
            'En Revisión',
            'Aprobada',
            'Definitiva',
            'Firmada',
            'Rechazada',
            'Cancelada',
        ],
        example: 'Provisoria',
    })
    @Transform(({ value }) => {
        if (!value) return value;
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    })
    @IsIn(
        [
            'Provisoria',
            'Pendiente',
            'En Revisión',
            'Aprobada',
            'Definitiva',
            'Firmada',
            'Rechazada',
            'Cancelada',
        ],
        {
            message:
                'estado debe ser uno de: Provisoria, Pendiente, En Revisión, Aprobada, Definitiva, Firmada, Rechazada, Cancelada',
        },
    )
    @IsOptional()
    estado?: string;

    @ApiPropertyOptional({
        description: 'Fecha desde (ISO 8601)',
        example: '2026-01-01T00:00:00.000Z',
    })
    @IsDateString(
        {},
        {
            message: 'fechaDesde debe ser una fecha válida en formato ISO 8601',
        },
    )
    @IsOptional()
    fechaDesde?: string;

    @ApiPropertyOptional({
        description: 'Fecha hasta (ISO 8601)',
        example: '2026-12-31T23:59:59.999Z',
    })
    @IsDateString(
        {},
        {
            message: 'fechaHasta debe ser una fecha válida en formato ISO 8601',
        },
    )
    @IsOptional()
    fechaHasta?: string;

    @ApiPropertyOptional({
        description: 'Campo para ordenar resultados',
        enum: ['fecha_creacion', 'updated_at', 'proyecto', 'estado'],
        example: 'fecha_creacion',
    })
    @IsIn(['fecha_creacion', 'updated_at', 'proyecto', 'estado'], {
        message: 'sortBy debe ser uno de: fecha_creacion, updated_at, proyecto, estado',
    })
    @IsOptional()
    sortBy?: string;

    @ApiPropertyOptional({
        description: 'Orden de resultados',
        enum: ['asc', 'desc'],
        example: 'desc',
    })
    @IsIn(['asc', 'desc'], {
        message: 'sortOrder debe ser asc o desc',
    })
    @IsOptional()
    sortOrder?: 'asc' | 'desc';

    @ApiPropertyOptional({
        description: 'Límite de resultados por página',
        minimum: 1,
        maximum: 100,
        default: 20,
        example: 20,
    })
    @Type(() => Number)
    @IsInt({ message: 'limit debe ser un número entero' })
    @Min(1, { message: 'limit debe ser al menos 1' })
    @Max(100, { message: 'limit no puede ser mayor a 100' })
    @IsOptional()
    limit?: number;

    @ApiPropertyOptional({
        description: 'Número de página (comienza en 1)',
        minimum: 1,
        default: 1,
        example: 1,
    })
    @Type(() => Number)
    @IsInt({ message: 'page debe ser un número entero' })
    @Min(1, { message: 'page debe ser al menos 1' })
    @IsOptional()
    page?: number;
}
