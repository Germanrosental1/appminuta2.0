import { IsNotEmpty, IsString, IsOptional, IsObject, IsUUID, IsNumber } from 'class-validator';

export class CreateMinutaDto {
    // proyecto puede ser null cuando no se tiene el UUID
    @IsUUID()
    @IsOptional()
    proyecto?: string | null;

    @IsString()
    @IsNotEmpty()
    estado: string;

    // 📝 datos contiene la estructura flexible del wizard
    @IsObject()
    @IsNotEmpty()
    datos: Record<string, any>;

    @IsObject()
    @IsOptional()
    datos_adicionales?: Record<string, any>;

    @IsOptional()
    datos_mapa_ventas?: any;

    @IsString()
    @IsOptional()
    comentarios?: string;

    @IsString()
    @IsOptional()
    url_documento?: string;

    // DNI del cliente interesado
    @IsNumber()
    @IsOptional()
    clienteInteresadoDni?: number;
}

