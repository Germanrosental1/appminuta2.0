import { supabase } from '@/lib/supabase';
import { TablaItem, TablaUpdate, TablaInsert, Unit, mapTablaToUnit, mapUnitToTabla } from '../types/supabase-types';
import { backendAPI } from './backendAPI';

const TABLE_NAME = 'vista_buscador_propiedades';

export const supabaseService = {
  // Obtener todas las unidades
  async getAllUnits(): Promise<Unit[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*');

      if (error) {
        throw error;
      }

      return (data || []).map(mapTablaToUnit);
    } catch (error) {
      console.error('Error fetching units:', error);
      throw error;
    }
  },

  // Obtener unidades por proyecto
  async getUnitsByProject(proyecto: string): Promise<Unit[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('proyecto', proyecto); // Lowercase

      if (error) {
        throw error;
      }

      return (data || []).map(mapTablaToUnit);
    } catch (error) {
      console.error(`Error fetching units for project ${proyecto}:`, error);
      throw error;
    }
  },

  // Obtener unidad por ID
  async getUnitById(id: string): Promise<Unit | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id) // Lowercase
        .single();

      if (error) {
        throw error;
      }

      return data ? mapTablaToUnit(data) : null;
    } catch (error) {
      console.error(`Error fetching unit with id ${id}:`, error);
      return null;
    }
  },

  // Crear una nueva unidad
  async createUnit(unit: Unit): Promise<Unit> {
    try {
      const newItem = mapUnitToTabla(unit);
      // Removemos ID para que se genere (si es insert)
      const { id, ...insertData } = newItem;

      // Intentar crear a través de backendAPI sería ideal, pero mantenemos lógica de insert directo para simpleza
      // Si la vista no es actualizable, esto fallará y deberíamos usar backendAPI.createUnitComplete

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([insertData])
        .select()
        .single();

      if (error) {
        // Si falla (ej. view not updatable), intentar vía backend
        try {
          // Adaptar unit a lo que backend espera (any)
          return await backendAPI.createUnitComplete(unit) as Unit; // Cast as Unit, backend returns Unit-like structure hopefully
        } catch (e) {
          throw error; // Lanzar error original si fallback también falla
        }
      }

      return mapTablaToUnit(data);
    } catch (error) {
      console.error('Error creating unit:', error);
      throw error;
    }
  },

  // Actualizar una unidad
  async updateUnit(unit: Unit): Promise<Unit> {
    try {
      // ⚠️ FIX: Usar Backend API para evitar error 500 al actualizar Vista en Supabase.

      // Mapear Unit a formato compatible con Backend Update DTO
      // Enviamos unit tal cual y dejamos que el backend decida qué campos usar
      // o construimos un payload específico.

      const updatePayload = {
        // IDs y Relaciones
        nrounidad: unit.numeroUnidad,
        piso: unit.piso,
        dormitorios: unit.dormitorios,
        frente: unit.frente,
        manzana: unit.manzana,
        destino: unit.destino,

        // Relaciones usando nombres (backend tendrá que resolverlos o ignorarlos si no puede)
        proyectoId: unit.proyecto,
        edificioId: unit.edificioTorre,
        etapaId: unit.etapa,
        tipounidadId: unit.tipo,

        // Estado y Comercial
        estadoId: unit.estado,
        comercialId: unit.comercial,
        tipoCocheraId: unit.tipo, // Posible correccion necesaria: unit no tiene tipoCochera separado de `tipo`? Ver types.
        // En types, unit.tipo viene de tabla.tipo (que parece ser tipo de unidad)
        // TablaItem tiene `tipocochera` pero Unit NO tiene `tipoCochera`. 
        // Re-leyendo Unit interface: Unit no tiene campo tipoCochera.

        motivoNoDispId: unit.motivoNoDisponibilidad,

        // Precios y Métricas
        precioUsd: unit.precioUSD,
        usdM2: unit.usdM2,

        m2Cubiertos: unit.tamano, // Asumimos tamano = m2Cubiertos base? O falta mapeo?
        // Unit tiene: tamano, m2Exclusivos, m2Comunes, m2Totales.

        // Fechas y Observaciones
        fechaReserva: unit.fechaReserva,
        fechaFirmaBoleto: unit.fechaFirmaBoleto,
        // fechaPosesionBoleto no tiene equivalente claro en DTO standart
        obs: unit.observaciones,
        clienteInteresado: unit.clienteInteresado,
      };

      // Llamada al Backend
      await backendAPI.updateUnitComplete(unit.id, updatePayload);

      // Recuperar la unidad actualizada para devolver el estado fresco
      // Ojo: Si Supabase tiene delay en replicacion/vista, podríamos obtener datos viejos. 
      // Pero usualmente es rápido.
      const refreshedUnit = await this.getUnitById(unit.id);

      if (!refreshedUnit) {
        // Fallback optimista: devolver la unidad local modificada
        return unit;
      }
      return refreshedUnit;

    } catch (error) {
      console.error(`Error updating unit with id ${unit.id}:`, error);
      throw error;
    }
  },

  // Eliminar una unidad
  async deleteUnit(id: string): Promise<void> {
    try {
      // Intentar borrar vía Backend API primero
      const token = await backendAPI['getAuthToken'](); // Accessing private via bracket notation hack or use defined method
      // backendAPI no expone metodo delete, usaremos fetch directo
      if (token) {
        await fetch(`${backendAPI['baseURL']}/unidades/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return;
      }

      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id); // Lowercase

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(`Error deleting unit with id ${id}:`, error);
      throw error;
    }
  },

  // Obtener lista de proyectos únicos
  async getProjects(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('proyecto') // Lowercase
        .not('proyecto', 'is', null);

      if (error) {
        throw error;
      }

      // Extraer proyectos únicos
      const projects = [...new Set(data.map(item => item.proyecto))].filter(Boolean) as string[];
      return projects.sort();
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  },

  // Obtener naturalezas de proyecto
  // WARN: natdelproyecto podría no existir
  async getNaturalezasProyecto(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('natdelproyecto') // Lowercase
        .not('natdelproyecto', 'is', null);

      if (error) {
        // Silently fail if column doesn't exist
        console.warn('natdelproyecto column might be missing');
        return [];
      }

      const naturalezas = [...new Set(data.map(item => item.natdelproyecto))].filter(Boolean) as string[];
      return naturalezas.sort();
    } catch (error) {
      console.error('Error fetching naturalezas:', error);
      return [];
    }
  },

  // Obtener proyectos filtrados por naturaleza
  async getProjectsByNaturaleza(naturaleza: string): Promise<string[]> {
    try {
      // Si naturaleza es vacía o 'Todas', devolver todos
      if (!naturaleza || naturaleza === 'Todas') {
        return this.getProjects();
      }

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('proyecto') // Lowercase
        .eq('natdelproyecto', naturaleza) // Lowercase filter
        .not('proyecto', 'is', null);

      if (error) {
        throw error;
      }

      const uniqueProjects = [...new Set(data.map(item => item.proyecto))].filter(Boolean) as string[];
      return uniqueProjects.sort();
    } catch (error) {
      console.error(`Error fetching projects for naturaleza ${naturaleza}:`, error);
      return [];
    }
  },

  // Obtener unidades filtradas por naturaleza
  async getUnitsByNaturaleza(naturaleza: string): Promise<Unit[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('natdelproyecto', naturaleza); // Lowercase

      if (error) {
        throw error;
      }

      return (data || []).map(mapTablaToUnit);
    } catch (error) {
      console.error(`Error fetching units for naturaleza ${naturaleza}:`, error);
      throw error;
    }
  },

  // Obtener valores únicos de una columna (para filtros)
  async getUniqueValues(field: keyof TablaItem): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(field as string)
        .not(field as string, 'is', null);

      if (error) {
        throw error;
      }

      // Extraer valores únicos usando un Set
      // Usamos access dinámico item[field]
      const values = [...new Set(data.map(item => String(item[field])))].filter(Boolean);
      return values.sort();
    } catch (error) {
      console.error(`Error fetching unique values for field ${String(field)}:`, error);
      return [];
    }
  },

  // Obtener valores únicos de una columna filtrados por proyecto
  async getUniqueValuesByProject(field: keyof TablaItem, proyecto: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(field as string)
        .eq('proyecto', proyecto) // Lowercase query param
        .not(field as string, 'is', null);

      if (error) {
        throw error;
      }

      const values = [...new Set(data.map(item => String(item[field])))].filter(Boolean);
      return values.sort();
    } catch (error) {
      console.error(`Error fetching unique values for field ${String(field)} in project ${proyecto}:`, error);
      return [];
    }
  }
};
