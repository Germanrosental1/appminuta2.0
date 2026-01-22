import { supabase } from '@/lib/supabase';
import { SalesMapItem } from '@/types';
import { TablaItem } from '@/types/supabase-types';

const TABLE_NAME = 'vista_buscador_propiedades';

const ParseFloatOrNull = (val: string | number | null): number | null => {
  if (val === null) return null;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? null : parsed;
};

// Mapper: DB (Lowercase/SnakeCase) -> Frontend (camelCase)
const mapDBToSalesMapItem = (db: TablaItem): SalesMapItem => {
  return {
    id: db.id || '',
    natdelproyecto: db.natdelproyecto || null,
    proyecto: db.proyecto || null,
    etapa: db.etapa || null,
    tipo: db.tipo || null,
    sectorid: db.sectorid || '',
    edificiotorre: db.edificiotorre || null,
    piso: db.piso || null,
    nrounidad: db.nrounidad || null,
    dormitorios: db.dormitorios || null,
    frente: db.frente || null,
    manzana: null, // No presente en TablaItem
    destino: db.destino || null,
    tipocochera: db.tipocochera || null,
    tamano: db.tamano || null,
    m2cubiertos: db.m2cubiertos || null,
    m2semicubiertos: db.m2semicubiert || null, // Note mapping name mismatch handled
    m2exclusivos: ParseFloatOrNull(db.m2exclusivos),
    m2patioterraza: db.m2patioterraza || null,
    patioterraza: null,
    m2comunes: ParseFloatOrNull(db.m2comunes),
    m2calculo: null,
    m2totales: ParseFloatOrNull(db.m2totales),
    preciousd: ParseFloatOrNull(db.preciousd),
    usdm2: ParseFloatOrNull(db.usdm2),
    estado: db.estado || null,
    motivono_disp: db.motivonodisp || null,
    obs: db.obs || null,
    fechareserva: db.fechareserva || null,
    comercial: db.comercial || null,
    clienteinteresado: db.cliente_interesado || null,
    fechafirmaboleto: null,
    clientetitularboleto: db.titular || null,
    fechaposesionporboletocompraventa: null,
    deptocomprador: null
  };
};

// Mapper: Frontend Partial (camelCase) -> DB Update (Lowercase)
const mapPartialToDB = (item: Partial<SalesMapItem>): any => {
  const db: any = {};

  if (item.id !== undefined) db.id = item.id;
  if (item.natdelproyecto !== undefined) db.natdelproyecto = item.natdelproyecto;
  if (item.proyecto !== undefined) db.proyecto = item.proyecto;
  if (item.etapa !== undefined) db.etapa = item.etapa;
  if (item.tipo !== undefined) db.tipo = item.tipo;
  if (item.sectorid !== undefined) db.sectorid = item.sectorid;
  if (item.edificiotorre !== undefined) db.edificiotorre = item.edificiotorre;
  if (item.piso !== undefined) db.piso = item.piso;
  if (item.nrounidad !== undefined) db.nrounidad = item.nrounidad;
  if (item.dormitorios !== undefined) db.dormitorios = item.dormitorios?.toString();
  if (item.frente !== undefined) db.frente = item.frente;
  if (item.destino !== undefined) db.destino = item.destino;
  if (item.tipocochera !== undefined) db.tipocochera = item.tipocochera;
  if (item.tamano !== undefined) db.tamano = item.tamano?.toString();
  if (item.m2cubiertos !== undefined) db.m2cubiertos = item.m2cubiertos; // number
  if (item.m2semicubiertos !== undefined) db.m2semicubiert = item.m2semicubiertos;
  if (item.m2exclusivos !== undefined) db.m2exclusivos = item.m2exclusivos?.toString();
  if (item.m2patioterraza !== undefined) db.m2patioterraza = item.m2patioterraza;
  if (item.m2comunes !== undefined) db.m2comunes = item.m2comunes?.toString();
  if (item.m2totales !== undefined) db.m2totales = item.m2totales?.toString();
  if (item.preciousd !== undefined) db.preciousd = item.preciousd?.toString();
  if (item.usdm2 !== undefined) db.usdm2 = item.usdm2?.toString();
  if (item.estado !== undefined) db.estado = item.estado;
  if (item.motivono_disp !== undefined) db.motivonodisp = item.motivono_disp;
  if (item.obs !== undefined) db.obs = item.obs;
  if (item.fechareserva !== undefined) db.fechareserva = item.fechareserva;
  if (item.comercial !== undefined) db.comercial = item.comercial;
  if (item.clienteinteresado !== undefined) db.cliente_interesado = item.clienteinteresado; // map back to snake
  if (item.clientetitularboleto !== undefined) db.titular = item.clientetitularboleto;

  return db;
};

export const salesMapService = {
  async getAll(): Promise<SalesMapItem[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*');

    if (error) {
      console.error('Error fetching sales map data:', error);
      throw error;
    }

    return (data as unknown as TablaItem[])?.map(mapDBToSalesMapItem) || [];
  },

  async getById(id: string): Promise<SalesMapItem | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id) // Lowercase
      .single();

    if (error) {
      console.error(`Error fetching sales map item with id ${id}:`, error);
      throw error;
    }

    return data ? mapDBToSalesMapItem(data as unknown as TablaItem) : null;
  },

  async update(id: string, item: Partial<SalesMapItem>): Promise<SalesMapItem> {
    const dbItem = mapPartialToDB(item);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(dbItem)
      .eq('id', id) // Lowercase
      .select()
      .single();

    if (error) {
      console.error(`Error updating sales map item with id ${id}:`, error);
      throw error;
    }

    return mapDBToSalesMapItem(data as unknown as TablaItem);
  },

  async create(item: Omit<SalesMapItem, 'id'>): Promise<SalesMapItem> {
    const dbItem = mapPartialToDB(item as Partial<SalesMapItem>);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([dbItem])
      .select()
      .single();

    if (error) {
      console.error('Error creating sales map item:', error);
      throw error;
    }

    return mapDBToSalesMapItem(data as unknown as TablaItem);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id); // Lowercase

    if (error) {
      console.error(`Error deleting sales map item with id ${id}:`, error);
      throw error;
    }
  },

  async getByProject(proyecto: string): Promise<SalesMapItem[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('proyecto', proyecto); // Lowercase

    if (error) {
      console.error(`Error fetching sales map items for project ${proyecto}:`, error);
      throw error;
    }

    return (data as unknown as TablaItem[])?.map(mapDBToSalesMapItem) || [];
  }
};
