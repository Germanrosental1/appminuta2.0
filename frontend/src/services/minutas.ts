import { apiFetch } from '../lib/api-client';
import { WizardData } from '@/types/wizard';
import { validateRequest, safeValidate, ValidationError } from '@/utils/validateRequest';
import {
  createMinutaSchema,
  updateMinutaSchema,
  minutaFilterSchema,
  type MinutaFilters,
  type EstadoMinuta
} from '@/schemas/minuta.schema';

export interface MinutaProvisoria {
  id?: string;
  proyecto: string;
  unidad_id: string;
  usuario_id: string;
  fecha_creacion: string;
  datos: WizardData;
  estado: 'pendiente' | 'revisada' | 'aprobada' | 'rechazada';
  comentarios?: string;
}

export interface MinutaDefinitiva {
  id: string;
  usuario_id: string;
  fecha_creacion: string;
  datos: any; // Incluye la información de la unidad
  datos_adicionales?: any; // Campo existente en la tabla
  datos_mapa_ventas?: any;
  estado: string;
  comentarios?: string;
  url_documento?: string;
  created_at: string;
  updated_at: string;
  proyecto?: string;
  clienteInteresadoDni?: number; // DNI del cliente interesado
  // Relaciones agregadas por el backend
  users?: {
    email: string;
  };
  proyectos?: {
    nombre: string;
  };
}

export { ValidationError } from '@/utils/validateRequest';

// Guardar una minuta provisoria (CON VALIDACIÓN)
export async function guardarMinutaProvisoria(minuta: Omit<MinutaProvisoria, 'id' | 'fecha_creacion'>) {
  try {
    // 1. VALIDAR los datos de la minuta
    const validatedData = validateRequest(createMinutaSchema, minuta.datos);

    // 2. Extraer el proyecto del objeto datos validado
    const proyecto = validatedData.proyecto || 'Sin proyecto';

    // 3. Guardar en Backend
    const minutaParaGuardar = {
      ...minuta,
      datos: validatedData, // Usar datos validados
      proyecto,
      fecha_creacion: new Date().toISOString(),
    };

    return apiFetch<MinutaProvisoria>('/minutas/provisoria', {
      method: 'POST',
      body: JSON.stringify(minutaParaGuardar)
    });

  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw error;
  }
}

// Obtener una minuta provisoria por ID
export async function getMinutaProvisoriaById(id: string) {
  return apiFetch<MinutaProvisoria>(`/minutas/provisoria/${id}`);
}

// Actualizar el estado de una minuta provisoria
export async function actualizarEstadoMinutaProvisoria(
  id: string,
  estado: 'revisada' | 'aprobada' | 'rechazada',
  comentarios?: string
) {
  return apiFetch<MinutaProvisoria>(`/minutas/provisoria/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      estado,
      comentarios: comentarios || undefined
    })
  });
}

// Helper: Validate user ID
function validateUsuarioId(usuarioId: string): void {
  if (!usuarioId || typeof usuarioId !== 'string') {
    throw new ValidationError('ID de usuario inválido', [
      { field: 'usuarioId', message: 'El ID de usuario es requerido y debe ser una cadena válida' }
    ]);
  }
}

// Helper: Build query parameters for minutas
function buildMinutasQueryParams(
  usuarioId: string,
  filters?: Partial<MinutaFilters>
): URLSearchParams {
  const params = new URLSearchParams({ usuario_id: usuarioId });

  if (!filters) return params;

  const validatedFilters = safeValidate(minutaFilterSchema.partial(), filters);
  if (!validatedFilters.success) return params;

  const f = validatedFilters.data;
  if (f.estado) params.append('estado', f.estado);
  if (f.proyecto) params.append('proyecto', f.proyecto);
  if (f.fechaDesde) params.append('fechaDesde', f.fechaDesde);
  if (f.fechaHasta) params.append('fechaHasta', f.fechaHasta);

  return params;
}

// Obtener minutas definitivas por usuario comercial (CON VALIDACIÓN DE FILTROS)
export async function getMinutasDefinitivasByUsuario(usuarioId: string, filters?: Partial<MinutaFilters>) {
  try {
    validateUsuarioId(usuarioId);
    const params = buildMinutasQueryParams(usuarioId, filters);
    const response = await apiFetch<{ data: MinutaDefinitiva[] }>(`/minutas?${params.toString()}`);
    return response.data;
  } catch (error) {
    if (error instanceof ValidationError) {
      // Validation error logged silently
    }
    throw error;
  }
}

// Obtener todas las minutas definitivas (para administración)
export async function getAllMinutasDefinitivasForAdmin() {
  const response = await apiFetch<{ data: MinutaDefinitiva[] }>('/minutas');
  return response.data;
}

// Obtener todas las minutas provisorias (para administración)
export async function getAllMinutasProvisoriasForAdmin() {
  const response = await apiFetch<{ data: MinutaProvisoria[] }>('/minutas/provisoria');
  return response.data;
}

// Obtener una minuta definitiva por ID
export async function getMinutaDefinitivaById(id: string) {
  return apiFetch<MinutaDefinitiva>(`/minutas/${id}`);
}

// Actualizar el estado de una minuta definitiva (CON VALIDACIÓN)
export async function actualizarEstadoMinutaDefinitiva(
  id: string,
  estado: EstadoMinuta,
  comentarios?: string
) {
  try {
    // 1. VALIDAR el ID (UUID)
    if (!id || typeof id !== 'string') {
      throw new ValidationError('ID inválido', [
        { field: 'id', message: 'El ID es requerido y debe ser una cadena válida' }
      ]);
    }

    // 2. VALIDAR el estado
    const validatedUpdate = validateRequest(
      updateMinutaSchema.pick({ estado: true }),
      { id, estado }
    );

    // 3. Actualizar en Backend
    return apiFetch<MinutaDefinitiva>(`/minutas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        estado: validatedUpdate.estado,
        comentarios: comentarios || null
      })
    });

  } catch (error) {
    throw error;
  }
}

// Actualizar los datos de una minuta definitiva (CON VALIDACIÓN)
export async function actualizarDatosMinutaDefinitiva(id: string, datosActualizados: any) {

  try {
    // 1. VALIDAR el ID
    if (!id || typeof id !== 'string') {
      throw new ValidationError('ID inválido', [
        { field: 'id', message: 'El ID es requerido y debe ser una cadena válida' }
      ]);
    }

    // 2. Enviar directamente los datos actualizados al backend
    // El objeto datosActualizados ya contiene { datos: ... }
    return apiFetch<MinutaDefinitiva>(`/minutas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(datosActualizados)
    });

  } catch (error) {
    throw error;
  }
}

// Obtener datos del mapa de ventas para una unidad específica
export async function getDatosMapaVentasByUnidadId(unidadId: string) {
  try {
    // 1. Siempre intentar buscar por ID directo primero (UUID o numérico)
    // Esto asume que el backend tiene un endpoint GET /unidades/:id que maneja esto
    try {
      const dataById = await apiFetch<any>(`/unidades/${unidadId}`);
      if (dataById) return dataById;
    } catch {
      // Expected: 404/500 - continue with other search strategies
    }

    // 2. Intenta buscar por nrounidad
    const dataByNro = await apiFetch<any[]>(`/unidades?nrounidad=${encodeURIComponent(unidadId)}`);
    if (dataByNro && dataByNro.length > 0) return dataByNro[0];

    // 3. Intenta buscar por sectorid
    const dataBySector = await apiFetch<any[]>(`/unidades?sectorid=${encodeURIComponent(unidadId)}`);
    if (dataBySector && dataBySector.length > 0) return dataBySector[0];

    return null;
  } catch {
    return null;
  }
}

// ⚡ OPTIMIZACIÓN: Batch endpoint para obtener múltiples unidades en 1 request
export async function getDatosMapaVentasBatch(unidadIds: string[]) {
  if (!unidadIds.length) return [];

  try {
    // Filtrar IDs válidos (UUIDs)
    const validIds = unidadIds.filter(id => id && isValidUUID(id));
    if (!validIds.length) return [];

    const data = await apiFetch<any[]>(`/unidades/batch?ids=${validIds.join(',')}`);
    return data || [];
  } catch (error) {
    return [];
  }
}

// Guardar directamente una minuta definitiva (VALIDACIÓN DESHABILITADA TEMPORALMENTE)
export async function guardarMinutaDefinitiva(minuta: Omit<MinutaDefinitiva, 'id' | 'fecha_creacion' | 'created_at' | 'updated_at'>) {
  try {
    // Obtener unidad_id de la primera unidad seleccionada
    const primeraUnidad = minuta.datos?.unidades?.[0];
    const unidadId = primeraUnidad?.id || minuta.datos?.unidad_id || null;

    let proyectoId = null;
    if (minuta.datos?.proyecto_id && isValidUUID(minuta.datos.proyecto_id)) {
      proyectoId = minuta.datos.proyecto_id;
    }

    // ⚡ OPTIMIZACIÓN: Obtener datos del mapa de ventas con batch (1 request vs N requests)
    let datosMapaVentas: any[] = [];

    try {
      const unidades = minuta.datos?.unidades || [];

      if (unidades.length > 0) {
        // ⚡ BATCH: Extraer todos los IDs y hacer UNA sola request
        const unidadIds = unidades.map((u: any) => u.id).filter(Boolean);

        const batchData = await getDatosMapaVentasBatch(unidadIds);

        // Mapear resultados con metadatos adicionales
        datosMapaVentas = batchData.map((data: any) => {
          const unidadOriginal = unidades.find((u: any) => u.id === data.id);
          return {
            ...data,
            _unidad_id: data.id,
            _unidad_descripcion: unidadOriginal?.descripcion || '',
          };
        });

      } else {
        // Caso: Sin array de unidades (legacy o single unit directa)
        const unidadCodigo = unidadId || minuta.datos?.unidadCodigo || minuta.datos?.unidad?.codigo || '';

        if (unidadCodigo) {
          const data = await getDatosMapaVentasByUnidadId(unidadCodigo);
          if (data) {
            datosMapaVentas = [{ ...data, _unidad_id: unidadCodigo, _unidad_descripcion: 'Unidad única' }];
          }
        }
      }
    } catch (e) {
      // Silent fail - datos del mapa de ventas no disponibles
    }

    // Preparar minuta para guardar - proyecto puede ser null
    const minutaParaGuardar = {
      proyecto: proyectoId, // UUID o null
      datos: minuta.datos, // El nombre del proyecto está en datos.proyecto
      datos_mapa_ventas: datosMapaVentas,
      estado: minuta.estado || 'pendiente',
      comentarios: minuta.comentarios || null,
      clienteInteresadoDni: minuta.clienteInteresadoDni || null,
    };

    // Guardar en Backend
    const response = await apiFetch<MinutaDefinitiva>('/minutas', {
      method: 'POST',
      body: JSON.stringify(minutaParaGuardar)
    });

    return response;

  } catch (error: any) {
    throw error;
  }
}

// Helper para validar UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Conformar una minuta provisoria con el mapa de ventas
export async function conformarMinutaConMapaVentas(minutaId: string, datosConformacion: any) {
  return apiFetch<MinutaProvisoria>(`/minutas/provisoria/${minutaId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      datos_conformacion: datosConformacion,
      estado: 'revisada',
    })
  });
}

// Obtener minutas con filtros avanzados y paginación
export async function getMinutasWithFilters(filters: Partial<MinutaFilters>) {
  try {
    const params = new URLSearchParams();
    if (filters.proyecto) params.append('proyecto', filters.proyecto);
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.usuario_id) params.append('usuario_id', filters.usuario_id);

    // Pagination
    params.append('page', (filters.page || 1).toString());
    params.append('limit', (filters.limit || 20).toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await apiFetch<{
      data: MinutaDefinitiva[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/minutas?${params.toString()}`);

    return {
      data: response.data,
      total: response.total,
      page: response.page,
      limit: response.limit,
      totalPages: response.totalPages,
    };
  } catch (error) {
    throw error;
  }
}

// Validar datos de minuta sin guardar
export function validateMinutaData(data: unknown, partial: boolean = false) {
  const schema = partial ? updateMinutaSchema.partial() : createMinutaSchema;
  return safeValidate(schema, data);
}

// Eliminar una minuta
export async function deleteMinuta(id: string) {
  await apiFetch(`/minutas/${id}`, { method: 'DELETE' });
  return { success: true };
}

// Obtener estadísticas de minutas por usuario
export async function getMinutasStats(usuarioId?: string) {
  try {
    const data = await getMinutasDefinitivasByUsuario(usuarioId || '');

    // Calcular estadísticas
    const stats = {
      total: data.length,
      pendientes: data.filter(m => m.estado === 'pendiente').length,
      aprobadas: data.filter(m => m.estado === 'aprobada').length,
      firmadas: data.filter(m => m.estado === 'firmada').length,
      canceladas: data.filter(m => m.estado === 'cancelada').length,
      rechazadas: 0, // 'rechazada' not in MinutaDefinitiva type
      porEstado: {} as Record<string, number>,
    };

    // Agrupar por estado
    data.forEach(minuta => {
      stats.porEstado[minuta.estado] = (stats.porEstado[minuta.estado] || 0) + 1;
    });

    return stats;
  } catch (error) {
    return { total: 0, porEstado: {} };
  }
}

// Obtener minutas definitivas (Legacy alias)
export async function getMinutasDefinitivas() {
  const response = await apiFetch<{ data: MinutaDefinitiva[] }>('/minutas');
  return response.data;
}
