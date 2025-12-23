export type ModoA = "porcentaje" | "importe";
export type Moneda = "USD" | "ARS" | "MIX";
export type Frecuencia = "mensual" | "trimestral";
export type FormatoSalida = "PDF" | "XLSX";
export type TcFuente = "MEP" | "BNA" | "Acordado" | "Otro";
export type TipoPago = "contado" | "financiado";
export type FormaPago = "Firma de Boleto" | "Fecha Posesión A" | "Fecha Posesión B" | "Financiado A" | "Financiado B" | "Bonificado" | "-";
export type PeriodicidadCuota = "Mensual" | "Trimestral" | "Semestral" | "Anual" | "Pago Único";
export type TipoDescuento = "porcentaje" | "importe" | "ninguno";
export type TipoUnidad = "Departamento" | "Cochera" | "Baulera" | "Local" | "Nave";

// Interfaz para cualquier tipo de unidad seleccionada
export interface UnidadSeleccionada {
  id: string;
  tipo: TipoUnidad;
  descripcion: string;
  proyecto: string;
  etapa: string;
  sector: string;
  precioLista: number;
  precioNegociado: number;
  tipoDescuento: TipoDescuento;
  valorDescuento: number;
}

// Mantenemos estas interfaces para compatibilidad con código existente
export interface CocheraData {
  precioLista: number;
  precioNegociado: number;
}

export interface BauleraData {
  precioLista: number;
  precioNegociado: number;
}

export interface ReglaFinanciacion {
  id: string;
  moneda: Moneda;
  saldoFinanciar: number;
  numCuotas: number;
  periodicidad: PeriodicidadCuota;
  importeCuota: number;
  primerVencimiento: string;
  ultimoVencimiento: string;
  valorBien: string;
  cargo: string;
  porcentajeDeudaTotal: number;
  porcentajeDeudaParte: number; // Porcentaje de la deuda A o B
  activa: boolean;
}

export interface WizardData {
  // Paso 1: Proyecto & Unidad
  proyecto: string;
  unidad: string;        // Para mantener compatibilidad con código existente
  unidadDescripcion: string; // Para mantener compatibilidad con código existente
  fechaPosesion: string;

  // Nueva estructura para múltiples unidades
  unidades: UnidadSeleccionada[];

  // Paso 2: Datos comerciales
  precioLista: number;   // Para mantener compatibilidad con código existente
  precioNegociado: number; // Para mantener compatibilidad con código existente
  tipoDescuento: TipoDescuento; // Para mantener compatibilidad con código existente
  valorDescuento: number; // Para mantener compatibilidad con código existente
  cocheras: CocheraData[]; // Para mantener compatibilidad con código existente
  baulera: BauleraData | null; // Para mantener compatibilidad con código existente

  // Paso 3: Composición A/B y monedas
  modoA: ModoA;
  porcA: number;
  impA: number;
  monedaA: Moneda;
  monedaB: Moneda;

  // Paso 4: Composición del financiamiento
  tipoPago: TipoPago;
  tcFuente: TcFuente;
  tcValor: number;
  valorArsConIVA: number;
  valorUsdConIVA: number;
  // Anticipos originales (para compatibilidad)
  anticipoArs: number;
  anticipoUsd: number;
  // Nuevos anticipos separados por moneda y parte
  anticipoArsA: number;
  anticipoUsdA: number;
  anticipoArsB: number;
  anticipoUsdB: number;
  totalFinanciarArs: number;
  totalFinanciarUsd: number;
  fechaFirmaBoleto: string;
  fechaBaseCAC: string;

  // Paso 5: Cargos, extras y comisiones
  certificacionFirmas: number;
  certificacionFirmasPago: FormaPago;
  selladoPorcentaje: number;
  selladoMonto: number;
  selladoPago: FormaPago;
  alhajamiemtoPorcentaje: number;
  alhajamiemtoMonto: number;
  alhajamiemtoPago: FormaPago;
  planosUnidadValorM2: number;
  planosUnidadM2: number;
  planosUnidadMonto: number;
  planosUnidadPago: FormaPago;
  planosCocheraValor: number;
  planosCocheraMonto: number;
  planosCocheraPago: FormaPago;
  otrosGastos: number;
  otrosGastosPago: FormaPago;
  totalCargosArs: number;
  totalCargosUsd: number;

  // Paso 6: Reglas de financiación
  reglasFinanciacionA: ReglaFinanciacion[];
  reglasFinanciacionB: ReglaFinanciacion[];
  porcentajePagadoFechaPosesion: number;

  // Cliente interesado
  clienteInteresado?: {
    dni: number;
    nombreApellido: string;
    telefono?: string;
  };

  // Paso 7: Tipo de cambio & salida
  dolarRef: number;
  formatoSalida: FormatoSalida;
}

export const initialWizardData: WizardData = {
  proyecto: "",
  unidad: "",
  unidadDescripcion: "",
  fechaPosesion: "",
  unidades: [], // Nueva estructura para múltiples unidades
  precioLista: 0,
  precioNegociado: 0,
  tipoDescuento: "ninguno",
  valorDescuento: 0,
  cocheras: [],
  baulera: null,
  modoA: "porcentaje",
  porcA: 50,
  impA: 0,
  monedaA: "USD",
  monedaB: "ARS",
  tipoPago: "contado",
  tcFuente: "MEP",
  tcValor: 0,
  valorArsConIVA: 0,
  valorUsdConIVA: 0,
  anticipoArs: 0,
  anticipoUsd: 0,
  anticipoArsA: 0,
  anticipoUsdA: 0,
  anticipoArsB: 0,
  anticipoUsdB: 0,
  totalFinanciarArs: 0,
  totalFinanciarUsd: 0,
  fechaFirmaBoleto: "",
  fechaBaseCAC: "",
  certificacionFirmas: 80000,
  certificacionFirmasPago: "Firma de Boleto",
  selladoPorcentaje: 0.5,
  selladoMonto: 0,
  selladoPago: "Firma de Boleto",
  alhajamiemtoPorcentaje: 2,
  alhajamiemtoMonto: 0,
  alhajamiemtoPago: "Fecha Posesión A",
  planosUnidadValorM2: 8,
  planosUnidadM2: 0,
  planosUnidadMonto: 0,
  planosUnidadPago: "Fecha Posesión A",
  planosCocheraValor: 100,
  planosCocheraMonto: 0,
  planosCocheraPago: "-",
  otrosGastos: 0,
  otrosGastosPago: "-",
  totalCargosArs: 0,
  totalCargosUsd: 0,
  reglasFinanciacionA: [],
  reglasFinanciacionB: [],
  porcentajePagadoFechaPosesion: 85,
  dolarRef: 0,
  formatoSalida: "PDF",
};

export interface GeneratedFile {
  blob: Blob;
  filename: string;
  contentType: string;
}
