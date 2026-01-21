import { apiFetch } from '../lib/api-client';

export interface Proyecto {
  id: string;
  nombre: string;
  tabla_nombre: string;
  descripcion?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  iva?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface GastosGenerales {
  proyecto: string;
  sellado?: number;
  certificaciondefirmas?: number;
  alajamiento?: number;
  planosm2propiedad?: number;
  planosm2cochera?: number;
  comisioninmobiliaria?: number;
  otrosgastos?: number;
  fecha_posesion?: string;
  etapatorre?: string;
}

/**
 * Obtiene todos los proyectos activos
 */
export async function getProyectosActivos(): Promise<Proyecto[]> {
  return await apiFetch<Proyecto[]>('/proyectos');
}

/**
 * Obtiene los gastos generales de un proyecto por su nombre
 */
export async function getGastosGeneralesByProyecto(nombreProyecto: string): Promise<GastosGenerales | null> {
  try {
    // Obtener el proyecto con sus gastos generales incluidos
    const proyecto = await apiFetch<Proyecto & { gastosgenerales?: GastosGenerales[] }>(`/proyectos/by-name/${encodeURIComponent(nombreProyecto)}`);

    if (!proyecto || !proyecto.gastosgenerales || proyecto.gastosgenerales.length === 0) {
      return null;
    }

    // Retornar el primer (y único) registro de gastos generales
    return proyecto.gastosgenerales[0];
  } catch (error) {
    console.error('Error fetching gastos generales:', error);
    return null;
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

