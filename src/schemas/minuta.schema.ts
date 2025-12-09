import { z } from 'zod';

// ============================================
// SCHEMAS REUTILIZABLES
// ============================================

export const uuidSchema = z.string().uuid('ID inválido');

export const emailSchema = z.string()
  .email('Email inválido')
  .max(254, 'Email muy largo');

export const phoneSchema = z.string().regex(
  /^\+?56\s?9\s?\d{4}\s?\d{4}$/,
  'Formato de teléfono inválido (+56 9 XXXX XXXX)'
);

export const rutSchema = z.string().regex(
  /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/,
  'Formato de RUT inválido (XX.XXX.XXX-X)'
);

export const positiveNumberSchema = z.number()
  .nonnegative('El valor debe ser positivo o cero')
  .finite('El valor debe ser un número válido');

export const priceSchema = z.number()
  .positive('El precio debe ser positivo')
  .max(10_000_000_000, 'Precio excede límite máximo')
  .finite('Precio debe ser un número válido');

export const percentageSchema = z.number()
  .min(0, 'El porcentaje no puede ser negativo')
  .max(100, 'El porcentaje no puede exceder 100%')
  .finite('El porcentaje debe ser un número válido');

// ============================================
// ENUMS Y TIPOS
// ============================================

export const MonedaEnum = z.enum(['USD', 'ARS', 'MIX', 'CLP', 'UF'], {
  errorMap: () => ({ message: 'Moneda inválida' })
});

export const EstadoMinutaEnum = z.enum(['borrador', 'pendiente', 'aprobada', 'rechazada', 'firmada', 'cancelada'], {
  errorMap: () => ({ message: 'Estado inválido' })
});

export const TipoDescuentoEnum = z.enum(['porcentaje', 'importe', 'ninguno'], {
  errorMap: () => ({ message: 'Tipo de descuento inválido' })
});

export const TipoPagoEnum = z.enum(['contado', 'financiado'], {
  errorMap: () => ({ message: 'Tipo de pago inválido' })
});

export const FormaPagoEnum = z.enum([
  'Firma de Boleto',
  'Fecha Posesión A',
  'Fecha Posesión B',
  'Financiado A',
  'Financiado B',
  'Bonificado',
  '-'
], {
  errorMap: () => ({ message: 'Forma de pago inválida' })
});

export const PeriodicidadCuotaEnum = z.enum([
  'Mensual',
  'Trimestral',
  'Semestral',
  'Anual',
  'Pago Único'
], {
  errorMap: () => ({ message: 'Periodicidad de cuota inválida' })
});

export const TipoUnidadEnum = z.enum([
  'Departamento',
  'Cochera',
  'Baulera',
  'Local',
  'Nave'
], {
  errorMap: () => ({ message: 'Tipo de unidad inválido' })
});

// ============================================
// SCHEMAS DE SUB-OBJETOS
// ============================================

// Schema para Unidad Seleccionada
export const unidadSeleccionadaSchema = z.object({
  id: z.string().min(1, 'ID de unidad es requerido'),
  tipo: TipoUnidadEnum,
  descripcion: z.string().min(1, 'Descripción es requerida').max(200, 'Descripción muy larga'),
  proyecto: z.string().min(1, 'Proyecto es requerido'),
  etapa: z.string().max(100, 'Etapa muy larga').optional(),
  sector: z.string().max(100, 'Sector muy largo').optional(),
  precioLista: priceSchema,
  precioNegociado: priceSchema,
  tipoDescuento: TipoDescuentoEnum,
  valorDescuento: positiveNumberSchema,
  naturaleza: z.string().max(100, 'Naturaleza muy larga').optional(),
})
.refine((data) => data.precioNegociado <= data.precioLista, {
  message: 'El precio negociado no puede ser mayor al precio de lista',
  path: ['precioNegociado'],
})
.refine((data) => {
  if (data.tipoDescuento === 'porcentaje') {
    const expectedDiscount = ((data.precioLista - data.precioNegociado) / data.precioLista) * 100;
    return Math.abs(expectedDiscount - data.valorDescuento) < 0.1;
  }
  return true;
}, {
  message: 'El descuento porcentual no coincide con la diferencia de precios',
  path: ['valorDescuento'],
});

// Schema para Cochera/Baulera
export const itemSchema = z.object({
  precioLista: priceSchema,
  precioNegociado: priceSchema,
})
.refine((data) => data.precioNegociado <= data.precioLista, {
  message: 'El precio negociado no puede superar el precio de lista',
  path: ['precioNegociado'],
});

// Schema para Regla de Financiación
export const reglaFinanciacionSchema = z.object({
  id: z.string().min(1, 'ID de regla es requerido'),
  moneda: MonedaEnum,
  saldoFinanciar: positiveNumberSchema,
  numCuotas: z.number()
    .int('Número de cuotas debe ser entero')
    .min(1, 'Debe haber al menos 1 cuota')
    .max(360, 'Máximo 360 cuotas'),
  periodicidad: PeriodicidadCuotaEnum,
  importeCuota: positiveNumberSchema,
  primerVencimiento: z.string()
    .min(1, 'Fecha de primer vencimiento es requerida')
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  ultimoVencimiento: z.string()
    .min(1, 'Fecha de último vencimiento es requerida')
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  valorBien: z.string().max(200, 'Valor de bien muy largo').optional(),
  cargo: z.string().max(200, 'Cargo muy largo').optional(),
  porcentajeDeudaTotal: percentageSchema,
  porcentajeDeudaParte: percentageSchema,
  activa: z.boolean().default(true),
})
.refine((data) => {
  const primer = new Date(data.primerVencimiento);
  const ultimo = new Date(data.ultimoVencimiento);
  return primer < ultimo;
}, {
  message: 'La fecha de primer vencimiento debe ser anterior a la última',
  path: ['ultimoVencimiento'],
});

// Schema para Composición A/B
export const composicionSchema = z.object({
  monto: positiveNumberSchema,
  moneda: MonedaEnum,
  porcentaje: percentageSchema,
  tipoCambio: positiveNumberSchema.optional(),
});

// ============================================
// SCHEMA PRINCIPAL DE MINUTA (BASE)
// ============================================

// Schema base sin validaciones cruzadas (para poder usar .pick(), .omit(), etc.)
const minutaBaseSchema = z.object({
  // Identificación
  id: uuidSchema.optional(),
  
  // Paso 1: Proyecto & Unidad
  proyecto: z.string().min(1, 'Proyecto es requerido').max(200, 'Proyecto muy largo'),
  unidad: z.string().max(100, 'Unidad muy larga').optional(),
  unidadDescripcion: z.string().max(200, 'Descripción muy larga').optional(),
  fechaPosesion: z.string()
    .min(1, 'Fecha de posesión es requerida')
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  
  // Múltiples unidades
  unidades: z.array(unidadSeleccionadaSchema)
    .min(1, 'Debe seleccionar al menos una unidad')
    .max(10, 'Máximo 10 unidades permitidas'),
  
  // Paso 2: Datos comerciales
  precioLista: priceSchema,
  precioNegociado: priceSchema,
  tipoDescuento: TipoDescuentoEnum,
  valorDescuento: positiveNumberSchema,
  cocheras: z.array(itemSchema).max(3, 'Máximo 3 cocheras permitidas').optional().default([]),
  baulera: itemSchema.nullable().optional(),
  
  // Paso 3: Composición A/B
  modoA: z.enum(['porcentaje', 'importe']),
  porcA: percentageSchema,
  impA: positiveNumberSchema,
  monedaA: MonedaEnum,
  monedaB: MonedaEnum,
  
  // Paso 4: Financiamiento
  tipoPago: TipoPagoEnum,
  tcFuente: z.enum(['MEP', 'BNA', 'Acordado', 'Otro']),
  tcValor: positiveNumberSchema,
  valorArsConIVA: positiveNumberSchema,
  valorUsdConIVA: positiveNumberSchema,
  anticipoArs: positiveNumberSchema.optional().default(0),
  anticipoUsd: positiveNumberSchema.optional().default(0),
  anticipoArsA: positiveNumberSchema.optional().default(0),
  anticipoUsdA: positiveNumberSchema.optional().default(0),
  anticipoArsB: positiveNumberSchema.optional().default(0),
  anticipoUsdB: positiveNumberSchema.optional().default(0),
  totalFinanciarArs: positiveNumberSchema.optional().default(0),
  totalFinanciarUsd: positiveNumberSchema.optional().default(0),
  fechaFirmaBoleto: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .optional(),
  fechaBaseCAC: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .optional(),
  
  // Paso 5: Cargos y extras
  certificacionFirmas: positiveNumberSchema.optional().default(80000),
  certificacionFirmasPago: FormaPagoEnum.optional().default('Firma de Boleto'),
  selladoPorcentaje: percentageSchema.optional().default(0.5),
  selladoMonto: positiveNumberSchema.optional().default(0),
  selladoPago: FormaPagoEnum.optional().default('Firma de Boleto'),
  alhajamiemtoPorcentaje: percentageSchema.optional().default(2),
  alhajamiemtoMonto: positiveNumberSchema.optional().default(0),
  alhajamiemtoPago: FormaPagoEnum.optional().default('Fecha Posesión A'),
  planosUnidadValorM2: positiveNumberSchema.optional().default(8),
  planosUnidadM2: positiveNumberSchema.optional().default(0),
  planosUnidadMonto: positiveNumberSchema.optional().default(0),
  planosUnidadPago: FormaPagoEnum.optional().default('Fecha Posesión A'),
  planosCocheraValor: positiveNumberSchema.optional().default(100),
  planosCocheraMonto: positiveNumberSchema.optional().default(0),
  planosCocheraPago: FormaPagoEnum.optional().default('-'),
  otrosGastos: positiveNumberSchema.optional().default(0),
  otrosGastosPago: FormaPagoEnum.optional().default('-'),
  totalCargosArs: positiveNumberSchema.optional().default(0),
  totalCargosUsd: positiveNumberSchema.optional().default(0),
  
  // Paso 6: Reglas de financiación
  reglasFinanciacionA: z.array(reglaFinanciacionSchema).optional().default([]),
  reglasFinanciacionB: z.array(reglaFinanciacionSchema).optional().default([]),
  porcentajePagadoFechaPosesion: percentageSchema.optional().default(85),
  
  // Paso 7: Tipo de cambio
  dolarRef: positiveNumberSchema.optional().default(0),
  formatoSalida: z.enum(['PDF', 'XLSX']).optional().default('PDF'),
  
  // Metadata
  estado: EstadoMinutaEnum.default('borrador'),
  observaciones: z.string().max(1000, 'Observaciones muy largas').optional(),
  comentarios: z.string().max(1000, 'Comentarios muy largos').optional(),
  
  // Auditoría
  usuario_id: uuidSchema.optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})
// Validaciones cruzadas
.refine((data) => data.precioNegociado <= data.precioLista, {
  message: 'El precio negociado no puede ser mayor al precio de lista',
  path: ['precioNegociado'],
})
.refine((data) => {
  // Si modo es porcentaje, validar que porcA + (100-porcA) = 100
  if (data.modoA === 'porcentaje') {
    return data.porcA >= 0 && data.porcA <= 100;
  }
  return true;
}, {
  message: 'El porcentaje de la parte A debe estar entre 0 y 100',
  path: ['porcA'],
})
.refine((data) => {
  // Validar que las fechas sean coherentes
  if (data.fechaFirmaBoleto && data.fechaPosesion) {
    const firmaBoleto = new Date(data.fechaFirmaBoleto);
    const posesion = new Date(data.fechaPosesion);
    return firmaBoleto <= posesion;
  }
  return true;
}, {
  message: 'La fecha de firma de boleto debe ser anterior o igual a la fecha de posesión',
  path: ['fechaFirmaBoleto'],
});

// Schema principal exportado con todas las validaciones
export const minutaSchema = minutaBaseSchema
  .refine((data) => data.precioNegociado <= data.precioLista, {
    message: 'El precio negociado no puede ser mayor al precio de lista',
    path: ['precioNegociado'],
  })
  .refine((data) => {
    if (data.modoA === 'porcentaje') {
      return data.porcA >= 0 && data.porcA <= 100;
    }
    return true;
  }, {
    message: 'El porcentaje de la parte A debe estar entre 0 y 100',
    path: ['porcA'],
  })
  .refine((data) => {
    if (data.fechaFirmaBoleto && data.fechaPosesion) {
      const firmaBoleto = new Date(data.fechaFirmaBoleto);
      const posesion = new Date(data.fechaPosesion);
      return firmaBoleto <= posesion;
    }
    return true;
  }, {
    message: 'La fecha de firma de boleto debe ser anterior o igual a la fecha de posesión',
    path: ['fechaFirmaBoleto'],
  });

// ============================================
// TIPOS INFERIDOS
// ============================================

export type MinutaInput = z.infer<typeof minutaSchema>;
export type MinutaOutput = z.infer<typeof minutaSchema>;
export type UnidadSeleccionada = z.infer<typeof unidadSeleccionadaSchema>;
export type ReglaFinanciacion = z.infer<typeof reglaFinanciacionSchema>;
export type Moneda = z.infer<typeof MonedaEnum>;
export type EstadoMinuta = z.infer<typeof EstadoMinutaEnum>;

// ============================================
// SCHEMAS PARCIALES PARA OPERACIONES
// ============================================

// Schema para crear minuta (sin campos auto-generados) - validación manual
export const createMinutaSchema = z.object({
  proyecto: z.string().min(1).max(200),
  unidad: z.string().max(100).optional(),
  unidadDescripcion: z.string().max(200).optional(),
  fechaPosesion: z.string().min(1).regex(/^\d{4}-\d{2}-\d{2}/),
  unidades: z.array(unidadSeleccionadaSchema).min(1).max(10),
  precioLista: priceSchema,
  precioNegociado: priceSchema,
  tipoDescuento: TipoDescuentoEnum,
  valorDescuento: positiveNumberSchema,
  cocheras: z.array(itemSchema).max(3).optional().default([]),
  baulera: itemSchema.nullable().optional(),
  modoA: z.enum(['porcentaje', 'importe']),
  porcA: percentageSchema,
  impA: positiveNumberSchema,
  monedaA: MonedaEnum,
  monedaB: MonedaEnum,
  tipoPago: TipoPagoEnum,
  tcFuente: z.enum(['MEP', 'BNA', 'Acordado', 'Otro']),
  tcValor: positiveNumberSchema,
  valorArsConIVA: positiveNumberSchema,
  valorUsdConIVA: positiveNumberSchema,
  anticipoArs: positiveNumberSchema.optional().default(0),
  anticipoUsd: positiveNumberSchema.optional().default(0),
  anticipoArsA: positiveNumberSchema.optional().default(0),
  anticipoUsdA: positiveNumberSchema.optional().default(0),
  anticipoArsB: positiveNumberSchema.optional().default(0),
  anticipoUsdB: positiveNumberSchema.optional().default(0),
  totalFinanciarArs: positiveNumberSchema.optional().default(0),
  totalFinanciarUsd: positiveNumberSchema.optional().default(0),
  fechaFirmaBoleto: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  fechaBaseCAC: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  certificacionFirmas: positiveNumberSchema.optional().default(80000),
  certificacionFirmasPago: FormaPagoEnum.optional().default('Firma de Boleto'),
  selladoPorcentaje: percentageSchema.optional().default(0.5),
  selladoMonto: positiveNumberSchema.optional().default(0),
  selladoPago: FormaPagoEnum.optional().default('Firma de Boleto'),
  alhajamiemtoPorcentaje: percentageSchema.optional().default(2),
  alhajamiemtoMonto: positiveNumberSchema.optional().default(0),
  alhajamiemtoPago: FormaPagoEnum.optional().default('Fecha Posesión A'),
  planosUnidadValorM2: positiveNumberSchema.optional().default(8),
  planosUnidadM2: positiveNumberSchema.optional().default(0),
  planosUnidadMonto: positiveNumberSchema.optional().default(0),
  planosUnidadPago: FormaPagoEnum.optional().default('Fecha Posesión A'),
  planosCocheraValor: positiveNumberSchema.optional().default(100),
  planosCocheraMonto: positiveNumberSchema.optional().default(0),
  planosCocheraPago: FormaPagoEnum.optional().default('-'),
  otrosGastos: positiveNumberSchema.optional().default(0),
  otrosGastosPago: FormaPagoEnum.optional().default('-'),
  totalCargosArs: positiveNumberSchema.optional().default(0),
  totalCargosUsd: positiveNumberSchema.optional().default(0),
  reglasFinanciacionA: z.array(reglaFinanciacionSchema).optional().default([]),
  reglasFinanciacionB: z.array(reglaFinanciacionSchema).optional().default([]),
  porcentajePagadoFechaPosesion: percentageSchema.optional().default(85),
  dolarRef: positiveNumberSchema.optional().default(0),
  formatoSalida: z.enum(['PDF', 'XLSX']).optional().default('PDF'),
  estado: EstadoMinutaEnum.default('borrador'),
  observaciones: z.string().max(1000).optional(),
  comentarios: z.string().max(1000).optional(),
});

// Schema para actualizar minuta (todos los campos opcionales excepto id)
export const updateMinutaSchema = z.object({
  id: uuidSchema,
  proyecto: z.string().min(1).max(200).optional(),
  unidad: z.string().max(100).optional(),
  unidadDescripcion: z.string().max(200).optional(),
  fechaPosesion: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  unidades: z.array(unidadSeleccionadaSchema).min(1).max(10).optional(),
  precioLista: priceSchema.optional(),
  precioNegociado: priceSchema.optional(),
  tipoDescuento: TipoDescuentoEnum.optional(),
  valorDescuento: positiveNumberSchema.optional(),
  cocheras: z.array(itemSchema).max(3).optional(),
  baulera: itemSchema.nullable().optional(),
  modoA: z.enum(['porcentaje', 'importe']).optional(),
  porcA: percentageSchema.optional(),
  impA: positiveNumberSchema.optional(),
  monedaA: MonedaEnum.optional(),
  monedaB: MonedaEnum.optional(),
  tipoPago: TipoPagoEnum.optional(),
  tcFuente: z.enum(['MEP', 'BNA', 'Acordado', 'Otro']).optional(),
  tcValor: positiveNumberSchema.optional(),
  valorArsConIVA: positiveNumberSchema.optional(),
  valorUsdConIVA: positiveNumberSchema.optional(),
  anticipoArs: positiveNumberSchema.optional(),
  anticipoUsd: positiveNumberSchema.optional(),
  anticipoArsA: positiveNumberSchema.optional(),
  anticipoUsdA: positiveNumberSchema.optional(),
  anticipoArsB: positiveNumberSchema.optional(),
  anticipoUsdB: positiveNumberSchema.optional(),
  totalFinanciarArs: positiveNumberSchema.optional(),
  totalFinanciarUsd: positiveNumberSchema.optional(),
  fechaFirmaBoleto: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  fechaBaseCAC: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  certificacionFirmas: positiveNumberSchema.optional(),
  certificacionFirmasPago: FormaPagoEnum.optional(),
  selladoPorcentaje: percentageSchema.optional(),
  selladoMonto: positiveNumberSchema.optional(),
  selladoPago: FormaPagoEnum.optional(),
  alhajamiemtoPorcentaje: percentageSchema.optional(),
  alhajamiemtoMonto: positiveNumberSchema.optional(),
  alhajamiemtoPago: FormaPagoEnum.optional(),
  planosUnidadValorM2: positiveNumberSchema.optional(),
  planosUnidadM2: positiveNumberSchema.optional(),
  planosUnidadMonto: positiveNumberSchema.optional(),
  planosUnidadPago: FormaPagoEnum.optional(),
  planosCocheraValor: positiveNumberSchema.optional(),
  planosCocheraMonto: positiveNumberSchema.optional(),
  planosCocheraPago: FormaPagoEnum.optional(),
  otrosGastos: positiveNumberSchema.optional(),
  otrosGastosPago: FormaPagoEnum.optional(),
  totalCargosArs: positiveNumberSchema.optional(),
  totalCargosUsd: positiveNumberSchema.optional(),
  reglasFinanciacionA: z.array(reglaFinanciacionSchema).optional(),
  reglasFinanciacionB: z.array(reglaFinanciacionSchema).optional(),
  porcentajePagadoFechaPosesion: percentageSchema.optional(),
  dolarRef: positiveNumberSchema.optional(),
  formatoSalida: z.enum(['PDF', 'XLSX']).optional(),
  estado: EstadoMinutaEnum.optional(),
  observaciones: z.string().max(1000).optional(),
  comentarios: z.string().max(1000).optional(),
});

// Schema para filtros de búsqueda
export const minutaFilterSchema = z.object({
  proyecto: z.string().optional(),
  estado: EstadoMinutaEnum.optional(),
  fechaDesde: z.string().datetime().optional(),
  fechaHasta: z.string().datetime().optional(),
  precioMin: positiveNumberSchema.optional(),
  precioMax: positiveNumberSchema.optional(),
  usuario_id: uuidSchema.optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['created_at', 'updated_at', 'precioNegociado', 'fechaPosesion']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type MinutaFilters = z.infer<typeof minutaFilterSchema>;

// ============================================
// SCHEMAS PARA VALIDACIÓN POR PASOS
// ============================================

export const step1Schema = z.object({
  proyecto: z.string().min(1).max(200),
  unidad: z.string().max(100).optional(),
  unidadDescripcion: z.string().max(200).optional(),
  fechaPosesion: z.string().min(1).regex(/^\d{4}-\d{2}-\d{2}/),
  unidades: z.array(unidadSeleccionadaSchema).min(1).max(10),
});

export const step2Schema = z.object({
  precioLista: priceSchema,
  precioNegociado: priceSchema,
  tipoDescuento: TipoDescuentoEnum,
  valorDescuento: positiveNumberSchema,
  cocheras: z.array(itemSchema).max(3).optional().default([]),
  baulera: itemSchema.nullable().optional(),
  unidades: z.array(unidadSeleccionadaSchema).min(1).max(10),
});

export const step3Schema = z.object({
  modoA: z.enum(['porcentaje', 'importe']),
  porcA: percentageSchema,
  impA: positiveNumberSchema,
  monedaA: MonedaEnum,
  monedaB: MonedaEnum,
});

export const step4Schema = z.object({
  tipoPago: TipoPagoEnum,
  tcFuente: z.enum(['MEP', 'BNA', 'Acordado', 'Otro']),
  tcValor: positiveNumberSchema,
  valorArsConIVA: positiveNumberSchema,
  valorUsdConIVA: positiveNumberSchema,
  anticipoArs: positiveNumberSchema.optional().default(0),
  anticipoUsd: positiveNumberSchema.optional().default(0),
  anticipoArsA: positiveNumberSchema.optional().default(0),
  anticipoUsdA: positiveNumberSchema.optional().default(0),
  anticipoArsB: positiveNumberSchema.optional().default(0),
  anticipoUsdB: positiveNumberSchema.optional().default(0),
  totalFinanciarArs: positiveNumberSchema.optional().default(0),
  totalFinanciarUsd: positiveNumberSchema.optional().default(0),
  fechaFirmaBoleto: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  fechaBaseCAC: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
});

export const step5Schema = z.object({
  certificacionFirmas: positiveNumberSchema.optional().default(80000),
  certificacionFirmasPago: FormaPagoEnum.optional().default('Firma de Boleto'),
  selladoPorcentaje: percentageSchema.optional().default(0.5),
  selladoMonto: positiveNumberSchema.optional().default(0),
  selladoPago: FormaPagoEnum.optional().default('Firma de Boleto'),
  alhajamiemtoPorcentaje: percentageSchema.optional().default(2),
  alhajamiemtoMonto: positiveNumberSchema.optional().default(0),
  alhajamiemtoPago: FormaPagoEnum.optional().default('Fecha Posesión A'),
  planosUnidadValorM2: positiveNumberSchema.optional().default(8),
  planosUnidadM2: positiveNumberSchema.optional().default(0),
  planosUnidadMonto: positiveNumberSchema.optional().default(0),
  planosUnidadPago: FormaPagoEnum.optional().default('Fecha Posesión A'),
  planosCocheraValor: positiveNumberSchema.optional().default(100),
  planosCocheraMonto: positiveNumberSchema.optional().default(0),
  planosCocheraPago: FormaPagoEnum.optional().default('-'),
  otrosGastos: positiveNumberSchema.optional().default(0),
  otrosGastosPago: FormaPagoEnum.optional().default('-'),
  totalCargosArs: positiveNumberSchema.optional().default(0),
  totalCargosUsd: positiveNumberSchema.optional().default(0),
});

export const step6Schema = z.object({
  reglasFinanciacionA: z.array(reglaFinanciacionSchema).optional().default([]),
  reglasFinanciacionB: z.array(reglaFinanciacionSchema).optional().default([]),
  porcentajePagadoFechaPosesion: percentageSchema.optional().default(85),
});

export const step7Schema = z.object({
  dolarRef: positiveNumberSchema.optional().default(0),
  formatoSalida: z.enum(['PDF', 'XLSX']).optional().default('PDF'),
});
