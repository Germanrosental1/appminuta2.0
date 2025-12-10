import { apiFetch } from '../lib/api-client';

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
    return apiFetch<Proyecto[]>('/proyectos');
  } catch (error) {
    console.error('Error fetching proyectos:', error);
    // Fallback logic could be here, but ideally better handled by error component
    return [];
  }
}

/**
 * Obtiene el nombre de la tabla asociada a un proyecto
 * Ahora siempre devuelve 'tablas' ya que todos los proyectos están en esa tabla
 */
export async function getTablaProyecto(nombreProyecto: string): Promise<string | null> {
  return 'tablas';
}

/**
 * Verifica si una tabla existe en la base de datos
 * @deprecated Legacy validation, returns true
 */
export async function verificarTablaExiste(nombreTabla: string): Promise<boolean> {
  return true;
}
