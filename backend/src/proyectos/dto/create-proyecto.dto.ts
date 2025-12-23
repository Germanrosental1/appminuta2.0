import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProyectoDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsString()
    @IsNotEmpty()
    tabla_nombre: string;

    @IsString()
    @IsOptional()
    descripcion?: string;

    @IsString()
    @IsOptional()
    direccion?: string;

    @IsString()
    @IsOptional()
    localidad?: string;

    @IsString()
    @IsOptional()
    provincia?: string;

    @IsBoolean()
    @IsOptional()
    activo?: boolean;
}
