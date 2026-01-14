
import { IsUUID, IsNumber, IsString, IsOptional } from 'class-validator';

export class UpdateGastosGeneralesDto {
    @IsOptional()
    @IsNumber()
    sellado?: number;

    @IsOptional()
    @IsNumber()
    certificaciondefirmas?: number;

    @IsOptional()
    @IsNumber()
    alajamiento?: number;

    @IsOptional()
    @IsNumber()
    planosm2propiedad?: number;

    @IsOptional()
    @IsNumber()
    planosm2cochera?: number;

    @IsOptional()
    @IsNumber()
    comisioninmobiliaria?: number;

    @IsOptional()
    @IsNumber()
    otrosgastos?: number;

    @IsOptional()
    @IsString()
    fecha_posesion?: string;

    @IsOptional()
    @IsString()
    etapatorre?: string;
}
