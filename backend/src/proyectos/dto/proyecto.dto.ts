/**
 * Proyecto Response DTO
 * Normalized representation of a project
 */
export class ProyectoDto {
    id: string;
    nombre: string;
    tabla_nombre: string;
    descripcion?: string;
    direccion?: string;
    localidad?: string;
    provincia?: string;
    activo: boolean;
    naturaleza?: string;
    created_at?: Date;
    updated_at?: Date;
}
