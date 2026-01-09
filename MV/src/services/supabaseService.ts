import { supabase } from '@/lib/supabase';
import { backendAPI } from './backendAPI';
import { TablaItem, TablaInsert, TablaUpdate, Unit, mapTablaToUnit, mapUnitToTabla, EstadoUnidad, normalizeEstado } from '@/types/supabase-types';

const TABLE_NAME = 'vista_buscador_propiedades';

export const supabaseService = {
  /**
   * Obtiene todas las unidades de la tabla
   */
  async getAllUnits(): Promise<Unit[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*');

      if (error) {
        console.error('Error fetching units:', error);
        throw error;
      }

      return (data || []).map(mapTablaToUnit);
    } catch (error) {
      console.error('Error in getAllUnits:', error);
      throw error;
    }
  },

  /**
   * Obtiene unidades filtradas por proyecto
   */
  async getUnitsByProject(proyecto: string): Promise<Unit[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('proyecto', proyecto);

      if (error) {
        console.error(`Error fetching units for project ${proyecto}:`, error);
        throw error;
      }

      return (data || []).map(mapTablaToUnit);
    } catch (error) {
      console.error('Error in getUnitsByProject:', error);
      throw error;
    }
  },

  /**
   * Obtiene una unidad por su ID
   */
  async getUnitById(id: string): Promise<Unit | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No se encontró el registro
          return null;
        }
        console.error(`Error fetching unit with id ${id}:`, error);
        throw error;
      }

      return data ? mapTablaToUnit(data) : null;
    } catch (error) {
      console.error('Error in getUnitById:', error);
      throw error;
    }
  },

  /**
   * Actualiza una unidad existente via backend API
   * La vista es de solo lectura, así que usamos el backend
   */
  async updateUnit(unit: Unit): Promise<Unit> {
    try {
      console.log('📝 Actualizando unidad:', unit);

      // Mapear Unit a formato del backend
      const backendData = {
        // Campos basicos
        piso: unit.piso,
        nrounidad: unit.numeroUnidad,
        dormitorios: unit.dormitorios,
        manzana: unit.manzana,
        destino: unit.destino,
        frente: unit.frente,

        // Métricas
        m2exclusivos: unit.m2Exclusivos,
        m2totales: unit.m2Totales,
        m2comunes: unit.m2Comunes,
        m2patioterraza: unit.m2PatioTerraza,

        // Detalles de venta
        preciousd: unit.precioUSD,
        usdm2: unit.usdM2,
        clienteinteresado: unit.clienteInteresado,
        obs: unit.observaciones,
        fechareserva: unit.fechaReserva || null,

        // TODO: Necesitaremos convertir nombres a IDs para:
        // - estado_id (de unit.estado)
        // - tipounidad_id (de unit.tipo)
        // - comercial_id (de unit.comercial)
        // - etapa_id (de unit.etapa)
        // Por ahora enviamos lo que podemos
      };

      // Llamar al backend API
      await backendAPI.updateUnitComplete(unit.id, backendData);

      // Retornar la unidad actualizada
      return unit;
    } catch (error) {
      console.error('❌ Error in updateUnit:', error);
      throw error;
    }
  },

  /**
   * Crea una nueva unidad completa (incluyendo métricas y detalles)
   */
  async createUnit(unit: Omit<Unit, 'id'>): Promise<Unit> {
    try {
      console.log('📝 Creating complete unit:', unit);

      // Mapear Unit a formato del backend (CreateUnidadDto)
      const backendData = {
        // Campos obligatorios/básicos
        sectorid: unit.sectorId,

        // El backend ha sido actualizado para resolver estos IDs por nombre si es texto
        tipounidad_id: unit.tipo,
        edificio_id: unit.edificioTorre,
        etapa_id: unit.etapa,

        piso: unit.piso,
        nrounidad: unit.numeroUnidad,
        dormitorios: unit.dormitorios,
        manzana: unit.manzana,
        destino: unit.destino,
        frente: unit.frente,

        // Métricas
        m2exclusivos: unit.m2Exclusivos,
        m2totales: unit.m2Totales,
        m2comunes: unit.m2Comunes,
        m2patioterraza: unit.m2PatioTerraza,
        tamano: String(unit.tamano || 0),

        // Detalles Venta
        preciousd: unit.precioUSD,
        usdm2: unit.usdM2,
        clienteinteresado: unit.clienteInteresado,
        obs: unit.observaciones,
        fechareserva: unit.fechaReserva,

        estadocomercial: unit.estado,
        comercial: unit.comercial,

        // Extras
        unidadcomprador_id: null,
        tipocochera_id: null
      };

      // Debemos asegurarnos que el backend las resuelva.

      const createdUnit = await backendAPI.createUnitComplete(backendData);
      return mapTablaToUnit(createdUnit);
    } catch (error) {
      console.error('Error in createUnit:', error);
      throw error;
    }
  },

  /**
   * Elimina una unidad por su ID
   */
  async deleteUnit(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting unit with id ${id}:`, error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteUnit:', error);
      throw error;
    }
  },

  /**
   * Obtiene todos los proyectos únicos
   */
  async getProjects(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('proyecto')
        .not('proyecto', 'is', null);

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }

      // Extraer proyectos únicos
      const projects = [...new Set(data.map(item => item.proyecto))].filter(Boolean) as string[];
      return projects;
    } catch (error) {
      console.error('Error in getProjects:', error);
      throw error;
    }
  },

  /**
   * Obtiene todas las naturalezas de proyecto únicas
   */
  async getNaturalezasProyecto(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('natdelproyecto')
        .not('natdelproyecto', 'is', null);

      if (error) {
        console.error('Error fetching naturalezas:', error);
        throw error;
      }

      // Extraer naturalezas únicas
      const naturalezas = [...new Set(data.map(item => item.natdelproyecto))].filter(Boolean) as string[];
      return naturalezas;
    } catch (error) {
      console.error('Error in getNaturalezasProyecto:', error);
      throw error;
    }
  },

  /**
   * Obtiene proyectos agrupados por naturaleza
   * Nota: vista_buscador_propiedades no tiene la columna 'natdelproyecto',
   * por lo que todos los proyectos se agrupan bajo "Proyectos"
   */
  async getProjectsByNaturaleza(): Promise<{ naturaleza: string, proyectos: string[] }[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('proyecto')
        .not('proyecto', 'is', null);

      if (error) {
        console.error('Error fetching projects by naturaleza:', error);
        throw error;
      }

      console.log('📊 Supabase data for projects:', data);

      // Extraer proyectos únicos
      const uniqueProjects = [...new Set(data.map(item => item.proyecto))].filter(Boolean) as string[];

      console.log('📋 Unique projects found:', uniqueProjects);

      // Retornar todos los proyectos bajo un solo grupo "Proyectos"
      const result = [{
        naturaleza: 'Proyectos',
        proyectos: uniqueProjects.sort()
      }];

      console.log('✅ Final projects by naturaleza array:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in getProjectsByNaturaleza:', error);
      throw error;
    }
  },

  /**
   * Obtiene unidades por naturaleza del proyecto
   */
  async getUnitsByNaturaleza(naturaleza: string): Promise<Unit[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('natdelproyecto', naturaleza);

      if (error) {
        console.error(`Error fetching units for naturaleza ${naturaleza}:`, error);
        throw error;
      }

      return (data || []).map(mapTablaToUnit);
    } catch (error) {
      console.error('Error in getUnitsByNaturaleza:', error);
      throw error;
    }
  },

  /**
   * Obtiene todos los valores únicos para un campo específico
   */
  async getUniqueValues(field: keyof TablaItem): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(field)
        .not(field, 'is', null);

      if (error) {
        console.error(`Error fetching unique values for ${field}:`, error);
        throw error;
      }

      // Extraer valores únicos
      const values = [...new Set(data.map(item => item[field]))].filter(Boolean) as string[];
      return values;
    } catch (error) {
      console.error(`Error in getUniqueValues for ${field}:`, error);
      throw error;
    }
  },

  /**
   * Obtiene todos los valores únicos para un campo específico filtrado por proyecto
   */
  async getUniqueValuesByProject(field: keyof TablaItem, proyecto: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(field)
        .eq('proyecto', proyecto)
        .not(field, 'is', null);

      if (error) {
        console.error(`Error fetching unique values for ${field} in project ${proyecto}:`, error);
        throw error;
      }

      // Extraer valores únicos
      const values = [...new Set(data.map(item => item[field]))].filter(Boolean) as string[];
      return values;
    } catch (error) {
      console.error(`Error in getUniqueValuesByProject for ${field}:`, error);
      throw error;
    }
  }
};
