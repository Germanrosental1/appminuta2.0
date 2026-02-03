import { apiGet } from '../lib/api-wrapper-client';

export interface Proyecto {
  Id: string;
  Nombre: string;
  TablaNombre: string;
  Descripcion?: string;
  Direccion?: string;
  Localidad?: string;
  Provincia?: string;
  Iva?: string;
  Activo: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  GastosGenerales?: GastosGenerales[]; // Relación con gastos generales
}

export interface GastosGenerales {
  Proyecto: string; // Relación inversa? O Id? Dependiendo de cómo Prisma serializa
  Sellado?: number;
  CertificacionFirmas?: number;
  Alajamiento?: number;
  PlanosM2Propiedad?: number;
  PlanosM2Cochera?: number;
  ComisionInmobiliaria?: number;
  OtrosGastos?: number;
  FechaPosesion?: string;
  EtapaTorre?: string;
}

/**
 * Obtiene todos los proyectos activos
 */
export async function getProyectosActivos(): Promise<Proyecto[]> {
  return await apiGet<Proyecto[]>('/proyectos');
}

/**
 * Obtiene los gastos generales de un proyecto por su nombre
 */
export async function getGastosGeneralesByProyecto(nombreProyecto: string): Promise<GastosGenerales | null> {
  try {
    // Obtener el proyecto con sus gastos generales incluidos
    const proyecto = await apiGet<Proyecto>(`/proyectos/by-name/${encodeURIComponent(nombreProyecto)}`);

    if (!proyecto?.GastosGenerales || proyecto.GastosGenerales.length === 0) {
      return null;
    }

    // Retornar el primer (y único) registro de gastos generales
    return proyecto.GastosGenerales[0];
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

