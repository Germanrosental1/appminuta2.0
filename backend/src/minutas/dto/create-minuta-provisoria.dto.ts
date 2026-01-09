import { IsNotEmpty, IsString, IsObject, IsOptional, IsUUID, IsNumber } from 'class-validator';

export class CreateMinutaProvisoriaDto {
    @IsString()
    @IsNotEmpty()
    proyecto: string;

    @IsNumber()
    @IsNotEmpty()
    unidad_id: number | bigint;

    @IsUUID()
    @IsNotEmpty()
    usuario_id: string;

    @IsString()
    @IsNotEmpty()
    estado: string;

    @IsObject()
    @IsNotEmpty()
    datos: any;

    @IsString()
    @IsOptional()
    comentarios?: string;
}
