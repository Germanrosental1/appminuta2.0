// Definición de tipos basada en el esquema de vista_buscador_propiedades (PascalCase)
export interface TablaItem {
  Id: string | null;
  Idx: number | null;
  SectorId: string;
  Proyecto: string | null;
  Tipo: string | null;
  Etapa: string | null;
  EdificioTorre: string | null;
  NroUnidad: string | null;
  Piso: string | null;
  Dormitorios: string | null;
  Frente: string | null;
  Destino: string | null;
  Tamano: string | null;
  M2Totales: string | null;
  M2Cubiertos: number | null;
  M2Semicubiert: number | null;
  M2Exclusivos: string | null;
  M2PatioTerraza: number | null;
  M2Comunes: string | null;
  PrecioUsd: string | null;
  UsdM2: string | null;
  Estado: string | null;
  MotivoNoDisp: string | null;
  TipoCochera: string | null;
  Obs: string | null;
  FechaReserva: string | null;
  Comercial: string | null;
  ClienteInteresado: string | null;
  Titular: string | null;
}

// Tipo para crear un nuevo registro (sin ID)
export type TablaInsert = Omit<TablaItem, 'Id'>;

// Tipo para actualizar un registro (todos los campos opcionales excepto ID)
export type TablaUpdate = Partial<Omit<TablaItem, 'Id'>> & { Id: string };

// Mapeo de estados para la UI
export type EstadoUnidad = 'Disponible' | 'Reservado' | 'Vendido' | 'No disponible';

// Función para normalizar los estados
export function normalizeEstado(estado: string | null): EstadoUnidad {
  if (!estado) return 'Disponible';

  const estadoLower = estado.toLowerCase();

  // IMPORTANTE: Verificar "no disponible" ANTES de "disponible" 
  // porque "no disponible" contiene "disponible"
  if (estadoLower.includes('no disponible') || estadoLower.includes('alquil')) return 'No disponible';
  if (estadoLower.includes('disponible')) return 'Disponible';
  if (estadoLower.includes('reserva')) return 'Reservado';
  if (estadoLower.includes('vendid')) return 'Vendido';

  return 'No disponible'; // Estado por defecto para estados desconocidos
}

// Mapeo entre el tipo de Supabase (PascalCase) y el tipo de la UI
export function mapTablaToUnit(tabla: TablaItem): Unit {
  return {
    id: tabla.Id || '',
    natdelproyecto: '', // La vista no tiene este campo
    proyecto: tabla.Proyecto || '',
    manzana: '', // La vista no tiene este campo
    destino: tabla.Destino || '',
    sectorId: tabla.SectorId || '',
    frente: tabla.Frente || '',
    etapa: tabla.Etapa || '',
    tipo: tabla.Tipo || '',
    numeroUnidad: tabla.NroUnidad || '',
    edificioTorre: tabla.EdificioTorre || '',
    piso: tabla.Piso || '',
    dormitorios: Number.parseInt(tabla.Dormitorios || '0'),
    tamano: Number.parseFloat(tabla.Tamano || '0'),
    m2PatioTerraza: tabla.M2PatioTerraza || 0,
    patioTerraza: '', // La vista no tiene este campo
    m2Exclusivos: Number.parseFloat(tabla.M2Exclusivos || '0'),
    m2Comunes: Number.parseFloat(tabla.M2Comunes || '0'),
    m2ParaCalculo: 0, // La vista no tiene este campo
    m2Totales: Number.parseFloat(tabla.M2Totales || '0'),
    precioUSD: Number.parseFloat(tabla.PrecioUsd || '0'),
    usdM2: Number.parseFloat(tabla.UsdM2 || '0'),
    estado: normalizeEstado(tabla.Estado),
    motivoNoDisponibilidad: tabla.MotivoNoDisp || '',
    observaciones: tabla.Obs || '',
    fechaReserva: tabla.FechaReserva || '',
    comercial: tabla.Comercial || '',
    clienteInteresado: tabla.ClienteInteresado || '',
    fechaFirmaBoleto: '', // La vista no tiene este campo
    clienteTitularBoleto: tabla.Titular || '',
    fechaPosesionBoleto: '', // La vista no tiene este campo
  };
}

// Mapeo entre el tipo de la UI y el tipo de Supabase (para escrituras)
// NOTA: Las vistas generalmente son de solo lectura
export function mapUnitToTabla(unit: Unit): TablaUpdate {
  return {
    Id: unit.id,
    Proyecto: unit.proyecto,
    Destino: unit.destino,
    SectorId: unit.sectorId,
    Frente: unit.frente,
    Etapa: unit.etapa,
    Tipo: unit.tipo,
    NroUnidad: unit.numeroUnidad,
    EdificioTorre: unit.edificioTorre,
    Piso: unit.piso,
    Dormitorios: unit.dormitorios.toString(),
    Tamano: unit.tamano.toString(),
    M2PatioTerraza: unit.m2PatioTerraza,
    M2Exclusivos: unit.m2Exclusivos.toString(),
    M2Comunes: unit.m2Comunes.toString(),
    M2Totales: unit.m2Totales.toString(),
    PrecioUsd: unit.precioUSD.toString(),
    UsdM2: unit.usdM2.toString(),
    Estado: unit.estado,
    MotivoNoDisp: unit.motivoNoDisponibilidad,
    Obs: unit.observaciones,
    FechaReserva: unit.fechaReserva,
    Comercial: unit.comercial,
    ClienteInteresado: unit.clienteInteresado,
    Titular: unit.clienteTitularBoleto,
  };
}

// Re-exportamos el tipo Unit para mantener la compatibilidad
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
  estado: EstadoUnidad;
  motivoNoDisponibilidad: string;
  observaciones: string;
  fechaReserva: string;
  comercial: string;
  clienteInteresado: string;
  fechaFirmaBoleto: string;
  clienteTitularBoleto: string;
  fechaPosesionBoleto: string;
}
