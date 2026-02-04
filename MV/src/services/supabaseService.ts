import { backendAPI } from './backendAPI';
import { Unit, UnitStatus } from '@/types/sales-map';
import { apiGet, apiDelete } from '@/lib/api-wrapper-client';

// Interface matching the nested structure returned by NestJS UnidadesService
interface BackendUnit {
  Id: string;
  SectorId: string;
  Piso: string;
  NroUnidad: string;
  Dormitorio: string; // Service might return number or string
  Manzana?: string;
  Destino?: string;
  Frente?: string;
  Edificios?: {
    NombreEdificio: string;
    Proyectos?: { Nombre: string; Naturaleza?: string };
  };
  Etapas?: { Nombre: string; };
  TiposUnidad?: { Nombre: string; };
  UnidadesMetricas?: {
    M2Exclusivo?: number;
    M2Total?: number;
    M2Comun?: number;
    M2PatioTerraza?: number;
    Tamano?: string;
    M2Cubierto?: number;
    M2Semicubierto?: number;
  };
  DetallesVenta_DetallesVenta_UnidadIdToUnidades?: {
    PrecioUsd?: number;
    UsdM2?: number;
    EstadoComercial?: { NombreEstado: string; };
    ComercialId?: string;
    MotivoNoDispId?: string;
    Obs?: string;
    FechaReserva?: string;
    ClienteInteresado?: string;
    Titular?: string;
    MotivosNoDisp?: { Nombre: string; };
    Comerciales?: { Nombre: string; };
  };
}

// Helper to parse numbers safely
const parseNum = (val: string | number | undefined | null): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const parsed = Number.parseFloat(val);
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Mapper: BackendUnit (Nested) -> Unit (Flat)
const mapBackendToUnit = (backend: BackendUnit): Unit => {
  const detalles = backend.DetallesVenta_DetallesVenta_UnidadIdToUnidades;
  const metricas = backend.UnidadesMetricas;
  const edificio = backend.Edificios;
  const proyecto = edificio?.Proyectos;

  // Map Backend state string to UnitStatus
  const rawState = detalles?.EstadoComercial?.NombreEstado || 'Disponible';
  let estado: UnitStatus = 'Disponible';

  const stateLower = rawState.toLowerCase();
  if (stateLower.includes('no dispon') || stateLower.includes('alquil')) estado = 'No disponible';
  else if (stateLower.includes('vend')) estado = 'Vendido';
  else if (stateLower.includes('reserv')) estado = 'Reservado';

  return {
    id: backend.Id,
    natdelproyecto: proyecto?.Naturaleza || '',
    proyecto: proyecto?.Nombre || '',
    manzana: backend.Manzana || '',
    etapa: backend.Etapas?.Nombre || '',
    tipo: backend.TiposUnidad?.Nombre || '',
    sectorId: backend.SectorId || '',
    edificioTorre: edificio?.NombreEdificio || '',
    piso: backend.Piso || '',
    numeroUnidad: backend.NroUnidad || '',
    dormitorios: parseNum(backend.Dormitorio),
    frente: backend.Frente || '',
    destino: backend.Destino || '',

    // Metrics
    tamano: parseNum(metricas?.Tamano),
    m2Exclusivos: parseNum(metricas?.M2Exclusivo),
    m2PatioTerraza: parseNum(metricas?.M2PatioTerraza),
    patioTerraza: '', // Not in backend metrics
    m2Comunes: parseNum(metricas?.M2Comun),
    m2ParaCalculo: 0,
    m2Totales: parseNum(metricas?.M2Total),

    // Sales Details
    precioUSD: parseNum(detalles?.PrecioUsd),
    usdM2: parseNum(detalles?.UsdM2),
    estado: estado,
    motivoNoDisponibilidad: detalles?.MotivosNoDisp?.Nombre || detalles?.MotivoNoDispId || '',
    observaciones: detalles?.Obs || '',
    fechaReserva: detalles?.FechaReserva?.toString() || '',
    comercial: detalles?.Comerciales?.Nombre || detalles?.ComercialId || '',
    clienteInteresado: detalles?.ClienteInteresado || '',
    fechaFirmaBoleto: '',
    clienteTitularBoleto: detalles?.Titular || '',
    fechaPosesionBoleto: ''
  };
};

export const supabaseService = {
  /**
   * Obtiene todas las unidades via Backend API
   */
  async getAllUnits(): Promise<Unit[]> {
    try {
      // Send estado=all to bypass backend default filtering (which defaults to 'Available')
      const data = await backendAPI.apiGet<BackendUnit[]>('/unidades?estado=all');
      return data.map(mapBackendToUnit);
    } catch (error) {
      console.error('Error fetching all units:', error);
      throw error;
    }
  },

  /**
   * Obtiene unidades filtradas por proyecto via Backend API
   */
  async getUnitsByProject(proyecto: string): Promise<Unit[]> {
    try {
      // Send estado=all to bypass backend default filtering
      const data = await backendAPI.apiGet<BackendUnit[]>(`/unidades?proyecto=${encodeURIComponent(proyecto)}&estado=all`);
      return data.map(mapBackendToUnit);
    } catch (error) {
      console.error(`Error fetching units for project ${proyecto}:`, error);
      throw error;
    }
  },

  /**
   * Obtiene una unidad por su ID via Backend API
   */
  async getUnitById(id: string): Promise<Unit | null> {
    try {
      const data = await apiGet<BackendUnit>(`/unidades/${id}`);
      return data ? mapBackendToUnit(data) : null;
    } catch (error) {
      console.error(`Error fetching unit with id ${id}:`, error);
      // Backend throws 404, we catch it
      return null;
    }
  },

  /**
   * Actualiza una unidad existente via backend API
   */
  async updateUnit(unit: Unit): Promise<Unit> {
    try {
      const backendData = {
        // Map Unit fields back to Update DTO expected by backend
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

        // Estado must be mapped back
        estadocomercial: unit.estado,
      };

      await backendAPI.updateUnitComplete(unit.id, backendData);
      return unit;
    } catch (error) {
      console.error('Error updating unit:', error);
      throw error;
    }
  },

  /**
   * Crea una nueva unidad completa via Backend API
   */
  async createUnit(unit: Omit<Unit, 'id'>): Promise<Unit> {
    try {
      // Reuse logic from previous implementation but ensure it goes through backendAPI
      const backendData = {
        sectorid: unit.sectorId,
        tipounidad_id: unit.tipo,
        edificio_id: unit.edificioTorre,
        etapa_id: unit.etapa,
        piso: unit.piso,
        nrounidad: unit.numeroUnidad,
        dormitorios: unit.dormitorios,
        manzana: unit.manzana,
        destino: unit.destino,
        frente: unit.frente,
        m2exclusivos: unit.m2Exclusivos,
        m2totales: unit.m2Totales,
        m2comunes: unit.m2Comunes,
        m2patioterraza: unit.m2PatioTerraza,
        tamano: String(unit.tamano || 0),
        preciousd: unit.precioUSD,
        usdm2: unit.usdM2,
        clienteinteresado: unit.clienteInteresado,
        obs: unit.observaciones,
        fechareserva: unit.fechaReserva,
        estadocomercial: unit.estado,
        comercial: unit.comercial
      };

      const res = await backendAPI.createUnitComplete(backendData) as any;
      // The backend returns the created unit, we need to map it back if it matches BackendUnit
      // Assuming createUnitComplete returns the created BackendUnit
      return mapBackendToUnit(res);
    } catch (error) {
      console.error('Error creating unit:', error);
      throw error;
    }
  },

  /**
   * Elimina una unidad por su ID via Backend API
   */
  async deleteUnit(id: string): Promise<void> {
    try {
      await apiDelete(`/unidades/${id}`);
    } catch (error) {
      console.error('Error deleting unit:', error);
      throw error;
    }
  },

  /**
   * Obtiene todos los proyectos únicos via Backend API
   */
  async getProjects(): Promise<string[]> {
    try {
      // Use getMyProjects to get allowed projects
      const projects = await backendAPI.getMyProjects();
      return projects.map((p: any) => p.nombre);
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  },

  /**
   * Obtiene información de proyecto por nombre usando backend API
   */
  async getProjectByName(projectName: string): Promise<{ Id: string; id: string; Nombre?: string } | null> {
    try {
      const result = await backendAPI.getProjectByName(projectName);
      return result;
    } catch (error) {
      console.error(`Error fetching project by name ${projectName}:`, error);
      return null;
    }
  },

  /**
   * Obtiene todas las naturalezas de proyecto únicas
   */
  async getNaturalezasProyecto(): Promise<string[]> {
    try {
      return await apiGet<string[]>('/unidades/metadata/naturalezas');
    } catch (error) { return []; }
  },

  /**
   * Obtiene proyectos agrupados por naturaleza
   */
  async getProjectsByNaturaleza(): Promise<{ naturaleza: string, proyectos: string[] }[]> {
    try {
      const proyectos = await this.getProjects();
      return [{ naturaleza: 'Proyectos', proyectos }];
    } catch (error) { return []; }
  },

  // Fallbacks/Legacy methods
  async getUniqueValues(field: string): Promise<string[]> { return []; },
  async getUniqueValuesByProject(field: string, proyecto: string): Promise<string[]> { return []; },
  async getUnitsByNaturaleza(naturaleza: string): Promise<Unit[]> { return this.getAllUnits(); }
};
