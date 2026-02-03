import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api-wrapper-client';
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
  Id?: string;
  Proyecto: string;
  UnidadId: string;
  UsuarioId: string;
  FechaCreacion: string;
  Dato: WizardData;
  Estado: 'pendiente' | 'revisada' | 'aprobada' | 'rechazada';
  Comentario?: string;
}

export interface MinutaDefinitiva {
  Id: string;
  Numero: string;
  Estado: string;
  Tipo: string;
  ProyectoId: string;
  ProyectoNombre: string;
  UnidadId?: string | null;
  UnidadIdentificador?: string | null;
  ClienteRut: string;
  ClienteNombre: string;
  PrecioTotal: number;
  CreadoPor: string;
  CreatedAt: string;
  UpdatedAt: string;
  Comentario?: string | null;
  ClienteInteresadoDni?: number; // Para entrada o compatibilidad
  // Campos extra opcionales para compatibilidad temporal si son necesarios en UI
  Dato?: any;
}

export { ValidationError } from '@/utils/validateRequest';

// Guardar una minuta provisoria (CON VALIDACIÓN)
export async function guardarMinutaProvisoria(minuta: Omit<MinutaProvisoria, 'id' | 'fecha_creacion'>) {
  try {
    // 1. VALIDAR los datos de la minuta
    const validatedData = validateRequest(createMinutaSchema, minuta.Dato);

    // 2. Extraer el proyecto del objeto datos validado (se usa validatedData para asegurar integridad)
    // const proyecto = validatedData.proyecto || 'Sin proyecto';

    // 3. Guardar en Backend
    const minutaParaGuardar = {
      proyecto: minuta.Proyecto,
      unidad_id: minuta.UnidadId,
      usuario_id: minuta.UsuarioId,
      estado: minuta.Estado,
      comentarios: minuta.Comentario,
      datos: validatedData, // Usar datos validados
      fecha_creacion: new Date().toISOString(),
    };

    return apiPost<MinutaProvisoria>('/minutas/provisoria', minutaParaGuardar);

  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw error;
  }
}

// Obtener una minuta provisoria por ID
export async function getMinutaProvisoriaById(id: string) {
  return apiGet<MinutaProvisoria>(`/minutas/provisoria/${id}`);
}

// Actualizar el estado de una minuta provisoria
export async function actualizarEstadoMinutaProvisoria(
  id: string,
  estado: 'revisada' | 'aprobada' | 'rechazada',
  comentarios?: string
) {
  return apiPatch<MinutaProvisoria>(`/minutas/provisoria/${id}`, {
    estado,
    comentarios: comentarios || undefined
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
    const response = await apiGet<{ data: MinutaDefinitiva[] }>(`/minutas?${params.toString()}`);
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
  const response = await apiGet<{ data: MinutaDefinitiva[] }>('/minutas');
  return response.data;
}

// Obtener todas las minutas provisorias (para administración)
export async function getAllMinutasProvisoriasForAdmin() {
  const response = await apiGet<{ data: MinutaProvisoria[] }>('/minutas/provisoria');
  return response.data;
}

// Obtener una minuta definitiva por ID
export async function getMinutaDefinitivaById(id: string) {
  return apiGet<MinutaDefinitiva>(`/minutas/${id}`);
}

// Actualizar el estado de una minuta definitiva (CON VALIDACIÓN)
export async function actualizarEstadoMinutaDefinitiva(
  id: string,
  estado: EstadoMinuta,
  comentarios?: string
) {
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
  return apiPatch<MinutaDefinitiva>(`/minutas/${id}`, {
    estado: validatedUpdate.estado,
    comentarios: comentarios || null
  });
}

// Actualizar los datos de una minuta definitiva (CON VALIDACIÓN)
export async function actualizarDatosMinutaDefinitiva(id: string, datosActualizados: any) {
  // 1. VALIDAR el ID
  if (!id || typeof id !== 'string') {
    throw new ValidationError('ID inválido', [
      { field: 'id', message: 'El ID es requerido y debe ser una cadena válida' }
    ]);
  }

  // 2. Enviar directamente los datos actualizados al backend
  // El objeto datosActualizados ya contiene { datos: ... }
  return apiPatch<MinutaDefinitiva>(`/minutas/${id}`, datosActualizados);
}

// Obtener datos del mapa de ventas para una unidad específica
export async function getDatosMapaVentasByUnidadId(unidadId: string) {
  // 1. Siempre intentar buscar por ID directo primero (UUID o numérico)
  // Esto asume que el backend tiene un endpoint GET /unidades/:id que maneja esto
  try {
    const dataById = await apiGet<any>(`/unidades/${unidadId}`);
    if (dataById) return dataById;
  } catch (e) {
    // Ignorar error 404/500 y continuar con siguiente estrategia
    console.warn('Error buscando unidad por ID directo:', e);
  }

  // 2. Intenta buscar por nrounidad
  const dataByNro = await apiGet<any[]>(`/unidades?nrounidad=${encodeURIComponent(unidadId)}`);
  if (dataByNro && dataByNro.length > 0) return dataByNro[0];

  // 3. Intenta buscar por sectorid
  const dataBySector = await apiGet<any[]>(`/unidades?sectorid=${encodeURIComponent(unidadId)}`);
  if (dataBySector && dataBySector.length > 0) return dataBySector[0];

  return null;
}

// ⚡ OPTIMIZACIÓN: Batch endpoint para obtener múltiples unidades en 1 request
export async function getDatosMapaVentasBatch(unidadIds: string[]) {
  if (!unidadIds.length) return [];

  try {
    // Filtrar IDs válidos (UUIDs)
    const validIds = unidadIds.filter(id => id && isValidUUID(id));
    if (!validIds.length) return [];

    const data = await apiGet<any[]>(`/unidades/batch?ids=${validIds.join(',')}`);
    return data || [];
  } catch (error) {
    console.error('Error fetching batch unidades:', error);
    return [];
  }
}

// Guardar directamente una minuta definitiva (VALIDACIÓN DESHABILITADA TEMPORALMENTE)
export async function guardarMinutaDefinitiva(minuta: Omit<MinutaDefinitiva, 'Id' | 'FechaCreacion' | 'CreatedAt' | 'UpdatedAt'>) {
  try {
    // Obtener unidad_id de la primera unidad seleccionada
    const primeraUnidad = minuta.Dato?.unidades?.[0];
    const unidadId = primeraUnidad?.id || minuta.Dato?.unidad_id || null;

    let proyectoId = null;
    if (minuta.Dato?.proyecto_id && isValidUUID(minuta.Dato.proyecto_id)) {
      proyectoId = minuta.Dato.proyecto_id;
    }

    // ⚡ OPTIMIZACIÓN: Obtener datos del mapa de ventas con batch (1 request vs N requests)
    let datosMapaVentas: any[] = [];

    try {
      const unidades = minuta.Dato?.unidades || [];

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
        const unidadCodigo = unidadId || minuta.Dato?.unidadCodigo || minuta.Dato?.unidad?.codigo || '';

        if (unidadCodigo) {
          const data = await getDatosMapaVentasByUnidadId(unidadCodigo);
          if (data) {
            datosMapaVentas = [{ ...data, _unidad_id: unidadCodigo, _unidad_descripcion: 'Unidad única' }];
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching minutas (mapa de ventas):', e);
      // Silent fail - datos del mapa de ventas no disponibles
    }

    // Preparar minuta para guardar - proyecto puede ser null
    const minutaParaGuardar = {
      proyecto: proyectoId, // UUID o null
      datos: minuta.Dato, // El nombre del proyecto está en datos.proyecto
      datos_mapa_ventas: datosMapaVentas,
      estado: minuta.Estado || 'pendiente',
      comentarios: minuta.Comentario || null,
      clienteInteresadoDni: minuta.ClienteInteresadoDni || null,
    };

    // Guardar en Backend
    const response = await apiPost<MinutaDefinitiva>('/minutas', minutaParaGuardar);

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
  return apiPatch<MinutaProvisoria>(`/minutas/provisoria/${minutaId}`, {
    datos_conformacion: datosConformacion,
    estado: 'revisada',
  });
}

// Obtener minutas con filtros avanzados y paginación
export async function getMinutasWithFilters(filters: Partial<MinutaFilters>) {
  const params = new URLSearchParams();
  if (filters.proyecto) params.append('proyecto', filters.proyecto);
  if (filters.estado) params.append('estado', filters.estado);
  if (filters.UsuarioId) params.append('usuario_id', filters.UsuarioId);

  // Pagination
  params.append('page', (filters.page || 1).toString());
  params.append('limit', (filters.limit || 20).toString());
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  const response = await apiGet<{
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
}


// Validar datos de minuta sin guardar
export function validateMinutaData(data: unknown, partial: boolean = false) {
  const schema = partial ? updateMinutaSchema.partial() : createMinutaSchema;
  return safeValidate(schema, data);
}

// Eliminar una minuta
export async function deleteMinuta(id: string) {
  await apiDelete(`/minutas/${id}`);
  return { success: true };
}

// Obtener estadísticas de minutas por usuario
export async function getMinutasStats(usuarioId?: string) {
  try {
    const data = await getMinutasDefinitivasByUsuario(usuarioId || '');

    // Calcular estadísticas
    const stats = {
      total: data.length,
      pendientes: data.filter(m => m.Estado === 'pendiente').length,
      aprobadas: data.filter(m => m.Estado === 'aprobada').length,
      firmadas: data.filter(m => m.Estado === 'firmada').length,
      canceladas: data.filter(m => m.Estado === 'cancelada').length,
      rechazadas: 0, // 'rechazada' not in MinutaDefinitiva type
      porEstado: {} as Record<string, number>,
    };

    // Agrupar por estado
    data.forEach(minuta => {
      stats.porEstado[minuta.Estado] = (stats.porEstado[minuta.Estado] || 0) + 1;
    });

    return stats;
  } catch (error) {
    return { total: 0, porEstado: {} };
  }
}

// Obtener minutas definitivas (Legacy alias)
export async function getMinutasDefinitivas() {
  const response = await apiGet<{ data: MinutaDefinitiva[] }>('/minutas');
  return response.data;
}


