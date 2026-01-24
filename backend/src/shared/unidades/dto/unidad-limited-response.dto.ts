/**
 * Response DTO limitado para viewerinmobiliariamv
 * Solo incluye información básica de la unidad, sin datos comerciales
 */
export class UnidadLimitedResponseDto {
    id: string;
    sectorid: string;
    edificiotorre: string | null;
    piso: string | null;
    nrounidad: string | null;
    tipo: string | null;
    etapa: string | null;
    m2totales: number;
    preciousd: number;
    estado: string;
    proyecto: string | null;
}

/**
 * Mapea una unidad completa a respuesta limitada
 */
export function mapToLimitedResponse(unit: any): UnidadLimitedResponseDto {
    return {
        id: unit.id,
        sectorid: unit.sectorid,
        edificiotorre: unit.edificios?.nombre || unit.edificiotorre || null,
        piso: unit.piso,
        nrounidad: unit.nrounidad,
        tipo: unit.tiposunidad?.nombre || unit.tipo || null,
        etapa: unit.etapas?.nombre || unit.etapa || null,
        m2totales: unit.unidadesmetricas?.m2totales || unit.m2totales || 0,
        preciousd: unit.detallesventa_detallesventa_unidad_idTounidades?.preciousd || unit.preciousd || 0,
        estado: unit.detallesventa_detallesventa_unidad_idTounidades?.estadocomercial?.nombreestado || unit.estado || 'Desconocido',
        proyecto: unit.edificios?.proyectos?.nombre || unit.proyecto || null,
    };
}
