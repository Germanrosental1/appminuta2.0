import { supabase } from '../lib/supabase';
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
  id?: string;
  proyecto: string;
  usuario_id: string;
  fecha_creacion?: string;
  datos: any; // Incluye la información de la unidad
  datos_adicionales?: any; // Campo existente en la tabla
  datos_mapa_ventas?: any;
  estado: 'pendiente' | 'aprobada' | 'firmada' | 'cancelada';
  comentarios?: string;
  url_documento?: string;
  created_at?: string;
  updated_at?: string;
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
      console.error('Error de validación al guardar minuta provisoria:', error.errors);
      throw error;
    }
    console.error('Error al guardar minuta provisoria:', error);
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

// Obtener minutas definitivas por usuario comercial (CON VALIDACIÓN DE FILTROS)
export async function getMinutasDefinitivasByUsuario(usuarioId: string, filters?: Partial<MinutaFilters>) {
  try {
    // 1. VALIDAR el UUID del usuario
    if (!usuarioId || typeof usuarioId !== 'string') {
      throw new ValidationError('ID de usuario inválido', [
        { field: 'usuarioId', message: 'El ID de usuario es requerido y debe ser una cadena válida' }
      ]);
    }

    // 2. Construir query params
    const params = new URLSearchParams({ usuario_id: usuarioId });

    if (filters) {
      const validatedFilters = safeValidate(minutaFilterSchema.partial(), filters);
      if (validatedFilters.success) {
        const f = validatedFilters.data;
        if (f.estado) params.append('estado', f.estado);
        if (f.proyecto) params.append('proyecto', f.proyecto);
        if (f.fechaDesde) params.append('fechaDesde', f.fechaDesde);
        if (f.fechaHasta) params.append('fechaHasta', f.fechaHasta);
      }
    }

    const response = await apiFetch<{ data: MinutaDefinitiva[] }>(`/minutas?${params.toString()}`);
    return response.data;

  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Error de validación al obtener minutas:', error.errors);
    }
    throw error;
  }
}

// Obtener todas las minutas definitivas (para administración)
export async function getAllMinutasDefinitivasForAdmin() {
  const response = await apiFetch<{ data: MinutaDefinitiva[] }>('/minutas');
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
    if (error instanceof ValidationError) {
      console.error('Error de validación al actualizar estado:', error.errors);
    }
    throw error;
  }
}

// Actualizar los datos de una minuta definitiva (CON VALIDACIÓN)
export async function actualizarDatosMinutaDefinitiva(id: string, datosActualizados: any) {
  console.log('Actualizando datos de minuta definitiva:', { id, datosActualizados });

  try {
    // 1. VALIDAR el ID
    if (!id || typeof id !== 'string') {
      throw new ValidationError('ID inválido', [
        { field: 'id', message: 'El ID es requerido y debe ser una cadena válida' }
      ]);
    }

    // 2. VALIDAR los datos actualizados (parcial)
    const validatedData = validateRequest(
      updateMinutaSchema.omit({ id: true }).partial(),
      datosActualizados
    );

    console.log('Datos validados correctamente');

    // 3. Actualizar en Backend
    return apiFetch<MinutaDefinitiva>(`/minutas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        datos: validatedData
      })
    });

  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Error de validación al actualizar minuta:', error.errors);
    } else {
      console.error('Error inesperado al actualizar minuta:', error);
    }
    throw error;
  }
}

// Obtener datos del mapa de ventas para una unidad específica
export async function getDatosMapaVentasByUnidadId(unidadId: string) {
  try {
    // Intenta buscar por ID si es numérico
    if (Number.isNaN(Number(unidadId))) {
      const dataById = await apiFetch<any>(`/unidades/${unidadId}`);
      if (dataById) return dataById;
    }

    // Intenta buscar por nrounidad
    const dataByNro = await apiFetch<any[]>(`/unidades?nrounidad=${encodeURIComponent(unidadId)}`);
    if (dataByNro && dataByNro.length > 0) return dataByNro[0];

    // Intenta buscar por sectorid
    const dataBySector = await apiFetch<any[]>(`/unidades?sectorid=${encodeURIComponent(unidadId)}`);
    if (dataBySector && dataBySector.length > 0) return dataBySector[0];

    return null;
  } catch (error) {
    console.error('Error fetching mapa ventas data', error);
    return null;
  }
}

// Guardar directamente una minuta definitiva (CON VALIDACIÓN)
export async function guardarMinutaDefinitiva(minuta: Omit<MinutaDefinitiva, 'id' | 'fecha_creacion'>) {
  try {
    // 1. VALIDAR los datos de la minuta
    const validatedData = validateRequest(createMinutaSchema, minuta.datos);

    // 2. Extraer información validada
    const proyecto = validatedData.proyecto || 'Sin proyecto';
    const unidadCodigo = minuta.datos.unidadCodigo || minuta.datos.unidad?.codigo || '';

    // 3. Obtener datos del mapa de ventas para la unidad
    const datosMapaVentas = await getDatosMapaVentasByUnidadId(unidadCodigo);

    // 4. Preparar minuta para guardar
    const minutaParaGuardar = {
      ...minuta,
      datos: validatedData,
      proyecto,
      datos_mapa_ventas: datosMapaVentas,
      fecha_creacion: new Date().toISOString(),
      estado: minuta.estado || 'pendiente',
    };

    // 5. Guardar en Backend
    return apiFetch<MinutaDefinitiva>('/minutas', {
      method: 'POST',
      body: JSON.stringify(minutaParaGuardar)
    });

  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    // Retry without mapa ventas logic if needed... or just fail. 
    // Assuming backend handles optional mapa ventas.
    throw error;
  }
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
    if (error instanceof ValidationError) {
      console.error('Validation error in getMinutasWithFilters', error);
    }
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
    throw error;
  }
}

// Obtener minutas definitivas (Legacy alias)
export async function getMinutasDefinitivas() {
  const response = await apiFetch<{ data: MinutaDefinitiva[] }>('/minutas');
  return response.data;
}
