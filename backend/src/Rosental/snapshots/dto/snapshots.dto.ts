import { IsIn, IsOptional, IsDateString } from 'class-validator';

/**
 * DTO para generar snapshot
 */
export class GenerateSnapshotDto {
    @IsOptional()
    @IsIn(['DIARIO', 'MENSUAL'], { message: 'tipo debe ser DIARIO o MENSUAL' })
    tipo?: 'DIARIO' | 'MENSUAL' = 'DIARIO';
}

/**
 * DTO para consultar por fecha
 */
export class GetSnapshotByDateDto {
    @IsDateString({}, { message: 'fecha debe ser una fecha válida (YYYY-MM-DD)' })
    fecha: string;
}

/**
 * DTO para consultar por rango
 */
export class GetSnapshotRangeDto {
    @IsDateString({}, { message: 'desde debe ser una fecha válida (YYYY-MM-DD)' })
    desde: string;

    @IsDateString({}, { message: 'hasta debe ser una fecha válida (YYYY-MM-DD)' })
    hasta: string;
}

/**
 * DTO para comparativo
 */
export class GetComparativoDto {
    @IsDateString({}, { message: 'mesActual debe ser una fecha válida (YYYY-MM-DD)' })
    mesActual: string;

    @IsDateString({}, { message: 'mesAnterior debe ser una fecha válida (YYYY-MM-DD)' })
    mesAnterior: string;
}
