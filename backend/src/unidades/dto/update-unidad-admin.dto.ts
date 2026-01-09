import { IsUUID, IsOptional } from 'class-validator';

/**
 * DTO para administradores (adminmv)
 * Solo pueden actualizar el estado de la unidad
 */
export class UpdateUnidadAdminDto {
    @IsUUID('4', { message: 'estado_id debe ser un UUID válido' })
    @IsOptional()
    estado_id?: string;
}
