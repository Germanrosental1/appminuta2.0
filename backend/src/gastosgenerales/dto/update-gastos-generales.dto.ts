
import { IsUUID, IsNumber, IsString, IsOptional } from 'class-validator';

export class UpdateGastosGeneralesDto {
    @IsOptional()
    @IsNumber()
    sellado?: number;

    @IsOptional()
    @IsString()
    certificaciondefirmas?: string;

    @IsOptional()
    @IsNumber()
    alajamiento?: number;

    @IsOptional()
    @IsString()
    planosm2propiedad?: string;

    @IsOptional()
    @IsString()
    planosm2cochera?: string;

    @IsOptional()
    @IsNumber()
    comisioninmobiliaria?: number;

    @IsOptional()
    @IsString()
    otrosgastos?: string;
}
