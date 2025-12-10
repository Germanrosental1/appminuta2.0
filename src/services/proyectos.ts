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


    // Primero intentar obtener proyectos de la tabla proyectos
    try {
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (!error && data && data.length > 0) {

        return data;
      }
    } catch (err) {

    }

    // Si no hay proyectos en la tabla proyectos, intentar obtenerlos de la tabla 'tablas'
    try {

      // Usar RPC para obtener proyectos únicos de la tabla tablas de manera eficiente
      const { data, error } = await supabase.rpc('get_unique_projects_from_tablas');

      if (!error && data && data.length > 0) {


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

    }

    // Si todo falla, usar proyectos por defecto

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


    return defaultProyectos;
  } catch (error) {

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

    return defaultProyectos;
  }
}

/**
 * Obtiene el nombre de la tabla asociada a un proyecto
 * Ahora siempre devuelve 'tablas' ya que todos los proyectos están en esa tabla
 */
export async function getTablaProyecto(nombreProyecto: string): Promise<string | null> {
  try {


    // Verificar si el proyecto existe en la tabla 'tablas'
    const { count, error } = await supabase
      .from('tablas')
      .select('*', { count: 'exact', head: true })
      .eq('proyecto', nombreProyecto);

    if (error) {

    } else if (count && count > 0) {

    } else {

    }

    // Siempre devolver 'tablas' como nombre de tabla

    return 'tablas';
  } catch (error) {

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

      return false;
    }

    return data || false;
  } catch (error) {

    return false;
  }
}
