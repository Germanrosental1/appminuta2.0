import { supabase } from '../lib/supabase';
import { WizardData } from '@/types/wizard';
import { validateRequest, safeValidate, ValidationError } from '@/utils/validateRequest';
import { 
  minutaSchema, 
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

// Exportar ValidationError para uso en componentes
export { ValidationError };

// Guardar una minuta provisoria (CON VALIDACIÓN)
export async function guardarMinutaProvisoria(minuta: Omit<MinutaProvisoria, 'id' | 'fecha_creacion'>) {
  try {
    // 1. VALIDAR los datos de la minuta
    const validatedData = validateRequest(createMinutaSchema, minuta.datos);
    
    // 2. Extraer el proyecto del objeto datos validado
    const proyecto = validatedData.proyecto || 'Sin proyecto';
    
    // 3. Guardar en base de datos
    const { data, error } = await supabase
      .from('minutas_provisorias')
      .insert({
        ...minuta,
        datos: validatedData, // Usar datos validados
        proyecto,
        fecha_creacion: new Date().toISOString(),
      })
      .select();
    
    if (error) throw error;
    return data?.[0] as MinutaProvisoria;
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Error de validación al guardar minuta provisoria:', error.errors);
      throw error;
    }
    console.error('Error al guardar minuta provisoria:', error);
    throw error;
  }
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
    
    // 2. Construir query base
    let query = supabase
      .from('minutas_definitivas')
      .select('*')
      .eq('usuario_id', usuarioId);
    
    // 3. Aplicar filtros si existen
    if (filters) {
      const validatedFilters = safeValidate(minutaFilterSchema.partial(), filters);
      
      if (validatedFilters.success) {
        const f = validatedFilters.data;
        
        if (f.estado) {
          query = query.eq('estado', f.estado);
        }
        
        if (f.proyecto) {
          query = query.eq('proyecto', f.proyecto);
        }
        
        if (f.fechaDesde) {
          query = query.gte('fecha_creacion', f.fechaDesde);
        }
        
        if (f.fechaHasta) {
          query = query.lte('fecha_creacion', f.fechaHasta);
        }
      }
    }
    
    // 4. Ordenar resultados
    query = query.order('fecha_creacion', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data as MinutaDefinitiva[];
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Error de validación al obtener minutas:', error.errors);
    }
    throw error;
  }
}

// Obtener todas las minutas definitivas (para administración)
export async function getAllMinutasDefinitivasForAdmin() {
  const { data, error } = await supabase
    .from('minutas_definitivas')
    .select('*')
    .order('fecha_creacion', { ascending: false });
  
  if (error) throw error;
  return data as MinutaDefinitiva[];
}

// Obtener una minuta definitiva por ID
export async function getMinutaDefinitivaById(id: string) {
  const { data, error } = await supabase
    .from('minutas_definitivas')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as MinutaDefinitiva;
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
    
    // 3. Actualizar en base de datos
    const { data, error } = await supabase
      .from('minutas_definitivas')
      .update({ 
        estado: validatedUpdate.estado,
        comentarios: comentarios || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    return data;
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
    
    // 3. Actualizar en base de datos
    const { data, error } = await supabase
      .from('minutas_definitivas')
      .update({ 
        datos: validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error al actualizar datos de minuta:', error);
      throw error;
    }
    
    console.log('Datos de minuta actualizados correctamente:', data);
    return data?.[0] as MinutaDefinitiva;
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Error de validación al actualizar minuta:', error.errors);
    } else {
      console.error('Error inesperado al actualizar minuta:', error);
    }
    throw error;
  }
}

// Esta función ya no es necesaria ya que guardamos directamente en minutas definitivas
// Mantenemos el comentario para referencia histórica

// Guardar directamente una minuta definitiva (CON VALIDACIÓN)
export async function guardarMinutaDefinitiva(minuta: Omit<MinutaDefinitiva, 'id' | 'fecha_creacion'>) {
  console.log('Guardando minuta definitiva:', { usuarioId: minuta.usuario_id });
  
  try {
    // 1. VALIDAR los datos de la minuta
    const validatedData = validateRequest(createMinutaSchema, minuta.datos);
    console.log('Datos de minuta validados correctamente');
    
    // 2. Extraer información validada
    const proyecto = validatedData.proyecto || 'Sin proyecto';
    console.log('Proyecto extraído:', proyecto);
    
    const unidadCodigo = minuta.datos.unidadCodigo || minuta.datos.unidad?.codigo || '';
    console.log('Código de unidad extraído:', unidadCodigo);
    
    // 3. Obtener datos del mapa de ventas para la unidad
    console.log('Obteniendo datos del mapa de ventas para unidad:', unidadCodigo);
    const datosMapaVentas = await getDatosMapaVentasByUnidadId(unidadCodigo);
    console.log('Datos del mapa de ventas obtenidos:', datosMapaVentas ? 'Sí' : 'No');
    
    // 4. Preparar minuta para guardar con datos validados
    const minutaParaGuardar = {
      ...minuta,
      datos: validatedData, // Usar datos validados
      proyecto,
      datos_mapa_ventas: datosMapaVentas,
      fecha_creacion: new Date().toISOString(),
      estado: minuta.estado || 'pendiente',
    };
    
    console.log('Insertando minuta en la base de datos...');
    
    // 5. Guardar en base de datos
    const { data, error } = await supabase
      .from('minutas_definitivas')
      .insert(minutaParaGuardar)
      .select();
    
    if (error) {
      console.error('Error al insertar minuta definitiva:', error);
      throw error;
    }
    
    console.log('Minuta guardada exitosamente:', data?.[0]?.id);
    return data?.[0] as MinutaDefinitiva;
    
  } catch (error) {
    console.error('Error al guardar minuta definitiva:', error);
    
    if (error instanceof ValidationError) {
      console.error('Errores de validación:', error.errors);
      throw error;
    }
    
    // Si hay un error diferente al de validación, intentamos guardar sin datos del mapa de ventas
    try {
      console.log('Intentando guardar minuta sin datos del mapa de ventas...');
      
      // Validar datos nuevamente para el segundo intento
      const validatedData = validateRequest(createMinutaSchema, minuta.datos);
      
      const minutaParaGuardar = {
        ...minuta,
        datos: validatedData,
        proyecto: validatedData.proyecto || 'Sin proyecto',
        fecha_creacion: new Date().toISOString(),
        estado: minuta.estado || 'pendiente',
      };
      
      const { data, error: insertError } = await supabase
        .from('minutas_definitivas')
        .insert(minutaParaGuardar)
        .select();
      
      if (insertError) {
        console.error('Error al insertar minuta definitiva (segundo intento):', insertError);
        throw insertError;
      }
      
      console.log('Minuta guardada exitosamente (sin datos mapa ventas):', data?.[0]?.id);
      return data?.[0] as MinutaDefinitiva;
    } catch (secondError) {
      console.error('Error en segundo intento de guardar minuta:', secondError);
      throw secondError;
    }
  }
}

// Obtener minutas definitivas
export async function getMinutasDefinitivas() {
  const { data, error } = await supabase
    .from('minutas_definitivas')
    .select('*')
    .order('fecha_creacion', { ascending: false });
  
  if (error) throw error;
  return data as MinutaDefinitiva[];
}

// Obtener datos del mapa de ventas para una unidad específica
export async function getDatosMapaVentasByUnidadId(unidadId: string) {
  console.log('Buscando datos de la unidad:', unidadId);
  
  try {
    // Primero intentamos buscar por id (campo principal en tabla 'tablas')
    const { data: dataById, error: errorById } = await supabase
      .from('tablas')
      .select('*')
      .eq('id', unidadId);
    
    if (errorById) {
      console.error('Error al buscar por id:', errorById);
    } else if (dataById && dataById.length > 0) {
      console.log('Datos encontrados por id:', dataById[0]);
      return dataById[0];
    } else {
      console.log('No se encontraron datos por id, intentando con nrounidad');
    }
    
    // Si no encontramos por id, intentamos con nrounidad
    const { data: dataByNroUnidad, error: errorByNroUnidad } = await supabase
      .from('tablas')
      .select('*')
      .eq('nrounidad', unidadId);
    
    if (errorByNroUnidad) {
      console.error('Error al buscar por nrounidad:', errorByNroUnidad);
    } else if (dataByNroUnidad && dataByNroUnidad.length > 0) {
      console.log('Datos encontrados por nrounidad:', dataByNroUnidad[0]);
      return dataByNroUnidad[0];
    } else {
      console.log('No se encontraron datos por nrounidad, intentando con sectorid');
    }
    
    // Si no encontramos por nrounidad, intentamos con sectorid
    const { data: dataBySectorId, error: errorBySectorId } = await supabase
      .from('tablas')
      .select('*')
      .eq('sectorid', unidadId);
    
    if (errorBySectorId) {
      console.error('Error al buscar por sectorid:', errorBySectorId);
    } else if (dataBySectorId && dataBySectorId.length > 0) {
      console.log('Datos encontrados por sectorid:', dataBySectorId[0]);
      return dataBySectorId[0];
    } else {
      console.log('No se encontraron datos para la unidad:', unidadId);
    }
    
    // Si llegamos aquí, no encontramos datos para la unidad
    return null;
  } catch (error) {
    console.error('Error inesperado al obtener datos del mapa de ventas:', error);
    return null;
  }
}

// Conformar una minuta provisoria con el mapa de ventas
export async function conformarMinutaConMapaVentas(minutaId: string, datosConformacion: any) {
  // Aquí implementarías la lógica para actualizar la minuta con los datos de conformación
  // Por ejemplo, podrías agregar un campo 'datos_conformacion' a la minuta
  
  const { data, error } = await supabase
    .from('minutas_provisorias')
    .update({
      datos_conformacion: datosConformacion,
      estado: 'revisada'
    })
    .eq('id', minutaId)
    .select();
  
  if (error) throw error;
  return data?.[0];
}

// Obtener minutas con filtros avanzados y paginación
export async function getMinutasWithFilters(filters: Partial<MinutaFilters>) {
  try {
    // 1. VALIDAR filtros
    const validatedFilters = validateRequest(minutaFilterSchema, {
      page: 1,
      limit: 20,
      sortBy: 'created_at',
      sortOrder: 'desc',
      ...filters
    });
    
    // 2. Construir query base
    let query = supabase
      .from('minutas_definitivas')
      .select('*', { count: 'exact' });
    
    // 3. Aplicar filtros
    if (validatedFilters.proyecto) {
      query = query.eq('proyecto', validatedFilters.proyecto);
    }
    
    if (validatedFilters.estado) {
      query = query.eq('estado', validatedFilters.estado);
    }
    
    if (validatedFilters.usuario_id) {
      query = query.eq('usuario_id', validatedFilters.usuario_id);
    }
    
    if (validatedFilters.fechaDesde) {
      query = query.gte('created_at', validatedFilters.fechaDesde);
    }
    
    if (validatedFilters.fechaHasta) {
      query = query.lte('created_at', validatedFilters.fechaHasta);
    }
    
    // Filtros de precio (requiere cast a numeric en la query)
    if (validatedFilters.precioMin !== undefined) {
      query = query.gte('datos->precioNegociado', validatedFilters.precioMin);
    }
    
    if (validatedFilters.precioMax !== undefined) {
      query = query.lte('datos->precioNegociado', validatedFilters.precioMax);
    }
    
    // 4. Ordenamiento
    query = query.order(
      validatedFilters.sortBy || 'created_at',
      { ascending: validatedFilters.sortOrder === 'asc' }
    );
    
    // 5. Paginación
    const offset = (validatedFilters.page - 1) * validatedFilters.limit;
    query = query.range(offset, offset + validatedFilters.limit - 1);
    
    // 6. Ejecutar query
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      data: data as MinutaDefinitiva[],
      total: count || 0,
      page: validatedFilters.page,
      limit: validatedFilters.limit,
      totalPages: Math.ceil((count || 0) / validatedFilters.limit),
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Error de validación en filtros:', error.errors);
    }
    throw error;
  }
}

// Validar datos de minuta sin guardar (útil para validación en tiempo real)
export function validateMinutaData(data: unknown, partial: boolean = false) {
  const schema = partial ? updateMinutaSchema.partial() : createMinutaSchema;
  return safeValidate(schema, data);
}

// Eliminar una minuta
export async function deleteMinuta(id: string) {
  try {
    // 1. VALIDAR el ID
    if (!id || typeof id !== 'string') {
      throw new ValidationError('ID inválido', [
        { field: 'id', message: 'El ID es requerido y debe ser una cadena válida' }
      ]);
    }
    
    // 2. Eliminar de base de datos
    const { error } = await supabase
      .from('minutas_definitivas')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Error de validación al eliminar minuta:', error.errors);
    }
    throw error;
  }
}

// Obtener estadísticas de minutas por usuario
export async function getMinutasStats(usuarioId?: string) {
  try {
    let query = supabase
      .from('minutas_definitivas')
      .select('estado, created_at');
    
    if (usuarioId) {
      query = query.eq('usuario_id', usuarioId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Calcular estadísticas
    const stats = {
      total: data.length,
      pendientes: data.filter(m => m.estado === 'pendiente').length,
      aprobadas: data.filter(m => m.estado === 'aprobada').length,
      firmadas: data.filter(m => m.estado === 'firmada').length,
      canceladas: data.filter(m => m.estado === 'cancelada').length,
      rechazadas: data.filter(m => m.estado === 'rechazada').length,
      porEstado: {} as Record<string, number>,
    };
    
    // Agrupar por estado
    data.forEach(minuta => {
      stats.porEstado[minuta.estado] = (stats.porEstado[minuta.estado] || 0) + 1;
    });
    
    return stats;
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    throw error;
  }
}
