// Definición de tipos basada en el esquema REAL detectado de vista_buscador_propiedades (lowercase)
export interface TablaItem {
  id: string | null;
  sectorid: string;
  proyecto: string | null;
  edificiotorre: string | null;
  tipo: string | null;
  etapa: string | null;
  nrounidad: string | null; // Note: DB returns "nrounidad"
  piso: string | null;
  dormitorios: string | null;
  frente: string | null;
  manzana: string | null; // Added from schema
  destino: string | null;
  tamano: string | null;
  m2cubiertos: number | null;
  m2semicubiertos: number | null; // Corrected from m2semicubiert
  m2exclusivos: string | null;
  m2patioterraza: number | null;
  patioterraza: string | null; // Added
  m2comunes: string | null;
  m2calculo: number | null; // Added
  m2totales: string | null;
  preciousd: string | null;
  usdm2: string | null;
  estado: string | null;
  motivonodisp: string | null;
  tipocochera: string | null;
  fechareserva: string | null;
  comercial: string | null;
  clienteinteresado: string | null; // Standardized to match schema if possible, or support both
  obs: string | null;

  // New fields from schema
  fechafirmaboleto: string | null;
  clientetitularboleto: string | null;
  fechaposesionporboletocompraventa: string | null;
  deptocomprador: string | null;
  proyecto_id: string | null;

  // Campos que podrían no estar en la vista según introspección, pero que dejamos por compatibilidad (serán undefined/null)
  idx?: number | null;
  titular?: string | null; // kept as fallback
  natdelproyecto?: string | null;

  // Legacy fields fallback (if view uses them)
  cliente_interesado?: string | null;
}

// Tipo para crear un nuevo registro (sin ID)
export type TablaInsert = Omit<TablaItem, 'id'>;

// Tipo para actualizar un registro (todos los campos opcionales excepto ID)
export type TablaUpdate = Partial<Omit<TablaItem, 'id'>> & { id: string };

// Mapeo de estados para la UI
export type EstadoUnidad = 'Disponible' | 'Reservado' | 'Vendido' | 'No disponible';

// Función para normalizar los estados
export function normalizeEstado(estado: string | null): EstadoUnidad {
  if (!estado) return 'Disponible';

  const estadoLower = estado.toLowerCase();

  if (estadoLower.includes('no disponible') || estadoLower.includes('alquil')) return 'No disponible';
  if (estadoLower.includes('disponible')) return 'Disponible';
  if (estadoLower.includes('reserva')) return 'Reservado';
  if (estadoLower.includes('vendid')) return 'Vendido';

  return 'No disponible';
};

// Mapeo entre el tipo de Supabase y el tipo de la UI (Frontend Unit, camelCase)
export function mapTablaToUnit(tabla: TablaItem): Unit {
  return {
    id: tabla.id || '',
    natdelproyecto: tabla.natdelproyecto || '',
    proyecto: tabla.proyecto || '',
    manzana: tabla.manzana || '',
    destino: tabla.destino || '',
    sectorId: tabla.sectorid,
    frente: tabla.frente || '',
    etapa: tabla.etapa || '',
    tipo: tabla.tipo || '',
    numeroUnidad: tabla.nrounidad || '',
    edificioTorre: tabla.edificiotorre || '',
    piso: tabla.piso || '',
    dormitorios: parseInt(tabla.dormitorios || '0'),
    tamano: parseFloat(tabla.tamano || '0'), // Usually m2Cubiertos
    m2Cubierto: tabla.m2cubiertos || 0, // Explicit m2Cubiertos if needed separately
    m2Semicubierto: tabla.m2semicubiertos || 0,
    m2PatioTerraza: tabla.m2patioterraza || 0,
    patioTerraza: tabla.patioterraza || '',
    m2Exclusivos: parseFloat(tabla.m2exclusivos || '0'),
    m2Comunes: parseFloat(tabla.m2comunes || '0'),
    m2ParaCalculo: tabla.m2calculo || 0,
    m2Totales: parseFloat(tabla.m2totales || '0'),
    precioUSD: parseFloat(tabla.preciousd || '0'),
    usdM2: parseFloat(tabla.usdm2 || '0'),
    estado: normalizeEstado(tabla.estado),
    motivoNoDisponibilidad: tabla.motivonodisp || '',
    observaciones: tabla.obs || '',
    fechaReserva: tabla.fechareserva || '',
    comercial: tabla.comercial || '',
    clienteInteresado: tabla.clienteinteresado || tabla.cliente_interesado || '',
    fechaFirmaBoleto: tabla.fechafirmaboleto || '',
    clienteTitularBoleto: tabla.clientetitularboleto || tabla.titular || '',
    fechaPosesionBoleto: tabla.fechaposesionporboletocompraventa || '',
    deptoComprador: tabla.deptocomprador || '',
  };
}

// Mapeo entre Unit (UI) -> Tabla (DB)
export function mapUnitToTabla(unit: Unit): TablaUpdate {
  return {
    id: unit.id,
    proyecto: unit.proyecto,
    manzana: unit.manzana,
    destino: unit.destino,
    sectorid: unit.sectorId,
    frente: unit.frente,
    etapa: unit.etapa,
    tipo: unit.tipo,
    nrounidad: unit.numeroUnidad,
    edificiotorre: unit.edificioTorre,
    piso: unit.piso,
    dormitorios: unit.dormitorios.toString(),
    tamano: unit.tamano.toString(),
    m2cubiertos: unit.m2Cubierto,
    m2semicubiertos: unit.m2Semicubierto,
    m2patioterraza: unit.m2PatioTerraza,
    patioterraza: unit.patioTerraza,
    m2exclusivos: unit.m2Exclusivos.toString(),
    m2comunes: unit.m2Comunes.toString(),
    m2calculo: unit.m2ParaCalculo,
    m2totales: unit.m2Totales.toString(),
    preciousd: unit.precioUSD.toString(),
    usdm2: unit.usdM2.toString(),
    estado: unit.estado,
    motivonodisp: unit.motivoNoDisponibilidad,
    obs: unit.observaciones,
    fechareserva: unit.fechaReserva,
    comercial: unit.comercial,
    clienteinteresado: unit.clienteInteresado,
    fechafirmaboleto: unit.fechaFirmaBoleto,
    clientetitularboleto: unit.clienteTitularBoleto,
    fechaposesionporboletocompraventa: unit.fechaPosesionBoleto,
    deptocomprador: unit.deptoComprador,
  };
}

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
  m2Cubierto: number; // Added to match map
  m2Semicubierto: number; // Added to match map
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
  deptoComprador: string;
}
