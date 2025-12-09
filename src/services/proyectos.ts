import { supabase } from '../lib/supabase';

export interface Proyecto {
  id: string;
  nombre: string;
  tabla_nombre: string;
  descripcion?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene todos los proyectos activos
 */
export async function getProyectosActivos(): Promise<Proyecto[]> {
  try {
    console.log('Obteniendo proyectos activos...');
    
    // Primero intentar obtener proyectos de la tabla proyectos
    try {
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      
      if (!error && data && data.length > 0) {
        console.log('Proyectos activos obtenidos de tabla proyectos:', data);
        return data;
      }
    } catch (err) {
      console.error('Error al obtener proyectos de tabla proyectos:', err);
    }
    
    // Si no hay proyectos en la tabla proyectos, intentar obtenerlos de la tabla 'tablas'
    try {
      console.log('Intentando obtener proyectos únicos de tabla "tablas"...');
      // Usar RPC para obtener proyectos únicos de la tabla tablas de manera eficiente
      const { data, error } = await supabase.rpc('get_unique_projects_from_tablas');
      
      if (!error && data && data.length > 0) {
        console.log('Proyectos únicos obtenidos de tabla "tablas":', data);
        
        // Convertir al formato de Proyecto
        const proyectos: Proyecto[] = data.map((nombre: string) => ({
          id: nombre,
          nombre: nombre,
          tabla_nombre: 'tablas',
          activo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        return proyectos;
      }
    } catch (err) {
      console.error('Error al obtener proyectos únicos de tabla "tablas":', err);
    }
    
    // Si todo falla, usar proyectos por defecto
    console.log('Usando proyectos por defecto...');
    const defaultProyectos = [
      { 
        id: '1', 
        nombre: 'Arboria', 
        tabla_nombre: 'tablas',
        activo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    console.log('Devolviendo proyectos por defecto:', defaultProyectos);
    return defaultProyectos;
  } catch (error) {
    console.error('Error inesperado al obtener proyectos:', error);
    // En caso de error, devolver una lista de proyectos por defecto
    const defaultProyectos = [
      { 
        id: '1', 
        nombre: 'Arboria', 
        tabla_nombre: 'mapadeventas',
        activo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    console.log('Devolviendo proyectos por defecto:', defaultProyectos);
    return defaultProyectos;
  }
}

/**
 * Obtiene el nombre de la tabla asociada a un proyecto
 * Ahora siempre devuelve 'tablas' ya que todos los proyectos están en esa tabla
 */
export async function getTablaProyecto(nombreProyecto: string): Promise<string | null> {
  try {
    console.log(`Buscando tabla para el proyecto: ${nombreProyecto}`);
    
    // Verificar si el proyecto existe en la tabla 'tablas'
    const { count, error } = await supabase
      .from('tablas')
      .select('*', { count: 'exact', head: true })
      .eq('proyecto', nombreProyecto);
    
    if (error) {
      console.error(`Error al verificar proyecto ${nombreProyecto} en tabla 'tablas':`, error);
    } else if (count && count > 0) {
      console.log(`Proyecto ${nombreProyecto} encontrado en tabla 'tablas' con ${count} registros`);
    } else {
      console.log(`Proyecto ${nombreProyecto} no encontrado en tabla 'tablas', pero se usará esta tabla de todos modos`);
    }
    
    // Siempre devolver 'tablas' como nombre de tabla
    console.log(`Tabla encontrada para ${nombreProyecto}: tablas`);
    return 'tablas';
  } catch (error) {
    console.error(`Error inesperado al obtener tabla para ${nombreProyecto}:`, error);
    // Siempre devolver 'tablas' como nombre de tabla incluso en caso de error
    return 'tablas';
  }
}

/**
 * Verifica si una tabla existe en la base de datos
 */
export async function verificarTablaExiste(nombreTabla: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('check_table_exists', { table_name: nombreTabla });
    
    if (error) {
      console.error('Error al verificar tabla:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Error inesperado al verificar tabla:', error);
    return false;
  }
}
