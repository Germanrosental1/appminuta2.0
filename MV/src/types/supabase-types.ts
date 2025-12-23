// Definición de tipos basada en el esquema de vista_buscador_propiedades
// NOTA: esta vista NO tiene natdelproyecto ni algunos otros campos de la tabla original
export interface TablaItem {
  id: string | null;
  idx: number | null;
  sectorid: string;
  proyecto: string | null;
  tipo: string | null;
  etapa: string | null;
  edificiotorre: string | null;
  nrounidad: string | null;
  piso: string | null;
  dormitorios: string | null;
  frente: string | null;
  destino: string | null;
  tamano: string | null;
  m2totales: string | null; // La vista devuelve string, no number
  m2cubiertos: number | null;
  m2semicubiert: number | null; // Nota: nombre acortado en la vista
  m2exclusivos: string | null; // La vista devuelve string
  m2patioterraza: number | null;
  m2comunes: string | null; // La vista devuelve string
  preciousd: string | null; // La vista devuelve string
  usdm2: string | null; // La vista devuelve string
  estado: string | null;
  motivonodisp: string | null;
  tipocochera: string | null;
  obs: string | null;
  fechareserva: string | null;
  comercial: string | null;
  clienteinteresado: string | null;
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

  if (estadoLower.includes('disponible')) return 'Disponible';
  if (estadoLower.includes('reserva')) return 'Reservado';
  if (estadoLower.includes('vendid')) return 'Vendido';
  if (estadoLower.includes('no disponible')) return 'No disponible';

  return 'Disponible'; // Estado por defecto
};

// Mapeo entre el tipo de Supabase y el tipo de la UI
export function mapTablaToUnit(tabla: TablaItem): Unit {
  return {
    id: tabla.id || '',
    natdelproyecto: '', // La vista no tiene este campo
    proyecto: tabla.proyecto || '',
    manzana: '', // La vista no tiene este campo
    destino: tabla.destino || '',
    sectorId: tabla.sectorid,
    frente: tabla.frente || '',
    etapa: tabla.etapa || '',
    tipo: tabla.tipo || '',
    numeroUnidad: tabla.nrounidad || '',
    edificioTorre: tabla.edificiotorre || '',
    piso: tabla.piso || '',
    dormitorios: parseInt(tabla.dormitorios || '0'),
    tamano: parseFloat(tabla.tamano || '0'),
    m2PatioTerraza: tabla.m2patioterraza || 0,
    patioTerraza: '', // La vista no tiene este campo
    m2Exclusivos: parseFloat(tabla.m2exclusivos || '0'),
    m2Comunes: parseFloat(tabla.m2comunes || '0'),
    m2ParaCalculo: 0, // La vista no tiene este campo
    m2Totales: parseFloat(tabla.m2totales || '0'),
    precioUSD: parseFloat(tabla.preciousd || '0'),
    usdM2: parseFloat(tabla.usdm2 || '0'),
    estado: normalizeEstado(tabla.estado),
    motivoNoDisponibilidad: tabla.motivonodisp || '',
    observaciones: tabla.obs || '',
    fechaReserva: tabla.fechareserva || '',
    comercial: tabla.comercial || '',
    clienteInteresado: tabla.clienteinteresado || '',
    fechaFirmaBoleto: '', // La vista no tiene este campo
    clienteTitularBoleto: '', // La vista no tiene este campo
    fechaPosesionBoleto: '', // La vista no tiene este campo
  };
}

// Mapeo entre el tipo de la UI y el tipo de Supabase (para escrituras)
// NOTA: Las vistas generalmente son de solo lectura
export function mapUnitToTabla(unit: Unit): TablaUpdate {
  return {
    id: unit.id,
    proyecto: unit.proyecto,
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
    m2patioterraza: unit.m2PatioTerraza,
    m2exclusivos: unit.m2Exclusivos.toString(),
    m2comunes: unit.m2Comunes.toString(),
    m2totales: unit.m2Totales.toString(),
    preciousd: unit.precioUSD.toString(),
    usdm2: unit.usdM2.toString(),
    estado: unit.estado,
    motivonodisp: unit.motivoNoDisponibilidad,
    obs: unit.observaciones,
    fechareserva: unit.fechaReserva,
    comercial: unit.comercial,
    clienteinteresado: unit.clienteInteresado,
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
