import { z } from "zod";

export const step1Schema = z.object({
  proyecto: z.string().optional(), // Ahora es opcional porque usamos unidades múltiples
  unidad: z.string().optional(), // Ahora es opcional porque usamos unidades múltiples
  unidadDescripcion: z.string().optional(),
  fechaPosesion: z.string().min(1, "La fecha de posesión es requerida"),
  // Nuevo campo para unidades múltiples
  unidades: z.array(z.any()).optional(),
}).refine(
  (data) => {
    // Si no hay unidades, entonces proyecto y unidad son requeridos (compatibilidad)
    if (!data.unidades || data.unidades.length === 0) {
      return !!data.proyecto && !!data.unidad;
    }
    // Si hay unidades, entonces debe haber al menos una
    return data.unidades.length > 0;
  },
  {
    message: "Debe seleccionar al menos una unidad",
    path: ["unidades"],
  }
);

// Esquema para validar una cochera o baulera
export const itemSchema = z.object({
  precioLista: z.number().min(0, "El precio de lista no puede ser negativo"),
  precioNegociado: z.number().min(0, "El precio negociado no puede ser negativo"),
}).refine((data) => data.precioNegociado <= data.precioLista, {
  message: "El precio negociado no puede superar el precio de lista",
  path: ["precioNegociado"],
});

export const step2Schema = z
  .object({
    precioLista: z.number().optional(), // Ahora es opcional porque usamos unidades múltiples
    precioNegociado: z.number().optional(), // Ahora es opcional porque usamos unidades múltiples
    cocheras: z.array(itemSchema).max(3, "Máximo 3 cocheras permitidas"),
    baulera: itemSchema.nullable(),
    // Nuevo campo para unidades múltiples
    unidades: z.array(z.any()).optional(),
  })
  .refine(
    (data) => {
      // Si no hay unidades, entonces precioLista y precioNegociado son requeridos (compatibilidad)
      if (!data.unidades || data.unidades.length === 0) {
        return (
          (data.precioLista || 0) > 0 &&
          (data.precioNegociado || 0) > 0 &&
          (data.precioNegociado || 0) <= (data.precioLista || 0)
        );
      }
      // Si hay unidades, verificar que cada unidad tenga precioLista y precioNegociado válidos
      return data.unidades.every(
        (unidad: any) =>
          (unidad.precioLista || 0) > 0 &&
          (unidad.precioNegociado || 0) > 0 &&
          (unidad.precioNegociado || 0) <= (unidad.precioLista || 0)
      );
    },
    {
      message: "Todas las unidades deben tener precios válidos",
      path: ["unidades"],
    }
  );

// Función auxiliar para calcular el precio total
const calcularPrecioTotal = (data: any) => {
  let total = 0;
  
  // Sumar precios de todas las unidades en el nuevo modelo
  if (data.unidades && data.unidades.length > 0) {
    data.unidades.forEach((unidad: any) => {
      total += unidad.precioNegociado || 0;
    });
    return total;
  }
  
  // Fallback al modelo antiguo si no hay unidades en el nuevo modelo
  // Precio de la unidad principal
  total = data.precioNegociado || 0;
  
  // Sumar precios de cocheras
  const cocheras = data.cocheras || [];
  if (cocheras.length > 0) {
    cocheras.forEach((cochera: any) => {
      total += cochera.precioNegociado || 0;
    });
  }
  
  // Sumar precio de baulera si existe
  if (data.baulera) {
    total += data.baulera.precioNegociado || 0;
  }
  
  return total;
};

export const step3Schema = z.object({
  modoA: z.enum(["porcentaje", "importe"]),
  porcA: z.number().min(0).max(100),
  impA: z.number().min(0),
  monedaA: z.enum(["USD", "ARS"]),
  monedaB: z.enum(["USD", "ARS"]),
  // Incluimos estos campos para poder validar el importe A contra el precio total
  precioNegociado: z.number(),
  cocheras: z.array(itemSchema).optional(),
  baulera: itemSchema.nullable().optional(),
  // Nuevo campo para unidades múltiples
  unidades: z.array(z.any()).optional(),
}).refine(
  (data) => {
    if (data.modoA === "importe") {
      const precioTotal = calcularPrecioTotal(data);
      return data.impA <= precioTotal;
    }
    return true;
  },
  {
    message: "El importe A no puede superar el precio total",
    path: ["impA"],
  }
);

export const step4Schema = z
  .object({
    tipoPago: z.enum(["contado", "financiado"]),
    tcFuente: z.enum(["MEP", "Acordado", "Otro"]),
    tcValor: z.number().positive("El tipo de cambio debe ser mayor a 0"),
    valorArsConIVA: z.number().min(0),
    valorUsdConIVA: z.number().min(0),
    anticipoArs: z.number().min(0),
    anticipoUsd: z.number().min(0),
    totalFinanciarArs: z.number().min(0),
    totalFinanciarUsd: z.number().min(0),
    fechaFirmaBoleto: z.string().min(1, "La fecha de firma del boleto es requerida"),
    fechaBaseCAC: z.string().optional(),
  })
  .refine(
    (data) => {
      // Solo validar anticipos si el pago es financiado
      if (data.tipoPago === "financiado") {
        return data.anticipoArs <= data.valorArsConIVA;
      }
      return true;
    },
    {
      message: "El anticipo en ARS no puede superar el valor a financiar",
      path: ["anticipoArs"],
    }
  )
  .refine(
    (data) => {
      // Solo validar anticipos si el pago es financiado
      if (data.tipoPago === "financiado") {
        return data.anticipoUsd <= data.valorUsdConIVA;
      }
      return true;
    },
    {
      message: "El anticipo en USD no puede superar el valor a financiar",
      path: ["anticipoUsd"],
    }
  );

export const step5Schema = z.object({
  certificacionFirmas: z.number().min(0),
  certificacionFirmasPago: z.enum(["Firma de Boleto", "Fecha Posesión A", "Fecha Posesión B", "Financiado A", "Financiado B", "-"]),
  selladoPorcentaje: z.number().min(0).max(100),
  selladoMonto: z.number().min(0),
  selladoPago: z.enum(["Firma de Boleto", "Fecha Posesión A", "Fecha Posesión B", "Financiado A", "Financiado B", "-"]),
  alhajamiemtoPorcentaje: z.number().min(0).max(100),
  alhajamiemtoMonto: z.number().min(0),
  alhajamiemtoPago: z.enum(["Firma de Boleto", "Fecha Posesión A", "Fecha Posesión B", "Financiado A", "Financiado B", "-"]),
  planosUnidadValorM2: z.number().min(0),
  planosUnidadM2: z.number().min(0),
  planosUnidadMonto: z.number().min(0),
  planosUnidadPago: z.enum(["Firma de Boleto", "Fecha Posesión A", "Fecha Posesión B", "Financiado A", "Financiado B", "-"]),
  planosCocheraValor: z.number().min(0),
  planosCocheraMonto: z.number().min(0),
  planosCocheraPago: z.enum(["Firma de Boleto", "Fecha Posesión A", "Fecha Posesión B", "Financiado A", "Financiado B", "-"]),
  otrosGastos: z.number().min(0),
  otrosGastosPago: z.enum(["Firma de Boleto", "Fecha Posesión A", "Fecha Posesión B", "Financiado A", "Financiado B", "-"]),
  totalCargosArs: z.number().min(0),
  totalCargosUsd: z.number().min(0),
});

export const reglaFinanciacionSchema = z.object({
  id: z.string(),
  moneda: z.enum(["USD", "ARS", "MIX"]),
  saldoFinanciar: z.number().min(0),
  numCuotas: z.number().int().min(0),
  periodicidad: z.enum(["Mensual", "Trimestral", "Semestral", "Anual", "Pago Único"]),
  importeCuota: z.number().min(0),
  primerVencimiento: z.string(),
  ultimoVencimiento: z.string(),
  valorBien: z.string(),
  cargo: z.string(),
  porcentajeDeudaTotal: z.number().min(0).max(100),
  porcentajeDeudaParte: z.number().min(0).max(100),
  activa: z.boolean(),
});

export const step6Schema = z.object({
  reglasFinanciacionA: z.array(reglaFinanciacionSchema),
  reglasFinanciacionB: z.array(reglaFinanciacionSchema),
  porcentajePagadoFechaPosesion: z.number().min(0).max(100),
  totalFinanciarArs: z.number().min(0),
  totalFinanciarUsd: z.number().min(0),
  tcValor: z.number().positive().optional(),
}).refine(
  (data) => {
    // Calcular saldo restante A
    const totalReglasA = (data.reglasFinanciacionA || [])
      .filter(regla => regla.activa)
      .reduce((sum, regla) => {
        // Si la regla está en USD, convertir a ARS usando el tipo de cambio
        if (regla.moneda === "USD") {
          return sum + (regla.saldoFinanciar * (data.tcValor || 1));
        }
        return sum + regla.saldoFinanciar;
      }, 0);
    
    const saldoRestanteA = Math.max(data.totalFinanciarArs - totalReglasA, 0);
    
    // Calcular saldo restante B
    const totalReglasB = (data.reglasFinanciacionB || [])
      .filter(regla => regla.activa)
      .reduce((sum, regla) => sum + regla.saldoFinanciar, 0);
    
    const saldoRestanteB = Math.max(data.totalFinanciarUsd - totalReglasB, 0);
    
    // Verificar que ambos saldos restantes sean 0
    return saldoRestanteA === 0 && saldoRestanteB === 0;
  },
  {
    message: "Debe cubrir el 100% del saldo a financiar con reglas de financiación",
    path: ["reglasFinanciacionA"],
  }
);

export const step7Schema = z.object({
  dolarRef: z.number().positive("El tipo de cambio debe ser mayor a 0"),
  formatoSalida: z.enum(["PDF", "XLSX"]),
});

const validateSchema = (schema: any, data: any) => {
  try {
    schema.parse(data);
    return { valid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        errors[path] = err.message;
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: { general: "Error de validación" } };
  }
};

export const validateStep = (step: number, data: any) => {
  try {
    switch (step) {
      case 6:
        return validateSchema(step6Schema, data);
      case 7:
        return validateSchema(step7Schema, data);
      case 0:
        step1Schema.parse(data);
        return { valid: true, errors: {} };
      case 1:
        step2Schema.parse(data);
        return { valid: true, errors: {} };
      case 2:
        step3Schema.parse(data);
        return { valid: true, errors: {} };
      case 3:
        step4Schema.parse(data);
        return { valid: true, errors: {} };
      case 4:
        step5Schema.parse(data);
        return { valid: true, errors: {} };
      case 5:
        step6Schema.parse(data);
        return { valid: true, errors: {} };
      default:
        return { valid: true, errors: {} };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        errors[path] = err.message;
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: { general: "Error de validación" } };
  }
};
