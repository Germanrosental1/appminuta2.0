import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignUserToProjectDto {
    @IsNotEmpty({ message: 'El ID del proyecto es requerido' })
    @IsUUID('4', { message: 'El ID del proyecto debe ser un UUID válido' })
    idproyecto: string;

    @IsNotEmpty({ message: 'El ID del rol es requerido' })
    @IsUUID('4', { message: 'El ID del rol debe ser un UUID válido' })
    idrol: string;
}
