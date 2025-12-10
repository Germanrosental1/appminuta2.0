import { IsNotEmpty, IsString, IsObject, IsOptional, IsUUID } from 'class-validator';

export class CreateMinutaDto {
    @IsUUID()
    @IsNotEmpty()
    usuario_id: string;

    @IsString()
    @IsNotEmpty()
    proyecto: string;

    @IsString()
    @IsNotEmpty()
    estado: string;

    @IsObject()
    @IsNotEmpty()
    datos: any;

    @IsObject()
    @IsOptional()
    datos_adicionales?: any;

    @IsObject()
    @IsOptional()
    datos_mapa_ventas?: any;

    @IsString()
    @IsOptional()
    comentarios?: string;

    @IsString()
    @IsOptional()
    url_documento?: string;
}
