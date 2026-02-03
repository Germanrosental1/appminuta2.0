import { supabase } from '@/lib/supabase';
import { SalesMapItem } from '@/types';
import { TablaItem } from '@/types/supabase-types';

const TABLE_NAME = 'vista_buscador_propiedades';

const ParseFloatOrNull = (val: string | number | null): number | null => {
  if (val === null) return null;
  if (typeof val === 'number') return val;
  const parsed = Number.parseFloat(val);
  return Number.isNaN(parsed) ? null : parsed;
};

// Mapper: DB (PascalCase from TablaItem) -> Frontend (camelCase)
const mapDBToSalesMapItem = (db: TablaItem): SalesMapItem => {
  return {
    id: db.Id || '',
    natdelproyecto: (db as any).natdelproyecto || null, // Keeping as is if not in TablaItem
    proyecto: db.Proyecto || null,
    etapa: db.Etapa || null,
    tipo: db.Tipo || null,
    sectorid: db.SectorId || '',
    edificiotorre: db.EdificioTorre || null,
    piso: db.Piso || null,
    nrounidad: db.NroUnidad || null,
    dormitorios: db.Dormitorios || null,
    frente: db.Frente || null,
    manzana: null,
    destino: db.Destino || null,
    tipocochera: db.TipoCochera || null,
    tamano: db.Tamano || null,
    m2cubiertos: db.M2Cubiertos || null,
    m2semicubiertos: db.M2Semicubiert || null,
    m2exclusivos: ParseFloatOrNull(db.M2Exclusivos),
    m2patioterraza: db.M2PatioTerraza || null,
    patioterraza: null,
    m2comunes: ParseFloatOrNull(db.M2Comunes),
    m2calculo: null,
    m2totales: ParseFloatOrNull(db.M2Totales),
    preciousd: ParseFloatOrNull(db.PrecioUsd),
    usdm2: ParseFloatOrNull(db.UsdM2),
    estado: db.Estado || null,
    motivono_disp: db.MotivoNoDisp || null,
    obs: db.Obs || null,
    fechareserva: db.FechaReserva || null,
    comercial: db.Comercial || null,
    clienteinteresado: db.ClienteInteresado || null,
    fechafirmaboleto: null,
    clientetitularboleto: db.Titular || null,
    fechaposesionporboletocompraventa: null,
    deptocomprador: null
  };
};

// Mapper: Frontend Partial (camelCase) -> DB Update (PascalCase to match TablaItem/Supabase expectation for the view)
const mapPartialToDB = (item: Partial<SalesMapItem>): any => {
  const db: any = {};

  if (item.id !== undefined) db.Id = item.id;
  if (item.natdelproyecto !== undefined) db.natdelproyecto = item.natdelproyecto;
  if (item.proyecto !== undefined) db.Proyecto = item.proyecto;
  if (item.etapa !== undefined) db.Etapa = item.etapa;
  if (item.tipo !== undefined) db.Tipo = item.tipo;
  if (item.sectorid !== undefined) db.SectorId = item.sectorid;
  if (item.edificiotorre !== undefined) db.EdificioTorre = item.edificiotorre;
  if (item.piso !== undefined) db.Piso = item.piso;
  if (item.nrounidad !== undefined) db.NroUnidad = item.nrounidad;
  if (item.dormitorios !== undefined) db.Dormitorios = item.dormitorios?.toString();
  if (item.frente !== undefined) db.Frente = item.frente;
  if (item.destino !== undefined) db.Destino = item.destino;
  if (item.tipocochera !== undefined) db.TipoCochera = item.tipocochera;
  if (item.tamano !== undefined) db.Tamano = item.tamano?.toString();
  if (item.m2cubiertos !== undefined) db.M2Cubiertos = item.m2cubiertos;
  if (item.m2semicubiertos !== undefined) db.M2Semicubiert = item.m2semicubiertos;
  if (item.m2exclusivos !== undefined) db.M2Exclusivos = item.m2exclusivos?.toString();
  if (item.m2patioterraza !== undefined) db.M2PatioTerraza = item.m2patioterraza;
  if (item.m2comunes !== undefined) db.M2Comunes = item.m2comunes?.toString();
  if (item.m2totales !== undefined) db.M2Totales = item.m2totales?.toString();
  if (item.preciousd !== undefined) db.PrecioUsd = item.preciousd?.toString();
  if (item.usdm2 !== undefined) db.UsdM2 = item.usdm2?.toString();
  if (item.estado !== undefined) db.Estado = item.estado;
  if (item.motivono_disp !== undefined) db.MotivoNoDisp = item.motivono_disp;
  if (item.obs !== undefined) db.Obs = item.obs;
  if (item.fechareserva !== undefined) db.FechaReserva = item.fechareserva;
  if (item.comercial !== undefined) db.Comercial = item.comercial;
  if (item.clienteinteresado !== undefined) db.ClienteInteresado = item.clienteinteresado;
  if (item.clientetitularboleto !== undefined) db.Titular = item.clientetitularboleto;

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
      .eq('Id', id)
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
      .eq('Id', id)
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
      .eq('Id', id);

    if (error) {
      console.error(`Error deleting sales map item with id ${id}:`, error);
      throw error;
    }
  },

  async getByProject(proyecto: string): Promise<SalesMapItem[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('Proyecto', proyecto);

    if (error) {
      console.error(`Error fetching sales map items for project ${proyecto}:`, error);
      throw error;
    }

    return (data as unknown as TablaItem[])?.map(mapDBToSalesMapItem) || [];
  }
};
