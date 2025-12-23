import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePermisoDto {
    @IsNotEmpty({ message: 'El nombre del permiso es requerido' })
    @IsString({ message: 'El nombre debe ser un texto' })
    @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
    nombre: string;

    @IsOptional()
    @IsString({ message: 'La descripción debe ser un texto' })
    @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
    descripcion?: string;
}
