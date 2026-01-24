import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
    @IsNotEmpty({ message: 'El nombre del rol es requerido' })
    @IsString({ message: 'El nombre debe ser un texto' })
    @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
    nombre: string;
}
