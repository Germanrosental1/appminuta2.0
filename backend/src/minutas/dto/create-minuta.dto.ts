import { IsNotEmpty, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DatosMinutaDto } from './datos-minuta.dto';

export class CreateMinutaDto {
    @IsString()
    @IsNotEmpty()
    proyecto: string;

    @IsString()
    @IsNotEmpty()
    estado: string;

    @ValidateNested()
    @Type(() => DatosMinutaDto)
    @IsNotEmpty()
    datos: DatosMinutaDto;

    @ValidateNested()
    @Type(() => DatosMinutaDto)
    @IsOptional()
    datos_adicionales?: DatosMinutaDto;

    @ValidateNested()
    @Type(() => DatosMinutaDto)
    @IsOptional()
    datos_mapa_ventas?: DatosMinutaDto;

    @IsString()
    @IsOptional()
    comentarios?: string;

    @IsString()
    @IsOptional()
    url_documento?: string;
}
