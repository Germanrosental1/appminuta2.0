import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignPermissionDto {
    @IsNotEmpty({ message: 'El ID del permiso es requerido' })
    @IsUUID('4', { message: 'El ID del permiso debe ser un UUID válido' })
    idpermiso: string;
}
