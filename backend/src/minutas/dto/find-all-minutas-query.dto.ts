import { IsDateString, IsIn, IsInt, Min, Max, IsOptional, Matches } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class FindAllMinutasQueryDto {
    // SEGURIDAD: Validar UUID con regex estricto
    @IsOptional()
    @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
        message: 'usuario_id debe ser un UUID válido'
    })
    usuario_id?: string;

    // SEGURIDAD: Validar UUID para proyecto
    @IsOptional()
    @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
        message: 'proyecto debe ser un UUID válido'
    })
    proyecto?: string;

    // SEGURIDAD: Normalizar estado a Title Case y validar
    @Transform(({ value }) => {
        if (!value) return value;
        // Convertir a Title Case: "pendiente" -> "Pendiente"
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    })
    @IsIn([
        'Provisoria',
        'Pendiente',
        'En Revisión',
        'Aprobada',
        'Definitiva',
        'Firmada',
        'Rechazada',
        'Cancelada'
    ], {
        message: 'estado debe ser uno de: Provisoria, Pendiente, En Revisión, Aprobada, Definitiva, Firmada, Rechazada, Cancelada'
    })
    @IsOptional()
    estado?: string;

    @IsDateString({}, {
        message: 'fechaDesde debe ser una fecha válida en formato ISO 8601'
    })
    @IsOptional()
    fechaDesde?: string;

    @IsDateString({}, {
        message: 'fechaHasta debe ser una fecha válida en formato ISO 8601'
    })
    @IsOptional()
    fechaHasta?: string;

    // 🔒 SEGURIDAD: Whitelist de campos permitidos para ordenamiento
    @IsIn(['fecha_creacion', 'updated_at', 'proyecto', 'estado'], {
        message: 'sortBy debe ser uno de: fecha_creacion, updated_at, proyecto, estado'
    })
    @IsOptional()
    sortBy?: string;

    @IsIn(['asc', 'desc'], {
        message: 'sortOrder debe ser asc o desc'
    })
    @IsOptional()
    sortOrder?: 'asc' | 'desc';

    @Type(() => Number)
    @IsInt({ message: 'limit debe ser un número entero' })
    @Min(1, { message: 'limit debe ser al menos 1' })
    @Max(100, { message: 'limit no puede ser mayor a 100' })
    @IsOptional()
    limit?: number;

    @Type(() => Number)
    @IsInt({ message: 'page debe ser un número entero' })
    @Min(1, { message: 'page debe ser al menos 1' })
    @IsOptional()
    page?: number;
}
