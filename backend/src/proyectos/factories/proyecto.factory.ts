import { Injectable } from '@nestjs/common';
import { ProyectoDto } from '../dto/proyecto.dto';

/**
 * Source data for creating a ProyectoDto
 */
export interface ProyectoSource {
    id?: string;
    nombre: string;
    tabla_nombre?: string;
    descripcion?: string | null;
    direccion?: string | null;
    localidad?: string | null;
    provincia?: string | null;
    activo?: boolean | null;
    naturaleza?: string | null;
    created_at?: Date | null;
    updated_at?: Date | null;
}

/**
 * ProyectoFactory
 * Creates normalized ProyectoDto instances from various data sources
 * Implements the Factory Pattern for consistent entity creation
 */
@Injectable()
export class ProyectoFactory {
    /**
     * Create a ProyectoDto from a database entity
     */
    createFromDatabase(data: ProyectoSource): ProyectoDto {
        const dto = new ProyectoDto();
        dto.id = data.id || '';
        dto.nombre = data.nombre;
        dto.tabla_nombre = data.tabla_nombre || 'unidades';
        dto.descripcion = data.descripcion || undefined;
        dto.direccion = data.direccion || undefined;
        dto.localidad = data.localidad || undefined;
        dto.provincia = data.provincia || undefined;
        dto.activo = data.activo ?? true;
        dto.naturaleza = data.naturaleza || undefined;
        dto.created_at = data.created_at || undefined;
        dto.updated_at = data.updated_at || undefined;
        return dto;
    }

    /**
     * Create a ProyectoDto from a fallback/legacy source
     * Used when project data comes from non-standard sources
     */
    createFromFallback(nombre: string): ProyectoDto {
        const now = new Date();
        const dto = new ProyectoDto();
        dto.id = nombre; // Use nombre as pseudo-id
        dto.nombre = nombre;
        dto.tabla_nombre = 'unidades';
        dto.activo = true;
        dto.created_at = now;
        dto.updated_at = now;
        return dto;
    }

    /**
     * Create multiple ProyectoDtos from mixed sources
     */
    createMany(sources: ProyectoSource[]): ProyectoDto[] {
        return sources.map(source =>
            source.id
                ? this.createFromDatabase(source)
                : this.createFromFallback(source.nombre)
        );
    }

    /**
     * Create a ProyectoDto for API response
     * Removes null values and normalizes the structure
     */
    toResponse(data: ProyectoSource): ProyectoDto {
        return this.createFromDatabase(data);
    }

    /**
     * Create multiple ProyectoDtos for API response
     */
    toResponseMany(data: ProyectoSource[]): ProyectoDto[] {
        return data.map(item => this.toResponse(item));
    }
}
