import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignRoleDto {
    @IsNotEmpty({ message: 'El ID del rol es requerido' })
    @IsUUID('4', { message: 'El ID del rol debe ser un UUID válido' })
    idrol: string;
}
