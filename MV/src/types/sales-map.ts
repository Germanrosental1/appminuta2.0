export type UnitStatus = 'Disponible' | 'Reservado' | 'Vendido' | 'No disponible';

export type UserRole = 'Super Admin' | 'Editor' | 'Visitante' | 'Sin acceso';

export interface Unit {
  id: string;
  natdelproyecto: string;
  proyecto: string;
  manzana: string;
  destino: string;
  sectorId: string;
  frente: string;
  etapa: string;
  tipo: string;
  numeroUnidad: string;
  edificioTorre: string;
  piso: string;
  dormitorios: number;
  tamano: number;
  m2PatioTerraza: number;
  patioTerraza: string;
  m2Exclusivos: number;
  m2Comunes: number;
  m2ParaCalculo: number;
  m2Totales: number;
  precioUSD: number;
  usdM2: number;
  estado: UnitStatus;
  motivoNoDisponibilidad: string;
  observaciones: string;
  fechaReserva: string;
  comercial: string;
  clienteInteresado: string;
  fechaFirmaBoleto: string;
  clienteTitularBoleto: string;
  fechaPosesionBoleto: string;
}

export interface SalesMap {
  id: string;
  name: string;
  units: Unit[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPermission {
  userId: string;
  userName: string;
  userEmail: string;
  role: UserRole;
  mapId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UnitFilters {
  search: string;
  proyecto: string;
  manzana: string;
  etapa: string;
  tipo: string;
  dormitorios: string;
  estado: string;
  comercial: string;
  precioMin: string;
  precioMax: string;
}
