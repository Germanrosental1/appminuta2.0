import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Trash2, Check, X, Wallet, Coins, AlertTriangle, Landmark, ArrowRightLeft, Calendar as CalendarIconLucide } from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { ReglaFinanciacion, Moneda, PeriodicidadCuota } from "@/types/wizard";
import { format, addMonths, addYears, parse } from "date-fns";
import { es } from "date-fns/locale";

// --- Helper Functions ---

// Función para parsear fecha en formato DD/MM/YY a objeto Date
const parseDate = (dateString: string): Date => {
  try {
    // Intentar parsear en formato d/MM/yy
    return parse(dateString, "d/MM/yy", new Date());
  } catch (error) {
    console.error("Error parsing date:", error);
    return new Date();
  }
};

// Helper: Parsear fecha en formato DD/MM/YY o ISO
const parseFechaVencimiento = (fechaStr: string): Date | null => {
  try {
    const partes = fechaStr.split('/');
    if (partes.length === 3) {
      const year = partes[2].length === 2 ? "20" + partes[2] : partes[2];
      return new Date(Number.parseInt(year), Number.parseInt(partes[1]) - 1, Number.parseInt(partes[0]));
    }
    return new Date(fechaStr);
  } catch (error) {
    console.error("Error parsing expiration date:", error);
    return null;
  }
};

// Helper: Calcular siguiente fecha de vencimiento según periodicidad
const calcularSiguienteVencimiento = (
  fechaBase: Date,
  periodicidad: PeriodicidadCuota,
  numeroQuota: number
): Date | null => {
  switch (periodicidad) {
    case "Mensual": return addMonths(fechaBase, numeroQuota);
    case "Trimestral": return addMonths(fechaBase, numeroQuota * 3);
    case "Semestral": return addMonths(fechaBase, numeroQuota * 6);
    case "Anual": return addYears(fechaBase, numeroQuota);
    default: return null;
  }
};

// Helper para calcular fechas de vencimiento (inicio y fin)
const calculateRuleDates = (startStr: string, periodicidad: string, numCuotas: number) => {
  const start = parseDate(startStr);
  let end: Date = start;

  if (periodicidad === "Mensual") end = addMonths(start, numCuotas - 1);
  else if (periodicidad === "Trimestral") end = addMonths(start, (numCuotas - 1) * 3);
  else if (periodicidad === "Semestral") end = addMonths(start, (numCuotas - 1) * 6);
  else if (periodicidad === "Anual") end = addYears(start, numCuotas - 1);

  return {
    first: start,
    lastStr: format(end, "d/MM/yy")
  };
};

// Helper: Contar cuotas pagadas antes de fecha límite
const contarCuotasPagadas = (
  fechaPrimerVencimiento: Date,
  periodicidad: PeriodicidadCuota,
  numCuotas: number,
  fechaLimite: Date
): number => {
  let cuotasPagadas = 1; // Primera cuota ya validada

  if (numCuotas <= 1) return cuotasPagadas;

  for (let i = 1; i < numCuotas; i++) {
    const siguienteFecha = calcularSiguienteVencimiento(fechaPrimerVencimiento, periodicidad, i);

    if (!siguienteFecha) break;

    if (siguienteFecha <= fechaLimite) {
      cuotasPagadas++;
    } else {
      break;
    }
  }

  return cuotasPagadas;
};

// Función para calcular cuánto se habrá pagado de una regla a la fecha de posesión
const calcularMontoPagadoAFechaPosesion = (regla: ReglaFinanciacion, fechaPosesion: Date): number => {

  try {
    // Parsear fecha de primer vencimiento
    const fechaPrimerVencimiento = parseFechaVencimiento(regla.primerVencimiento);

    if (!fechaPrimerVencimiento || Number.isNaN(fechaPrimerVencimiento.getTime())) {
      return 0;
    }


    // Early return: vencimiento posterior a posesión
    if (fechaPrimerVencimiento > fechaPosesion) {
      return 0;
    }

    // Early return: pago único
    if (regla.periodicidad === "Pago Único") {
      return regla.saldoFinanciar;
    }

    // Calcular cuotas pagadas para pagos periódicos
    const cuotasPagadas = contarCuotasPagadas(
      fechaPrimerVencimiento,
      regla.periodicidad,
      regla.numCuotas,
      fechaPosesion
    );

    // Calcular monto total pagado
    const montoPagado = Math.min(regla.saldoFinanciar, cuotasPagadas * regla.importeCuota);

    return montoPagado;
  } catch (error) {
    console.error("Error calculating paid amount:", error);
    return 0;
  }
};

// Formato de moneda
const formatCurrency = (value: number, moneda: Moneda = "ARS") => {
  const formattedValue = value.toLocaleString("es-AR", { minimumFractionDigits: 2 });
  if (moneda === "USD") return formattedValue + " USD";
  if (moneda === "MIX") return formattedValue + " MIX";
  return formattedValue; // ARS por defecto
};

// Formato de fecha de posesión: convierte de YYYY-MM-DD a DD/MM/YYYY
const formatFechaPosesion = (fechaIso: string | undefined): string => {
  if (!fechaIso) return "No definida";

  try {
    // Si ya está en formato DD/MM/YYYY o DD/MM/YY, devolverla tal cual
    if (fechaIso.includes("/")) return fechaIso;

    // Convertir de YYYY-MM-DD a DD/MM/YYYY
    const [year, month, day] = fechaIso.split("-");
    if (!year || !month || !day) return fechaIso;

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting possession date:", error);
    return fechaIso;
  }
};

// Helper: Convertir totales a moneda base (ARS) según moneda B
// Helper: Convertir totales a moneda base (ARS) considerando monedas de ambas partes
const convertirATotalesEnMonedaBase = (totalFinanciarArs: number, totalFinanciarUsd: number, monedaB: string, tcValor: number, monedaA: string = "ARS"): number => {
  let totalA = totalFinanciarArs;
  // Si Parte F está en USD, convertir a ARS
  if (monedaA === "USD") {
    totalA = totalFinanciarArs * (tcValor || 1);
  }

  let totalB = totalFinanciarUsd;
  // Si Parte SB está en USD, convertir a ARS
  if (monedaB === "USD") {
    totalB = totalFinanciarUsd * (tcValor || 1);
  }

  return totalA + totalB;
};

// Helper: Calcular total de anticipos en moneda base (ARS)
const calcularTotalAnticipos = (data: any): number => {
  // Anticipos en ARS
  const anticipoArsTotal = (data.anticipoArsA || 0) + (data.anticipoArsB || 0);

  // Anticipos en USD convertidos a ARS
  const anticipoUsdTotal = (data.anticipoUsdA || 0) + (data.anticipoUsdB || 0);
  const anticiposUsdEnArs = anticipoUsdTotal * (data.tcValor || 1);

  return anticipoArsTotal + anticiposUsdEnArs;
};


// Helper para calcular porcentaje pagado logic, pure function
const calcularPorcentajePagadoHelper = (
  reglasA: ReglaFinanciacion[],
  reglasB: ReglaFinanciacion[],
  data: any
) => {
  // Early return: sin financiación ni anticipos
  const hayAnticipos = (data.anticipoArsA || 0) > 0 || (data.anticipoArsB || 0) > 0 ||
    (data.anticipoUsdA || 0) > 0 || (data.anticipoUsdB || 0) > 0;

  if (!hayAnticipos && reglasA.length === 0 && reglasB.length === 0) {
    return 0;
  }

  // Early return: sin fecha de posesión
  if (!data.fechaPosesion) return 85;

  // Parsear fecha de posesión usando helper reutilizado
  const fechaFormateada = formatFechaPosesion(data.fechaPosesion);
  let fechaPosesion = parseFechaVencimiento(fechaFormateada);

  if (!fechaPosesion || Number.isNaN(fechaPosesion.getTime())) {
    // Fallback: fecha un año en el futuro
    const fechaFutura = new Date();
    fechaFutura.setFullYear(fechaFutura.getFullYear() + 1);
    fechaPosesion = fechaFutura;
  }

  // Early return: posesión ya pasó
  if (fechaPosesion < new Date()) return 100;

  // Calcular total a financiar en moneda base
  const totalFinanciar = convertirATotalesEnMonedaBase(
    data.totalFinanciarArs || 0,
    data.totalFinanciarUsd || 0,
    data.monedaB,
    data.tcValor || 1,
    data.monedaA
  );

  if (totalFinanciar === 0) return 100;

  // Calcular anticipos
  const totalAnticipos = calcularTotalAnticipos(data);

  // Calcular el total pagado a fecha de posesión para las reglas de la parte A
  let totalPagadoA = 0;

  // Procesar cada regla de la parte A
  reglasA.forEach(regla => {
    if (!regla.activa) return;

    // Calcular cuánto se pagará de esta regla antes de la fecha de posesión
    // fechaPosesion is guaranteed to be a Date here because of the fallback above
    const montoPagado = calcularMontoPagadoAFechaPosesion(regla, fechaPosesion);

    // Si la regla está en USD, convertir a ARS usando el tipo de cambio
    if (regla.moneda === "USD") {
      const montoPagadoConvertido = montoPagado * (data.tcValor || 1);
      totalPagadoA += montoPagadoConvertido;
    } else {
      totalPagadoA += montoPagado;
    }
  });


  // Calcular el total pagado a fecha de posesión para las reglas de la parte B
  let totalPagadoB = 0;

  // Procesar cada regla de la parte B
  reglasB.forEach(regla => {
    if (!regla.activa) return;

    // Calcular cuánto se pagará de esta regla antes de la fecha de posesión
    const montoPagado = calcularMontoPagadoAFechaPosesion(regla, fechaPosesion);

    // Convertir todos los montos a ARS para tener una base común
    if (regla.moneda === "USD") {
      // Si la regla está en USD, convertir a ARS
      const montoPagadoConvertido = montoPagado * (data.tcValor || 1);
      totalPagadoB += montoPagadoConvertido;
    } else {
      // Si la regla está en ARS, usar directamente
      totalPagadoB += montoPagado;
    }
  });

  // Sumar los anticipos a los pagos de las reglas
  const totalPagado = totalPagadoA + totalPagadoB + totalAnticipos;

  // El porcentaje pagado es lo que se pagará antes de la fecha de posesión dividido por el PRECIO TOTAL (Deuda + Anticipos)
  let porcentajePagado = 0;
  const precioTotal = totalFinanciar + totalAnticipos;

  if (precioTotal > 0) {
    porcentajePagado = (totalPagado / precioTotal) * 100;
  }

  // Asegurarse de que el porcentaje esté entre 0 y 100
  return Math.max(0, Math.min(100, Math.round(porcentajePagado * 100) / 100));
};


// Helper pure functions for balance calculation
const calculateBalanceA = (
  monedaA: string | undefined,
  totalFinanciarArs: number,
  reglasA: ReglaFinanciacion[],
  tcValor: number
) => {
  const totalReglasA = reglasA
    .filter(regla => regla.activa)
    .reduce((sum, regla) => {
      if (monedaA === "USD") {
        if (regla.moneda === "ARS") return sum + (regla.saldoFinanciar / tcValor);
        return sum + regla.saldoFinanciar;
      } else {
        if (regla.moneda === "USD") return sum + (regla.saldoFinanciar * tcValor);
        return sum + regla.saldoFinanciar;
      }
    }, 0);
  return Math.max(totalFinanciarArs - totalReglasA, 0);
};

const calculateBalanceB = (
  monedaB: string | undefined,
  totalFinanciarUsd: number,
  reglasB: ReglaFinanciacion[],
  tcValor: number
) => {
  const totalReglasB = reglasB
    .filter(regla => regla.activa)
    .reduce((sum, regla) => {
      if (monedaB === "ARS" && regla.moneda === "USD") return sum + (regla.saldoFinanciar * tcValor);
      else if (monedaB === "USD" && regla.moneda === "ARS") return sum + (regla.saldoFinanciar / tcValor);
      return sum + regla.saldoFinanciar;
    }, 0);
  return Math.max(totalFinanciarUsd - totalReglasB, 0);
};

export const Step6ReglasFinanciacion: React.FC = () => {
  const { data, updateData } = useWizard();
  const [activeTab, setActiveTab] = useState<"F" | "SB">("F");
  const fechaActual = new Date();
  const fechaHoy = format(fechaActual, "d/MM/yy");

  const [nuevaReglaA, setNuevaReglaA] = useState<Partial<ReglaFinanciacion>>({
    moneda: data.monedaA || "ARS",
    primerVencimiento: fechaHoy
  });
  const [nuevaReglaB, setNuevaReglaB] = useState<Partial<ReglaFinanciacion>>({
    primerVencimiento: fechaHoy
  });

  // Inicializar monedas según la selección del paso 3
  useEffect(() => {
    setNuevaReglaA(prev => ({ ...prev, moneda: data.monedaA || "ARS" }));
    setNuevaReglaB(prev => ({ ...prev, moneda: data.monedaB }));
  }, [data.monedaA, data.monedaB]);
  const [mostrarFormA, setMostrarFormA] = useState(false);
  const [mostrarFormB, setMostrarFormB] = useState(false);

  // Calcular totales a financiar
  const totalFinanciarArs = data.totalFinanciarArs || 0;
  const totalFinanciarUsd = data.totalFinanciarUsd || 0;

  // Calcular saldos restantes using helpers
  const calcularSaldoRestanteA = () => calculateBalanceA(
    data.monedaA,
    data.totalFinanciarArs || 0,
    data.reglasFinanciacionA || [],
    data.tcValor || 1
  );

  const calcularSaldoRestanteB = () => calculateBalanceB(
    data.monedaB,
    data.totalFinanciarUsd || 0,
    data.reglasFinanciacionB || [],
    data.tcValor || 1
  );

  // Helper para calcular el máximo permitido en el input de la nueva regla A
  const calcularMaximoPermitidoA = () => {
    const saldoRestante = calcularSaldoRestanteA();
    if (saldoRestante <= 0) return 0;

    const monedaDeuda = data.monedaA || "ARS";
    const monedaInput = nuevaReglaA.moneda || "ARS";
    const tc = data.tcValor || 1;

    if (monedaDeuda === monedaInput) return saldoRestante;

    // Deuda USD, Input ARS -> return saldo * tc
    // Deuda ARS, Input USD -> return saldo / tc
    if (monedaDeuda === "USD") {
      return saldoRestante * tc;
    } else {
      return saldoRestante / tc;
    }
  };

  // Wrapper for calculation using current component state or overrides

  // Agregar nueva regla A
  const agregarReglaA = () => {
    if (!nuevaReglaA.saldoFinanciar || !nuevaReglaA.numCuotas || !nuevaReglaA.moneda || !nuevaReglaA.primerVencimiento) return;

    // Usar la fecha seleccionada por el usuario o la fecha actual + 1 mes
    const primerVencimiento = nuevaReglaA.primerVencimiento;
    const { lastStr: ultimoVencimiento } = calculateRuleDates(
      primerVencimiento,
      nuevaReglaA.periodicidad || "Mensual",
      Number(nuevaReglaA.numCuotas)
    );

    const importeCuota = nuevaReglaA.periodicidad === "Pago Único"
      ? Number(nuevaReglaA.saldoFinanciar)
      : Number(nuevaReglaA.saldoFinanciar) / Number(nuevaReglaA.numCuotas);

    // Calcular el monto en la moneda correcta del total para los porcentajes (Base ARS para el global)
    const montoEnMonedaBaseGlobal = nuevaReglaA.moneda === "USD"
      ? Number(nuevaReglaA.saldoFinanciar) * (data.tcValor || 1)
      : Number(nuevaReglaA.saldoFinanciar);

    // Calcular el monto en la moneda de la Parte F
    let montoEnMonedaParteF = Number(nuevaReglaA.saldoFinanciar);
    const shouldConvertDiv = data.monedaA === "USD" && nuevaReglaA.moneda === "ARS";
    const shouldConvertMult = data.monedaA !== "USD" && nuevaReglaA.moneda === "USD";

    if (shouldConvertDiv) {
      montoEnMonedaParteF = montoEnMonedaParteF / (data.tcValor || 1);
    } else if (shouldConvertMult) {
      montoEnMonedaParteF = montoEnMonedaParteF * (data.tcValor || 1);
    }

    // Calcular el total de reglas existentes para la parte A y total
    const totalReglasExistentesBaseGlobal = (data.reglasFinanciacionA || [])
      .filter(regla => regla.activa)
      .reduce((sum, regla) => {
        if (regla.moneda === "USD") {
          return sum + (regla.saldoFinanciar * (data.tcValor || 1));
        }
        return sum + regla.saldoFinanciar;
      }, 0);

    const totalReglasExistentesB = (data.reglasFinanciacionB || [])
      .filter(regla => regla.activa)
      .reduce((sum, regla) => {
        // Normalizar a Base Global ARS
        // Si Moneda B es USD ->  es USD: * TC
        // Si Moneda B es ARS ->  es ARS: directo (si regla es USD, * TC)

        let montoReglaArs = regla.saldoFinanciar;

        // Si la regla está en USD, la pasamos a ARS
        if (regla.moneda === "USD") {
          montoReglaArs = regla.saldoFinanciar * (data.tcValor || 1);
        }

        return sum + montoReglaArs;
      }, 0);

    // Sumar el monto de la nueva regla al total existente
    const totalReglasAGlobal = totalReglasExistentesBaseGlobal + montoEnMonedaBaseGlobal;
    const totalReglas = totalReglasAGlobal + totalReglasExistentesB;

    // Calcular cobertura en Parte F (en la moneda de F)
    const totalReglasExistentesParteF = (data.reglasFinanciacionA || [])
      .filter(regla => regla.activa)
      .reduce((sum, regla) => {
        if (data.monedaA === "USD") {
          if (regla.moneda === "ARS") return sum + (regla.saldoFinanciar / (data.tcValor || 1));
          return sum + regla.saldoFinanciar;
        } else {
          if (regla.moneda === "USD") return sum + (regla.saldoFinanciar * (data.tcValor || 1));
          return sum + regla.saldoFinanciar;
        }
      }, 0);

    const totalReglasAParteF = totalReglasExistentesParteF + montoEnMonedaParteF;

    // Calcular los porcentajes como la cobertura de la deuda
    // Para el global, necesitamos  en moneda base ARS
    const totalFinanciarGlobalArs = convertirATotalesEnMonedaBase(
      data.totalFinanciarArs || 0,
      data.totalFinanciarUsd || 0,
      data.monedaB,
      data.tcValor || 1,
      data.monedaA
    );

    const porcentajeDeudaTotal = totalFinanciarGlobalArs > 0 ?
      (totalReglas / totalFinanciarGlobalArs) * 100 : 0;

    const porcentajeDeudaA = totalFinanciarArs > 0 ?
      (totalReglasAParteF / totalFinanciarArs) * 100 : 0;

    const nuevaRegla: ReglaFinanciacion = {
      id: uuidv4(),
      moneda: nuevaReglaA.moneda,
      saldoFinanciar: Number(nuevaReglaA.saldoFinanciar),
      numCuotas: Number(nuevaReglaA.numCuotas),
      periodicidad: nuevaReglaA.periodicidad,
      importeCuota: importeCuota,
      primerVencimiento,
      ultimoVencimiento,
      valorBien: nuevaReglaA.valorBien || "",
      cargo: nuevaReglaA.cargo || "",
      porcentajeDeudaTotal: Math.round(porcentajeDeudaTotal * 100) / 100,
      porcentajeDeudaParte: Math.round(porcentajeDeudaA * 100) / 100,
      activa: true
    };

    // Calcular el nuevo porcentaje pagado considerando la nueva regla
    const nuevasReglas = [...(data.reglasFinanciacionA || []), nuevaRegla];

    // Calcular el porcentaje pagado con las nuevas reglas
    const porcentajeCalculado = calcularPorcentajePagadoHelper(nuevasReglas, data.reglasFinanciacionB || [], data);

    // Actualizar el estado con las nuevas reglas y el porcentaje calculado
    updateData({
      reglasFinanciacionA: nuevasReglas,
      porcentajePagadoFechaPosesion: porcentajeCalculado
    });

    // Resetear el formulario
    setNuevaReglaA({
      moneda: data.monedaA || "ARS",
      primerVencimiento: fechaHoy
    });
    setMostrarFormA(false);

    // Log para depuración
  };

  // Helper para calcular el máximo permitido en el input de la nueva regla B
  const calcularMaximoPermitidoB = () => {
    const saldoRestante = calcularSaldoRestanteB();
    if (saldoRestante <= 0) return 0;

    const monedaDeuda = data.monedaB || "ARS";
    const monedaInput = nuevaReglaB.moneda || "ARS";
    const tc = data.tcValor || 1;

    if (monedaDeuda === monedaInput) return saldoRestante;

    // Deuda USD, Input ARS -> return saldo * tc
    // Deuda ARS, Input USD -> return saldo / tc
    if (monedaDeuda === "USD") {
      return saldoRestante * tc;
    } else {
      return saldoRestante / tc;
    }
  };

  // Agregar nueva regla B
  const agregarReglaB = () => {
    if (!nuevaReglaB.saldoFinanciar || !nuevaReglaB.numCuotas || !nuevaReglaB.moneda || !nuevaReglaB.primerVencimiento) return;

    // Usar la fecha seleccionada por el usuario o la fecha actual + 1 mes
    const primerVencimiento = nuevaReglaB.primerVencimiento;
    const { lastStr: ultimoVencimiento } = calculateRuleDates(
      primerVencimiento,
      nuevaReglaB.periodicidad || "Mensual",
      Number(nuevaReglaB.numCuotas)
    );

    const importeCuota = nuevaReglaB.periodicidad === "Pago Único"
      ? Number(nuevaReglaB.saldoFinanciar)
      : Number(nuevaReglaB.saldoFinanciar) / Number(nuevaReglaB.numCuotas);

    // Calcular el total de reglas existentes para la parte B y total

    const totalReglasExistentesB = (data.reglasFinanciacionB || [])
      .filter(regla => regla.activa)
      .reduce((sum, regla) => sum + regla.saldoFinanciar, 0);

    // Calcular el monto en la moneda correcta para los porcentajes
    let montoEnMonedaB = Number(nuevaReglaB.saldoFinanciar);

    // Si la moneda de B es ARS pero la regla está en USD, convertir a ARS
    if (data.monedaB === "ARS" && nuevaReglaB.moneda === "USD") {
      montoEnMonedaB = montoEnMonedaB * (data.tcValor || 1);
    }
    // Si la moneda de B es USD pero la regla está en ARS, convertir a USD
    else if (data.monedaB === "USD" && nuevaReglaB.moneda === "ARS") {
      montoEnMonedaB = montoEnMonedaB / (data.tcValor || 1);
    }

    // Sumar el monto de la nueva regla al total existente
    const totalReglasBParteB = totalReglasExistentesB + montoEnMonedaB;
    // Removed unused totalReglas variable

    // Calcular cobertura GLOBAL en Moneda Base (ARS)
    // 1. Total deuda global en ARS
    const totalFinanciarGlobalArs = convertirATotalesEnMonedaBase(
      data.totalFinanciarArs || 0,
      data.totalFinanciarUsd || 0,
      data.monedaB,
      data.tcValor || 1,
      data.monedaA
    );

    // 2. Sumar todas las reglas A (existentes) en ARS
    const totalReglasA_EnArs = (data.reglasFinanciacionA || []).filter(r => r.activa).reduce((sum, r) => {
      return sum + (r.moneda === "USD" ? r.saldoFinanciar * (data.tcValor || 1) : r.saldoFinanciar);
    }, 0);

    // 3. Sumar todas las reglas B (existentes + nueva) en ARS
    const totalReglasB_Existentes_EnArs = (data.reglasFinanciacionB || []).filter(r => r.activa).reduce((sum, r) => {
      return sum + (r.moneda === "USD" ? r.saldoFinanciar * (data.tcValor || 1) : r.saldoFinanciar);
    }, 0);

    // Nueva regla B en ARS
    const nuevaReglaB_EnArs = nuevaReglaB.moneda === "USD"
      ? Number(nuevaReglaB.saldoFinanciar) * (data.tcValor || 1)
      : Number(nuevaReglaB.saldoFinanciar);

    const totalReglasGlobal_EnArs = totalReglasA_EnArs + totalReglasB_Existentes_EnArs + nuevaReglaB_EnArs;

    // Calcular porcentajes
    const porcentajeDeudaTotal = totalFinanciarGlobalArs > 0 ?
      (totalReglasGlobal_EnArs / totalFinanciarGlobalArs) * 100 : 0;

    const porcentajeDeudaB = totalFinanciarUsd > 0 ?
      (totalReglasBParteB / totalFinanciarUsd) * 100 : 0;

    const nuevaRegla: ReglaFinanciacion = {
      id: uuidv4(),
      moneda: nuevaReglaB.moneda,
      saldoFinanciar: Number(nuevaReglaB.saldoFinanciar),
      numCuotas: Number(nuevaReglaB.numCuotas),
      periodicidad: nuevaReglaB.periodicidad,
      importeCuota: importeCuota,
      primerVencimiento,
      ultimoVencimiento,
      valorBien: nuevaReglaB.valorBien || "",
      cargo: nuevaReglaB.cargo || "",
      porcentajeDeudaTotal: Math.round(porcentajeDeudaTotal * 100) / 100,
      porcentajeDeudaParte: Math.round(porcentajeDeudaB * 100) / 100,
      activa: true
    };

    // Calcular el nuevo porcentaje pagado considerando la nueva regla
    const nuevasReglas = [...(data.reglasFinanciacionB || []), nuevaRegla];

    // Calcular el porcentaje pagado con las nuevas reglas
    const porcentajeCalculado = calcularPorcentajePagadoHelper(data.reglasFinanciacionA || [], nuevasReglas, data);

    // Actualizar el estado con las nuevas reglas y el porcentaje calculado
    updateData({
      reglasFinanciacionB: nuevasReglas,
      porcentajePagadoFechaPosesion: porcentajeCalculado
    });

    // Resetear el formulario
    setNuevaReglaB({
      moneda: data.monedaB,
      primerVencimiento: fechaHoy
    });
    setMostrarFormB(false);

    // Log para depuración
  };

  // Eliminar regla
  const eliminarReglaA = (id: string) => {
    // Filtrar la regla a eliminar
    const nuevasReglas = (data.reglasFinanciacionA || []).filter(regla => regla.id !== id);

    // Calcular el porcentaje pagado con las nuevas reglas
    const porcentajeCalculado = calcularPorcentajePagadoHelper(nuevasReglas, data.reglasFinanciacionB || [], data);

    // Actualizar el estado con las nuevas reglas y el porcentaje calculado
    updateData({
      reglasFinanciacionA: nuevasReglas,
      porcentajePagadoFechaPosesion: porcentajeCalculado
    });

    // Log para depuración
  };

  const eliminarReglaB = (id: string) => {
    // Filtrar la regla a eliminar
    const nuevasReglas = (data.reglasFinanciacionB || []).filter(regla => regla.id !== id);

    // Calcular el porcentaje pagado con las nuevas reglas
    const porcentajeCalculado = calcularPorcentajePagadoHelper(data.reglasFinanciacionA || [], nuevasReglas, data);

    // Actualizar el estado con las nuevas reglas y el porcentaje calculado
    updateData({
      reglasFinanciacionB: nuevasReglas,
      porcentajePagadoFechaPosesion: porcentajeCalculado
    });

    // Log para depuración
  };

  // Actualizar porcentaje pagado cuando cambian las reglas, la fecha de posesión o los anticipos
  useEffect(() => {
    // Si no hay fecha de posesión, no hacer cálculos detallados
    if (!data.fechaPosesion) {
      const porcentajeCalculado = calcularPorcentajePagadoHelper([], [], data);
      updateData({ porcentajePagadoFechaPosesion: porcentajeCalculado });
      return;
    }


    // Convertir la fecha de posesión a un objeto Date
    let fechaPosesion;
    try {
      // Asegurar que la fecha esté en formato DD/MM/YYYY si viene en formato ISO
      const fechaFormateada = formatFechaPosesion(data.fechaPosesion);

      // Parsear la fecha en formato DD/MM/YYYY
      const partes = fechaFormateada.split('/');
      if (partes.length === 3) {
        // Formato DD/MM/YYYY o DD/MM/YY
        const year = partes[2].length === 2 ? "20" + partes[2] : partes[2]; // Manejar años en formato YY
        fechaPosesion = new Date(Number.parseInt(year), Number.parseInt(partes[1]) - 1, Number.parseInt(partes[0]));
      } else {
        // Intentar parsear como fecha ISO
        fechaPosesion = new Date(data.fechaPosesion);
      }

      // Verificar si la fecha es válida
      if (Number.isNaN(fechaPosesion.getTime())) {
        return;
      }
    } catch (error) {
      console.error("Error parsing possession date:", error);
      return;
    }

    // Forzar la actualización del porcentaje pagado
    const porcentajeCalculado = calcularPorcentajePagadoHelper(data.reglasFinanciacionA || [], data.reglasFinanciacionB || [], data);

    // Actualizar el estado solo si el porcentaje ha cambiado
    if (porcentajeCalculado !== data.porcentajePagadoFechaPosesion) {
      updateData({ porcentajePagadoFechaPosesion: porcentajeCalculado });
    }
  }, [data.reglasFinanciacionA, data.reglasFinanciacionB, data.fechaPosesion, totalFinanciarArs, totalFinanciarUsd, data.anticipoArsA, data.anticipoArsB, data.anticipoUsdA, data.anticipoUsdB, data.tcValor, data.porcentajePagadoFechaPosesion]);

  // Obtener el porcentaje pagado a fecha posesión
  const porcentajePagado = data.porcentajePagadoFechaPosesion || calcularPorcentajePagadoHelper(data.reglasFinanciacionA || [], data.reglasFinanciacionB || [], data);

  // Verificar si hay saldos restantes
  const haySaldoRestanteA = calcularSaldoRestanteA() > 0;
  const haySaldoRestanteB = calcularSaldoRestanteB() > 0;
  const haySaldosPendientes = haySaldoRestanteA || haySaldoRestanteB;

  const isFormValid = activeTab === "F"
    ? !!(nuevaReglaA.saldoFinanciar && nuevaReglaA.numCuotas && nuevaReglaA.periodicidad && nuevaReglaA.moneda && nuevaReglaA.primerVencimiento)
    : !!(nuevaReglaB.saldoFinanciar && nuevaReglaB.numCuotas && nuevaReglaB.periodicidad && nuevaReglaB.moneda && nuevaReglaB.primerVencimiento);

  return (
    <div className="flex flex-col gap-8 pb-24">
      {/* 3 Top Cards - Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Saldo Restante F */}
        <div className="flex flex-col gap-1 rounded-xl p-5 bg-card border border-border shadow-sm">
          <div className="flex items-center gap-2 text-card-foreground">
            <Wallet className="w-5 h-5 text-primary" />
            <p className="text-xs font-bold uppercase tracking-wider">Saldo Restante F ({data.monedaA || "ARS"})</p>
          </div>
          <p className="text-2xl font-bold tracking-tight text-card-foreground mt-2">${formatCurrency(calcularSaldoRestanteA(), data.monedaA || "ARS")}</p>
        </div>

        {/* Card 2: Saldo Restante SB */}
        <div className="flex flex-col gap-1 rounded-xl p-5 bg-card border border-border shadow-sm">
          <div className="flex items-center gap-2 text-card-foreground">
            <Coins className="w-5 h-5 text-emerald-500" />
            <p className="text-xs font-bold uppercase tracking-wider">Saldo Restante SB ({data.monedaB})</p>
          </div>
          <p className="text-2xl font-bold tracking-tight text-card-foreground mt-2">${formatCurrency(calcularSaldoRestanteB(), data.monedaB)}</p>
        </div>

        {/* Card 3: Percentage Paid */}
        <div className="flex flex-col justify-between gap-3 rounded-xl p-5 bg-card border border-rose-900/50 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2 relative z-10">
            <p className="text-sm font-medium text-card-foreground">Pagado a posesión</p>
            {porcentajePagado < 50 && <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-900/40 text-rose-300">Crítico</span>}
          </div>
          <div className="flex items-end gap-2 mb-2 relative z-10">
            <p className="text-3xl font-bold text-card-foreground">{porcentajePagado}%</p>
            <p className="text-sm text-rose-400 mb-1.5 font-medium">Requerido: 50%</p>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden relative z-10">
            <div className={`h-full rounded-full ${porcentajePagado < 50 ? 'bg-rose-500' : 'bg-green-500'}`} style={{ width: `${Math.min(porcentajePagado, 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Main Split Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Left Column: Unified Form */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-card-foreground">Nueva regla de financiación</h3>
            </div>

            {/* Tabs to switch Context */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setActiveTab("F")}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${activeTab === "F"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
              >
                <Landmark className="w-5 h-5" />
                <span className="font-medium">Parte F ({data.monedaA || "ARS"})</span>
              </button>
              <button
                onClick={() => setActiveTab("SB")}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${activeTab === "SB"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
              >
                <ArrowRightLeft className="w-5 h-5" />
                <span className="font-medium">Parte SB ({data.monedaB})</span>
              </button>
            </div>

            {/* Unified Form Body */}
            <div className="space-y-4">
              {/* Row 1: Amount & Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-card-foreground">Saldo a Financiar</Label>
                  {activeTab === "F" ? (
                    <div className="flex gap-2 mt-1.5">
                      <CurrencyInput
                        value={nuevaReglaA.saldoFinanciar}
                        onChange={(v) => setNuevaReglaA({ ...nuevaReglaA, saldoFinanciar: v })}
                        max={calcularMaximoPermitidoA()}
                        className="bg-background border-input text-foreground flex-1 h-10"
                        prefix="$"
                      />
                      <Select value={nuevaReglaA.moneda || "ARS"} onValueChange={(v) => setNuevaReglaA({ ...nuevaReglaA, moneda: v as Moneda })}>
                        <SelectTrigger className="w-20 bg-background border-input text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                          <SelectItem value="ARS">ARS</SelectItem><SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-1.5">
                      <CurrencyInput
                        value={nuevaReglaB.saldoFinanciar}
                        onChange={(v) => setNuevaReglaB({ ...nuevaReglaB, saldoFinanciar: v })}
                        max={calcularMaximoPermitidoB()}
                        className="bg-background border-input text-foreground flex-1 h-10"
                        prefix="$"
                      />
                      <Select value={nuevaReglaB.moneda || data.monedaB} onValueChange={(v) => setNuevaReglaB({ ...nuevaReglaB, moneda: v as Moneda })}>
                        <SelectTrigger className="w-20 bg-background border-input text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                          <SelectItem value="ARS">ARS</SelectItem><SelectItem value="USD">USD</SelectItem>
                          {data.monedaB === "MIX" && <SelectItem value="MIX">MIX</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-card-foreground">Cuotas</Label>
                  <Input
                    type="number"
                    value={activeTab === "F" ? nuevaReglaA.numCuotas || "" : nuevaReglaB.numCuotas || ""}
                    onChange={(e) => activeTab === "F" ? setNuevaReglaA({ ...nuevaReglaA, numCuotas: Number(e.target.value) }) : setNuevaReglaB({ ...nuevaReglaB, numCuotas: Number(e.target.value) })}
                    className="mt-1.5 bg-background border-input text-foreground h-10"
                  />
                </div>
              </div>

              {/* Row 2: Periodicity & First Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-card-foreground">Periodicidad</Label>
                  <Select
                    value={activeTab === "F" ? (nuevaReglaA.periodicidad || "") : (nuevaReglaB.periodicidad || "")}
                    onValueChange={(v) => activeTab === "F" ? setNuevaReglaA({ ...nuevaReglaA, periodicidad: v as PeriodicidadCuota }) : setNuevaReglaB({ ...nuevaReglaB, periodicidad: v as PeriodicidadCuota })}
                  >
                    <SelectTrigger className="mt-1.5 w-full bg-background border-input text-foreground h-10"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="Mensual">Mensual</SelectItem>
                      <SelectItem value="Trimestral">Trimestral</SelectItem>
                      <SelectItem value="Semestral">Semestral</SelectItem>
                      <SelectItem value="Anual">Anual</SelectItem>
                      <SelectItem value="Pago Único">Pago Único</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-card-foreground">Primer Vencimiento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("mt-1.5 w-full justify-start text-left font-normal bg-background border-input text-foreground h-10", !(activeTab === "F" ? nuevaReglaA.primerVencimiento : nuevaReglaB.primerVencimiento) && "text-muted-foreground")}>
                        <CalendarIconLucide className="mr-2 h-4 w-4" />
                        {(activeTab === "F" ? nuevaReglaA.primerVencimiento : nuevaReglaB.primerVencimiento) || "Seleccionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover border-border text-popover-foreground">
                      <Calendar
                        mode="single"
                        selected={parseDate((activeTab === "F" ? nuevaReglaA.primerVencimiento : nuevaReglaB.primerVencimiento) || fechaHoy)}
                        onSelect={(date) => {
                          if (date) {
                            const f = format(date, "d/MM/yy");
                            activeTab === "F" ? setNuevaReglaA({ ...nuevaReglaA, primerVencimiento: f }) : setNuevaReglaB({ ...nuevaReglaB, primerVencimiento: f });
                          }
                        }}
                        initialFocus
                        className="bg-popover text-popover-foreground"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>



              <div className="flex justify-end pt-4">
                <Button
                  onClick={activeTab === "F" ? agregarReglaA : agregarReglaB}
                  disabled={!isFormValid}
                  className={`w-full ${activeTab === "F" ? "bg-primary hover:bg-blue-600" : "bg-emerald-600 hover:bg-emerald-700"} text-white font-medium py-2.5 h-auto disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <PlusCircle className="mr-2 h-5 w-5" /> Guardar Regla
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tables */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          {/* Table F */}
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
              <h3 className="text-base font-bold text-card-foreground flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" /> Reglas Parte F (ARS)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-tighter">ARS</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground text-[10px] uppercase tracking-wider font-semibold border-b border-border">
                    <th className="p-3">Concepto</th><th className="p-3 text-right">Monto</th><th className="p-3 text-center">Cuotas</th><th className="p-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {(data.reglasFinanciacionA || []).map((regla: ReglaFinanciacion) => (
                    <tr key={regla.id} className="group hover:bg-muted/50 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-card-foreground text-xs">{regla.periodicidad} - {regla.primerVencimiento}</div>
                        <div className="text-[10px] text-muted-foreground">{regla.moneda}</div>
                      </td>
                      <td className="p-3 text-right font-mono text-card-foreground text-xs">{formatCurrency(regla.saldoFinanciar, regla.moneda)}</td>
                      <td className="p-3 text-center text-xs text-card-foreground">{regla.numCuotas}</td>
                      <td className="p-3 text-center">
                        <button onClick={() => eliminarReglaA(regla.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table SB */}
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
              <h3 className="text-base font-bold text-card-foreground flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-500" /> Reglas Parte SB ({data.monedaB})
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400 uppercase tracking-tighter">USD</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground text-[10px] uppercase tracking-wider font-semibold border-b border-border">
                    <th className="p-3">Concepto</th><th className="p-3 text-right">Monto</th><th className="p-3 text-center">Cuotas</th><th className="p-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {(data.reglasFinanciacionB || []).map((regla: ReglaFinanciacion) => (
                    <tr key={regla.id} className="group hover:bg-muted/50 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-card-foreground text-xs">{regla.periodicidad} - {regla.primerVencimiento}</div>
                        <div className="text-[10px] text-muted-foreground">{regla.moneda}</div>
                      </td>
                      <td className="p-3 text-right font-mono text-card-foreground text-xs">{formatCurrency(regla.saldoFinanciar, regla.moneda)}</td>
                      <td className="p-3 text-center text-xs text-card-foreground">{regla.numCuotas}</td>
                      <td className="p-3 text-center">
                        <button onClick={() => eliminarReglaB(regla.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
