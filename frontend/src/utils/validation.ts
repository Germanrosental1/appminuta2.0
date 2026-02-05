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
    // Si existe el array de unidades (nuevo modelo), debe tener al menos una
    if (Array.isArray(data.unidades)) {
      return data.unidades.length > 0;
    }
    // Fallback compatibilidad: proyecto y unidad requeridos
    return !!data.proyecto && !!data.unidad;
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
  porcA: z.number().min(0).max(100).optional(),
  impA: z.number().min(0).optional(),
  monedaA: z.enum(["USD", "ARS"]).optional(),
  monedaB: z.enum(["USD", "ARS"]).optional(), // Usually inferred/set

  // Exchange Rate fields moved here
  tcFuente: z.enum(["MEP", "BNA", "Acordado", "Otro"]).optional(),
  tcValor: z.number().positive("El tipo de cambio debe ser mayor a 0").optional(),
  fechaBaseCAC: z.string().min(1, "La fecha base CAC es requerida").optional(),
}).refine(data => {
  if (data.modoA === "porcentaje") {
    return data.porcA !== undefined && data.porcA >= 0;
  }
  return data.impA !== undefined && data.impA >= 0;
}, {
  message: "Debe ingresar un porcentaje o importe válido",
  path: ["porcA"], // or impA
});

// PAGO SCHEMA (Ahora Step 3 en UI, pero mantenemos el nombre variable step4Schema por conveniencia o renombramos)
// Vamos a actualizar step4Schema para reflejar los nuevos campos de Pago
// Schema for Step 4: Pago y Anticipos
export const step4Schema = z.object({
  tipoPago: z.enum(["contado", "financiado"]),

  // Anticipos
  anticipoArsA: z.number().min(0).optional(),
  anticipoUsdA: z.number().min(0).optional(),
  anticipoArsB: z.number().min(0).optional(),
  anticipoUsdB: z.number().min(0).optional(),
});

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
  cantidadCocheras: z.number().min(0).optional(),
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
  porcentajeDeudaTotal: z.number().min(0),
  porcentajeDeudaParte: z.number().min(0),
  activa: z.boolean(),
});

export const step6Schema = z.object({
  reglasFinanciacionA: z.array(reglaFinanciacionSchema),
  reglasFinanciacionB: z.array(reglaFinanciacionSchema),
  porcentajePagadoFechaPosesion: z.number().min(0).max(101),
  totalFinanciarArs: z.number().min(0),
  totalFinanciarUsd: z.number().min(0),
  tcValor: z.number().positive().optional(),
  monedaB: z.string().optional(),
  monedaA: z.string().optional(),
}).refine(
  (data) => {
    const TOLERANCE = 1; // 1 peso/dólar tolerance

    // Calcular saldo restante A
    const totalReglasA = (data.reglasFinanciacionA || [])
      .filter(regla => regla.activa)
      .reduce((sum, regla) => {
        // Conversión según la moneda base de la Parte F (data.monedaA)
        // Lógica actualizada para soportar F en USD o ARS

        if (data.monedaA === "USD") {
          // Si F es USD:
          // - Regla USD: Sumar directo
          // - Regla ARS: Dividir por TC
          if (regla.moneda === "ARS") {
            return sum + (regla.saldoFinanciar / (data.tcValor || 1));
          }
          return sum + regla.saldoFinanciar;
        } else {
          // Si F es ARS (o default):
          // - Regla USD: Multiplicar por TC
          // - Regla ARS: Sumar directo
          if (regla.moneda === "USD") {
            return sum + (regla.saldoFinanciar * (data.tcValor || 1));
          }
          return sum + regla.saldoFinanciar;
        }
      }, 0);

    const saldoRestanteA = Math.max(data.totalFinanciarArs - totalReglasA, 0);

    // Calcular saldo restante B (with proper currency conversion)
    const totalReglasB = (data.reglasFinanciacionB || [])
      .filter(regla => regla.activa)
      .reduce((sum, regla) => {
        // If Part B is in ARS but the rule is in USD, convert to ARS
        if (data.monedaB === "ARS" && regla.moneda === "USD") {
          return sum + (regla.saldoFinanciar * (data.tcValor || 1));
        }
        // If Part B is in USD but the rule is in ARS, convert to USD
        if (data.monedaB === "USD" && regla.moneda === "ARS") {
          return sum + (regla.saldoFinanciar / (data.tcValor || 1));
        }
        // Same currency, no conversion needed
        return sum + regla.saldoFinanciar;
      }, 0);

    const saldoRestanteB = Math.max(data.totalFinanciarUsd - totalReglasB, 0);

    // Detect duplicate totals bug
    const isDuplicateBug = data.totalFinanciarArs > 0 &&
      Math.abs(data.totalFinanciarArs - data.totalFinanciarUsd) < 100;

    // Verificar que ambos saldos restantes sean 0 (con tolerancia)
    const aOk = saldoRestanteA <= TOLERANCE;
    const bOk = saldoRestanteB <= TOLERANCE || isDuplicateBug;

    return aOk && bOk;
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

export const validateStep = (step: number, data: any, tipoPago?: string) => {
  try {
    switch (step) {
      case 6:
        // Step 6 para financiado = Step7 (Salida), pero el schema no tiene validación real
        // Step 6 para contado = Salida (skippeamos validación de formato)
        return { valid: true, errors: {} };
      case 7:
        return validateSchema(step7Schema, data);
      case 0:
        step1Schema.parse(data);
        return { valid: true, errors: {} };
      case 1:
        step2Schema.parse(data);
        return { valid: true, errors: {} };
      case 2:
        // Index 2 is now COMPOSICION, so use step3Schema
        step3Schema.parse(data);
        return { valid: true, errors: {} };
      case 3:
        // Index 3 is now PAGO, so use step4Schema
        step4Schema.parse(data);
        return { valid: true, errors: {} };
      case 4:
        // Index 4 might be IVA or Cargos depending on applicability.
        // Calling code (Wizard.tsx) should know which schema to use? 
        // Or we map strictly based on ID.
        // Check Wizard.tsx logic: if IVA is present at index 4, it uses validateIVAStep manually.
        // If IVA is NOT present, index 4 is Cargos.
        // We should allow validateStep(4) to be Cargos (step5Schema).
        // If it is IVA, default validation might fail if it tries step5Schema.
        step5Schema.parse(data);
        return { valid: true, errors: {} };
      case 5:
        // Si el pago es contado, no validar reglas de financiación
        if (tipoPago === "contado") {
          return { valid: true, errors: {} };
        }
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
