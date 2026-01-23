import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class VerificarCrearClienteDto {
    @IsNumber()
    @IsOptional()
    dni?: number;

    @IsString()
    @IsNotEmpty()
    nombreApellido: string;

    @IsString()
    @IsOptional()
    telefono?: string;
}
