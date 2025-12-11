import { IsUUID, IsString, IsDateString, IsIn, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class FindAllMinutasQueryDto {
    @IsUUID()
    @IsOptional()
    usuario_id?: string;

    @IsString()
    @IsOptional()
    proyecto?: string;

    @IsIn(['Provisoria', 'En Revisión', 'Definitiva', 'Rechazada'])
    @IsOptional()
    estado?: string;

    @IsDateString()
    @IsOptional()
    fechaDesde?: string;

    @IsDateString()
    @IsOptional()
    fechaHasta?: string;

    @IsIn(['fecha_creacion', 'updated_at', 'proyecto', 'estado'])
    @IsOptional()
    sortBy?: string;

    @IsIn(['asc', 'desc'])
    @IsOptional()
    sortOrder?: 'asc' | 'desc';

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit?: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number;
}
