import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class VerificarCrearClienteDto {
    @IsNotEmpty({ message: 'El DNI es obligatorio' })
    @IsNumber({}, { message: 'El DNI debe ser un número' })
    @Min(1000000, { message: 'DNI inválido' })
    @Max(99999999, { message: 'DNI inválido' })
    dni: number;

    @IsNotEmpty({ message: 'El nombre y apellido es obligatorio' })
    @IsString({ message: 'El nombre y apellido debe ser texto' })
    @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
    @MaxLength(255, { message: 'El nombre no puede exceder 255 caracteres' })
    nombreApellido: string;

    @IsOptional()
    @IsString({ message: 'El teléfono debe ser texto' })
    @MaxLength(50, { message: 'El teléfono no puede exceder 50 caracteres' })
    telefono?: string;
}
