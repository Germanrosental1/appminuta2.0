// salesMapService.ts
import { backendAPI } from './backendAPI';
import { Unit, UnitStatus } from '@/types/sales-map';
import { apiGet, apiPatch, apiDelete } from '@/lib/api-wrapper-client';

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
// Using 'Unit' type which matches the UI expectations
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
  // else default 'Disponible'

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
    // Unit interface has these specific keys:
    m2Exclusivos: parseNum(metricas?.M2Exclusivo),
    m2PatioTerraza: parseNum(metricas?.M2PatioTerraza),
    patioTerraza: '', // Not explicitly in backend metrics
    m2Comunes: parseNum(metricas?.M2Comun),
    m2ParaCalculo: 0,
    m2Totales: parseNum(metricas?.M2Total),

    // These might not be on Unit interface but were on SalesMapItem?
    // Checking Unit interface from step 621:
    // id, natdelproyecto, proyecto, manzana, destino, sectorId, frente, etapa, tipo, numeroUnidad, edificioTorre, piso, dormitorios, tamano, m2PatioTerraza, patioTerraza, m2Exclusivos, m2Comunes, m2ParaCalculo, m2Totales, precioUSD, usdM2, estado, motivoNoDisponibilidad, observaciones, fechaReserva, comercial, clienteInteresado, fechaFirmaBoleto, clienteTitularBoleto, fechaPosesionBoleto

    // Sales Details
    precioUSD: parseNum(detalles?.PrecioUsd),
    usdM2: parseNum(detalles?.UsdM2),
    estado: estado,
    motivoNoDisponibilidad: detalles?.MotivoNoDispId || '',
    observaciones: detalles?.Obs || '',
    fechaReserva: detalles?.FechaReserva?.toString() || '',
    comercial: detalles?.ComercialId || '',
    clienteInteresado: detalles?.ClienteInteresado || '',
    fechaFirmaBoleto: '',
    clienteTitularBoleto: detalles?.Titular || '',
    fechaPosesionBoleto: ''
  };
};

export const salesMapService = {
  async getAll(): Promise<Unit[]> {
    try {
      const data = await apiGet<BackendUnit[]>('/unidades');
      return data.map(mapBackendToUnit);
    } catch (error) {
      console.error('Error fetching all units:', error);
      throw error;
    }
  },

  async getByProject(proyecto: string): Promise<Unit[]> {
    try {
      const data = await apiGet<BackendUnit[]>(`/unidades?proyecto=${encodeURIComponent(proyecto)}`);
      return data.map(mapBackendToUnit);
    } catch (error) {
      console.error(`Error fetching units for project ${proyecto}:`, error);
      throw error;
    }
  },

  async getById(id: string): Promise<Unit | null> {
    try {
      const data = await apiGet<BackendUnit>(`/unidades/${id}`);
      return data ? mapBackendToUnit(data) : null;
    } catch (error) {
      console.error(`Error fetching unit ${id}:`, error);
      return null;
    }
  },

  async update(id: string, item: Partial<Unit>): Promise<Unit> {
    try {
      const updateDto = {
        // Map fields that are editable to backend DTO structure
        preciousd: item.precioUSD,
        usdm2: item.usdM2,
        estadocomercial: item.estado,
        clienteinteresado: item.clienteInteresado,
        obs: item.observaciones,
        // Add others as needed matching UpdateUnidadCompleteDto
      };

      const res = await apiPatch<BackendUnit>(`/unidades/${id}/complete`, updateDto);
      return mapBackendToUnit(res);
    } catch (error) {
      console.error(`Error updating unit ${id}:`, error);
      throw error;
    }
  },

  // Map metadata endpoints
  async getProjects(): Promise<string[]> {
    const projects = await backendAPI.getMyProjects();
    return projects.map((p: any) => p.nombre);
  },

  async getNaturalezasProyecto(): Promise<string[]> {
    return apiGet<string[]>('/unidades/metadata/naturalezas');
  },

  async getProjectsByNaturaleza(): Promise<{ naturaleza: string, proyectos: string[] }[]> {
    const proyectos = await this.getProjects();
    return [{ naturaleza: 'Proyectos', proyectos }];
  },

  async create(item: any): Promise<Unit> {
    throw new Error('Not implemented directly in salesMapService');
  },

  async delete(id: string): Promise<void> {
    await apiDelete(`/unidades/${id}`);
  }
};
