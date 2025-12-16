import { IRepository, PaginatedResult } from '../../common/repositories/base.repository';
import { CreateMinutaDto } from '../dto/create-minuta.dto';
import { UpdateMinutaDto } from '../dto/update-minuta.dto';
import { FindAllMinutasQueryDto } from '../dto/find-all-minutas-query.dto';

/**
 * Minuta entity type (subset of Prisma minutas_definitivas)
 */
export interface MinutaEntity {
    id: string;
    usuario_id: string;
    fecha_creacion: Date | null;
    datos: unknown;
    datos_adicionales?: unknown;
    estado: string;
    url_documento?: string | null;
    created_at?: Date | null;
    updated_at?: Date | null;
    comentarios?: string | null;
    datos_mapa_ventas?: unknown;
    proyecto?: string | null;
    version: number;
}

/**
 * Minuta with relations included
 */
export interface MinutaWithRelations extends MinutaEntity {
    users?: {
        email: string | null;
    };
    proyectos?: {
        nombre: string;
    } | null;
}

/**
 * Minutas Repository Interface
 * Extends base repository with minuta-specific operations
 */
export interface IMinutasRepository extends IRepository<MinutaEntity, CreateMinutaDto, UpdateMinutaDto> {
    /**
     * Find all minutas with pagination and filtering
     */
    findAllPaginated(
        query: FindAllMinutasQueryDto,
        userId: string,
        userPermissions: string[],
        userProjectIds: string[]
    ): Promise<PaginatedResult<MinutaWithRelations>>;

    /**
     * Find single minuta with relations
     */
    findByIdWithRelations(id: string): Promise<MinutaWithRelations | null>;

    /**
     * Update minuta with optimistic locking
     */
    updateWithVersion(
        id: string,
        data: UpdateMinutaDto,
        expectedVersion: number
    ): Promise<{ count: number }>;

    /**
     * Find minutas by user
     */
    findByUsuario(usuarioId: string): Promise<MinutaEntity[]>;

    /**
     * Find minutas by project
     */
    findByProyecto(proyectoId: string): Promise<MinutaEntity[]>;
}
