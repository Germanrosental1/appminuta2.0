import { supabase } from '../lib/supabase';
import { WizardData } from '@/types/wizard';

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

// Guardar una minuta provisoria
export async function guardarMinutaProvisoria(minuta: Omit<MinutaProvisoria, 'id' | 'fecha_creacion'>) {
  // Extraer el proyecto del objeto datos para guardarlo como columna separada
  const proyecto = minuta.datos.proyecto || 'Sin proyecto';
  
  const { data, error } = await supabase
    .from('minutas_provisorias')
    .insert({
      ...minuta,
      proyecto, // Agregar el proyecto como columna separada
      fecha_creacion: new Date().toISOString(),
    })
    .select();
  
  if (error) throw error;
  return data?.[0] as MinutaProvisoria;
}

// Obtener minutas definitivas por usuario comercial
export async function getMinutasDefinitivasByUsuario(usuarioId: string) {
  const { data, error } = await supabase
    .from('minutas_definitivas')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('fecha_creacion', { ascending: false });
  
  if (error) throw error;
  return data as MinutaDefinitiva[];
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

// Actualizar el estado de una minuta definitiva
export async function actualizarEstadoMinutaDefinitiva(id: string, estado: MinutaDefinitiva['estado'], comentarios?: string) {
  const { data, error } = await supabase
    .from('minutas_definitivas')
    .update({ 
      estado,
      comentarios: comentarios || null
    })
    .eq('id', id);
  
  if (error) throw error;
  return data;
}

// Actualizar los datos de una minuta definitiva
export async function actualizarDatosMinutaDefinitiva(id: string, datosActualizados: any) {
  console.log('Actualizando datos de minuta definitiva:', { id, datosActualizados });
  
  const { data, error } = await supabase
    .from('minutas_definitivas')
    .update({ 
      datos: datosActualizados,
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
}

// Esta función ya no es necesaria ya que guardamos directamente en minutas definitivas
// Mantenemos el comentario para referencia histórica

// Guardar directamente una minuta definitiva
export async function guardarMinutaDefinitiva(minuta: Omit<MinutaDefinitiva, 'id' | 'fecha_creacion'>) {
  console.log('Guardando minuta definitiva:', { usuarioId: minuta.usuario_id });
  
  // Extraer el proyecto del objeto datos para guardarlo como columna separada
  const proyecto = minuta.datos.proyecto || 'Sin proyecto';
  console.log('Proyecto extraído:', proyecto);
  
  // Extraer el código de la unidad del objeto datos
  const unidadCodigo = minuta.datos.unidadCodigo || minuta.datos.unidad?.codigo || '';
  console.log('Código de unidad extraído:', unidadCodigo);
  
  try {
    // Obtener datos del mapa de ventas para la unidad
    console.log('Obteniendo datos del mapa de ventas para unidad:', unidadCodigo);
    const datosMapaVentas = await getDatosMapaVentasByUnidadId(unidadCodigo);
    console.log('Datos del mapa de ventas obtenidos:', datosMapaVentas ? 'Sí' : 'No');
    
    const minutaParaGuardar = {
      ...minuta,
      proyecto, // Agregar el proyecto como columna separada
      datos_mapa_ventas: datosMapaVentas, // Agregar datos del mapa de ventas
      fecha_creacion: new Date().toISOString(),
      estado: minuta.estado || 'pendiente',
    };
    
    console.log('Insertando minuta en la base de datos...');
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
    
    // Si hay un error al obtener los datos del mapa de ventas, intentamos guardar la minuta sin ellos
    try {
      console.log('Intentando guardar minuta sin datos del mapa de ventas...');
      const minutaParaGuardar = {
        ...minuta,
        proyecto,
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
