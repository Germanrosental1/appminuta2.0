import { apiFetch } from '../lib/api-client';
import { getProyectosActivos } from './proyectos';

// Interfaz para la nueva estructura de unidades normalizadas
// Interfaz para la nueva estructura de unidades normalizadas (PascalCase from Backend)
export interface UnidadTabla {
  Id: string;
  SectorId: string;
  EdificioId?: string;
  EtapaId?: string;
  TipoUnidadId?: string;
  Piso?: string;
  NroUnidad?: string;
  Dormitorio?: string;
  Manzana?: string;
  Destino?: string;
  Frente?: string;

  // Relaciones
  Edificios?: {
    Id: string;
    NombreEdificio: string;
    Proyectos?: {
      Id: string;
      Nombre: string;
    };
  };
  Etapas?: {
    Id: string;
    Nombre: string;
  };
  TiposUnidad?: {
    Id: string;
    Nombre: string;
  };
  DetallesVenta_DetallesVenta_UnidadIdToUnidades?: {
    PrecioUsd?: number;
    UsdM2?: number;
    EstadoComercial?: {
      Id: string;
      NombreEstado: string;
    };
  };
  UnidadesMetricas?: {
    M2Exclusivo?: number;
    M2Total?: number;
    M2Cubierto?: number;
  };
}

// Alias para mantener compatibilidad con código existente
export type UnidadMapaVentas = UnidadTabla;
export type UnidadArboria = UnidadTabla;

// Interfaz simplificada para mostrar en listas
export interface UnidadResumen {
  id: string; // UUID string from database
  proyecto: string;
  sector?: string;
  etapa?: string;
  tipo?: string;
  numero?: string;
  edificio?: string;
  piso?: string;
  dormitorios?: string;
  metrosTotales?: number;
  precioUSD?: number;
  estado?: string;
  descripcion: string; // Campo calculado para mostrar en UI
}

/**
 * Obtener todos los proyectos disponibles en la tabla 'tablas'
 */
export async function getProyectosDisponibles(): Promise<string[]> {
  try {
    const proyectos = await getProyectosActivos();
    return proyectos.map(p => p.Nombre);
  } catch (error) {
    return ['Arboria'];
  }
}

/**
 * Obtener todas las unidades disponibles por estado
 */
export async function getUnidadesPorEstado(estado: string = 'disponible'): Promise<UnidadResumen[]> {
  try {
    const data = await apiFetch<UnidadTabla[]>(`/unidades?estado=${encodeURIComponent(estado)}`);
    return data.map(unidad => formatearUnidadResumen(unidad));
  } catch (error) {
    return [];
  }
}

/**
 * Obtener todas las unidades de un proyecto
 */
export async function getUnidadesPorProyecto(proyecto: string): Promise<UnidadResumen[]> {
  try {
    const data = await apiFetch<UnidadTabla[]>(`/unidades?proyecto=${encodeURIComponent(proyecto)}`);
    return data.map(unidad => formatearUnidadResumen(unidad));
  } catch (error) {
    return [];
  }
}

/**
 * Obtener una unidad específica por ID
 */
export async function getUnidadById(id: number): Promise<UnidadMapaVentas | null> {
  return await apiFetch<UnidadMapaVentas>(`/unidades/${id}`);
}

/**
 * Función auxiliar para formatear una unidad en formato resumido
 */
function formatearUnidadResumen(unidad: UnidadTabla): UnidadResumen {
  // Crear descripción para mostrar en UI
  let descripcion = '';

  if (unidad.SectorId) descripcion += `${unidad.SectorId} - `;
  if (unidad.Edificios?.NombreEdificio) descripcion += `${unidad.Edificios.NombreEdificio} - `;
  if (unidad.Piso) descripcion += `Piso ${unidad.Piso} - `;
  if (unidad.NroUnidad) descripcion += `Unidad ${unidad.NroUnidad}`;

  // Si no hay suficientes datos, usar ID
  if (!descripcion || descripcion.endsWith(' - ')) {
    descripcion += `ID: ${unidad.Id}`;
  }

  // Get price from nested structure
  const precio = unidad.DetallesVenta_DetallesVenta_UnidadIdToUnidades?.PrecioUsd ?? 0;

  // Get estado from nested structure
  const estado = unidad.DetallesVenta_DetallesVenta_UnidadIdToUnidades?.EstadoComercial?.NombreEstado ?? 'Desconocido';

  // Get proyecto from nested structure
  const proyecto = unidad.Edificios?.Proyectos?.Nombre ?? '';

  // Get etapa from nested structure
  const etapa = unidad.Etapas?.Nombre ?? '';

  // Get tipo from nested structure
  const tipo = unidad.TiposUnidad?.Nombre ?? '';

  return {
    id: unidad.Id,
    proyecto,
    sector: unidad.SectorId,
    etapa,
    tipo,
    numero: unidad.NroUnidad,
    edificio: unidad.Edificios?.NombreEdificio,
    piso: unidad.Piso,
    dormitorios: unidad.Dormitorio || '',
    metrosTotales: unidad.UnidadesMetricas?.M2Total,
    precioUSD: Number(precio),
    estado,
    descripcion: descripcion.trim()
  };
}

/**
 * Obtener todas las naturalezas de proyecto disponibles
 */
export async function getNaturalezasProyecto(): Promise<string[]> {
  try {
    const result = await apiFetch<string[]>('/unidades/metadata/naturalezas');
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Obtener todos los tipos de unidad disponibles (Departamento, Cochera, etc.)
 */
export async function getTiposDisponibles(): Promise<string[]> {
  try {
    const result = await apiFetch<string[]>('/unidades/metadata/tipos-disponibles');
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Obtener proyectos que tienen un tipo específico de unidad
 */
export async function getProyectosPorTipo(tipo: string): Promise<string[]> {
  try {
    const result = await apiFetch<string[]>(
      `/unidades/metadata/proyectos?tipo=${encodeURIComponent(tipo)}`
    );
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Obtener todas las etapas disponibles para un proyecto específico
 */
export async function getEtapasPorProyecto(nombreProyecto: string): Promise<string[]> {
  try {
    const data = await apiFetch<string[]>(`/unidades/metadata/etapas?proyecto=${encodeURIComponent(nombreProyecto)}`);
    return data.length > 0 ? data : ['Ninguna'];
  } catch (error) {
    return ['Ninguna'];
  }
}

/**
 * Obtener todos los proyectos disponibles para una naturaleza específica
 */
export async function getProyectosPorNaturaleza(naturaleza: string): Promise<string[]> {
  try {
    const proyectos = await getProyectosActivos();
    return proyectos.map(p => p.Nombre);
  } catch (error) {
    return [];
  }
}

/**
 * Obtener todos los tipos disponibles para un proyecto y etapa específicos
 */
export async function getTiposPorProyecto(nombreProyecto: string, etapa?: string): Promise<string[]> {
  try {
    let url = `/unidades/metadata/tipos?proyecto=${encodeURIComponent(nombreProyecto)}`;
    if (etapa && etapa !== 'Ninguna') {
      url += `&etapa=${encodeURIComponent(etapa)}`;
    }
    const data = await apiFetch<string[]>(url);
    return data.length > 0 ? data : [];
  } catch (error) {
    return [];
  }
}

/**
 * Backward compatibility: getTiposPorProyectoYEtapa
 */
export async function getTiposPorProyectoYEtapa(nombreProyecto: string, etapa: string): Promise<string[]> {
  return getTiposPorProyecto(nombreProyecto, etapa);
}


/**
 * Obtener todos los sectores disponibles para un proyecto, etapa y tipo específicos
 */
export async function getSectoresPorProyectoEtapaYTipo(nombreProyecto: string, etapa: string, tipo: string): Promise<string[]> {
  try {
    const params = new URLSearchParams({ proyecto: nombreProyecto });
    if (etapa && etapa !== 'Ninguna') params.append('etapa', etapa);
    if (tipo) params.append('tipo', tipo);
    return apiFetch<string[]>(`/unidades/metadata/sectores?${params.toString()}`);
  } catch (error) {
    return [];
  }
}

/**
 * Obtener todos los sectores disponibles para un proyecto y tipo específicos
 */
export async function getSectoresPorProyectoYTipo(nombreProyecto: string, tipo: string): Promise<string[]> {
  return getSectoresPorProyectoEtapaYTipo(nombreProyecto, 'Ninguna', tipo);
}

/**
 * Obtener todos los sectores disponibles para un proyecto, etapa y tipo específicos
 */
export async function getSectoresProyecto(nombreProyecto: string, etapa?: string, tipo?: string): Promise<string[]> {
  try {
    let url = `/unidades/metadata/sectores?proyecto=${encodeURIComponent(nombreProyecto)}`;
    if (etapa && etapa !== 'Ninguna') {
      url += `&etapa=${encodeURIComponent(etapa)}`;
    }
    if (tipo) {
      url += `&tipo=${encodeURIComponent(tipo)}`;
    }
    const data = await apiFetch<string[]>(url);
    return data.length > 0 ? data : [];
  } catch (error) {
    return [];
  }
}

/**
 * Mantener la función anterior por compatibilidad
 */
export async function getSectoresArboria() {
  return getSectoresProyecto('Arboria');
}

/**
 * Obtener unidades por etapa, tipo y sector para un proyecto específico
 */
export async function getUnidadesPorEtapaTipoYSector(nombreProyecto: string, etapa: string, tipo: string, sector: string): Promise<UnidadResumen[]> {
  try {
    const params = new URLSearchParams({
      proyecto: nombreProyecto,
      tipo: tipo,
    });
    if (etapa && etapa !== 'Ninguna') params.append('etapa', etapa);
    if (sector) params.append('sectorid', sector);

    const data = await apiFetch<UnidadTabla[]>(`/unidades?${params.toString()}`);
    return data.map(unidad => formatearUnidadResumen(unidad));
  } catch (error) {
    console.error('Error fetching unidades:', error);
    return [];
  }
}

/**
 * Obtener unidades por tipo y sector para un proyecto específico
 */
export async function getUnidadesPorTipoYSector(nombreProyecto: string, tipo: string, sector: string): Promise<UnidadResumen[]> {
  try {
    const params = new URLSearchParams({
      proyecto: nombreProyecto,
      tipo: tipo,
      sectorid: sector
    });
    const data = await apiFetch<UnidadTabla[]>(`/unidades?${params.toString()}`);
    return data.map(unidad => formatearUnidadResumen(unidad));
  } catch (error) {
    return [];
  }
}

/**
 * Obtener unidades por sector para un proyecto específico
 */
export async function getUnidadesPorSector(nombreProyecto: string, sector: string): Promise<UnidadResumen[]> {
  try {
    const params = new URLSearchParams({
      proyecto: nombreProyecto,
      sectorid: sector
    });
    const data = await apiFetch<UnidadTabla[]>(`/unidades?${params.toString()}`);
    return data.map(unidad => formatearUnidadResumen(unidad));
  } catch (error) {
    return [];
  }
}

/**
 * Mantener la función anterior por compatibilidad
 */
export async function getUnidadesArboriaPorSector(sector: string): Promise<UnidadResumen[]> {
  return getUnidadesPorSector('Arboria', sector);
}

/**
 * Obtener una unidad específica por ID y proyecto
 */
export async function getUnidadMapaVentasById(id: number, nombreProyecto?: string): Promise<UnidadMapaVentas | null> {
  // Ignoring nombreProyecto filter as ID is unique
  return getUnidadById(id);
}

/**
 * Mantener la función anterior por compatibilidad
 */
export async function getUnidadArboriaById(id: number): Promise<UnidadMapaVentas | null> {
  return getUnidadMapaVentasById(id, 'Arboria');
}
